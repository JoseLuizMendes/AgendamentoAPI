import Fastify, { type FastifyInstance, type RouteOptions } from "fastify";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import { config } from "./config.js";
import prismaPlugin from "./plugins/prisma.js";
import swaggerPlugin from "./plugins/docs/swagger.js";
import authPlugin from "./plugins/auth.js";
import { AppError } from "./utils/errors.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { usersRoutes } from "./routes/users.js";
import { servicesRoutes } from "./routes/services.js";
import { hoursRoutes } from "./routes/hours.js";
import { overridesRoutes } from "./routes/overrides.js";
import { appointmentsRoutes } from "./routes/appointments.js";
import { settingsRoutes } from "./routes/settings.js";
import { reportsRoutes } from "./routes/reports.js";
import { uploadsRoutes } from "./routes/uploads.js";
import { publicRoutes } from "./routes/public.js";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";

/**
 * Converte um padrão de rota do Fastify (`/public/:slug/services`, `/docs/*`) em RegExp
 * que casa caminhos concretos — usado para detectar "caminho existe, método não bate" (405).
 */
function patternToRegex(urlPattern: string): RegExp {
  const source = urlPattern
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":")) return "[^/]+"; // parâmetro
      if (seg === "*") return ".*"; // wildcard
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // segmento estático (escapado)
    })
    .join("/");
  return new RegExp(`^${source}/?$`); // tolera barra final opcional
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    // Limite de corpo explícito (anti-payload gigante). Folgado p/ os JSONs da API (o maior é
    // ~25 KB no /client-errors); rotas que precisem de mais podem sobrescrever via config de rota.
    bodyLimit: 512 * 1024, // 512 KB
    logger: {
      // Defense-in-depth: nunca vazar credenciais nos logs, mesmo que algum log inclua headers.
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Registro de rotas (padrão→método) para responder 405 em vez do 404 do Fastify quando o
  // caminho existe mas o método não bate. `onRoute` captura toda rota registrada depois daqui,
  // inclusive as de plugins (swagger, etc.).
  const routeRegistry: { regex: RegExp; method: string }[] = [];
  app.addHook("onRoute", (route: RouteOptions) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    const regex = patternToRegex(route.url);
    for (const m of methods) {
      // OPTIONS é o preflight do CORS (registrado como curinga `*`, casa tudo) — não conta
      // como "endpoint real" para fins de 405, senão todo caminho inexistente viraria 405.
      if (m.toUpperCase() === "OPTIONS") continue;
      routeRegistry.push({ regex, method: m.toUpperCase() });
    }
  });

  app.setErrorHandler((err, req, reply) => {
    // DB não configurado (comum em deploy/ambiente sem env vars)
    if (err instanceof Error && err.message.includes("DATABASE_URL não está definido")) {
      return reply.status(500).send({
        message:
          "Banco de dados não configurado (DATABASE_URL ausente). Configure DATABASE_URL e execute as migrations (prisma migrate deploy).",
      });
    }

    // Handle custom app errors
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ message: err.message });
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const errors = err.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return reply.status(400).send({ message: `Validation error: ${errors}` });
    }

    // Erros de validação (AJV/Fastify)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any;
    if (anyErr?.validation) {
      const detail = Array.isArray(anyErr.validation)
        ? anyErr.validation.map((v: { instancePath?: string; message?: string }) => {
            const path = v.instancePath ? v.instancePath.replace(/^\//, "") : "body";
            return `${path}: ${v.message ?? "inválido"}`;
          })
        : [];
      const message = detail.length > 0 ? `Requisição inválida: ${detail.join(", ")}` : "Requisição inválida";
      return reply.status(400).send({ message });
    }

    // Erros do Prisma
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return reply.status(409).send({ message: "Conflito: registro já existe" });
      }
      if (err.code === "P2025") {
        return reply.status(404).send({ message: "Registro não encontrado" });
      }
      // Tabelas/colunas inexistentes (schema não aplicado)
      if (err.code === "P2021" || err.code === "P2022") {
        return reply
          .status(500)
          .send({ message: "Banco de dados não está pronto (migrations pendentes ou schema divergente)." });
      }
      req.log.error({ err }, "Prisma error");
      return reply.status(500).send({ message: "Internal Server Error" });
    }

    // Erros HTTP que já carregam status próprio (ex.: rate limit 429, erros nativos do Fastify).
    // Sem isso, o handler abaixo os mascararia como 500 — quebrando o rate limit reforçado.
    const status = typeof anyErr?.statusCode === "number" ? anyErr.statusCode : undefined;
    if (status && status >= 400 && status < 500) {
      return reply.status(status).send({ message: anyErr.message ?? "Requisição inválida" });
    }

    req.log.error({ err }, "Unhandled error");
    return reply.status(500).send({ message: "Internal Server Error" });
  });

  // 405 Method Not Allowed: se o caminho existe sob outro(s) método(s), devolve 405 + `Allow`.
  // Caso contrário, mantém o 404 (mesma shape do Fastify). Rotas protegidas com método errado
  // podem ser barradas antes pelo hook de auth (401) — esperado.
  app.setNotFoundHandler((req, reply) => {
    const path = (req.url.split("?")[0] || "/");
    const allowed = new Set<string>();
    for (const r of routeRegistry) {
      if (r.regex.test(path)) allowed.add(r.method);
    }

    if (allowed.size > 0 && !allowed.has(req.method.toUpperCase())) {
      const allow = [...allowed].sort().join(", ");
      return reply
        .status(405)
        .header("Allow", allow)
        .send({ message: `Method ${req.method} not allowed for ${path}`, error: "Method Not Allowed", statusCode: 405 });
    }

    return reply
      .status(404)
      .send({ message: `Route ${req.method}:${path} not found`, error: "Not Found", statusCode: 404 });
  });

  // CSP: estrita em produção (API serve só JSON — o Swagger UI não roda em prod). Fora de produção,
  // libera o necessário para o Swagger UI (CDNs + inline). Endurecimento da auditoria (US5).
  const cspDirectives = config.isProduction
    ? {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      }
    : {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
      };

  await app.register(helmet, {
    contentSecurityPolicy: { directives: cspDirectives },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = config.corsOrigin
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Sem header Origin (curl, health checks, server-to-server, apps nativos) → permitido.
      // Não é vetor de CSRF: requisições de navegador cross-site sempre enviam Origin, e a
      // proteção de sessão é o cookie SameSite. Decisão registrada (auditoria US5).
      if (!origin) {
        cb(null, true);
        return;
      }

      cb(null, allowed.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
    allowList: (req) => {
      const url = req.url ?? "/";
      return (
        url === "/" ||
        url.startsWith("/docs") || // Swagger UI + assets (/docs, /docs/json, /docs/static/...)
        url.startsWith("/health/")
      );
    },
  });

  // Documentação interativa (Swagger UI em /docs) só FORA de produção — não expõe a superfície
  // completa da API em prod. Em produção, mantém apenas um GET / mínimo para discovery/probe.
  if (!config.isProduction) {
    await app.register(swaggerPlugin);
  } else {
    app.get("/", { schema: { hide: true } }, (_req, reply) =>
      reply.send({ name: "Agendamento API", status: "ok" })
    );
  }

  await app.register(prismaPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(servicesRoutes);
  await app.register(hoursRoutes);
  await app.register(overridesRoutes);
  await app.register(appointmentsRoutes);
  await app.register(settingsRoutes);
  await app.register(reportsRoutes);
  await app.register(uploadsRoutes);
  await app.register(publicRoutes);

  return app;
}
