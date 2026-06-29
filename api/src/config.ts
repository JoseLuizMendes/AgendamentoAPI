import { z } from "zod";

/**
 * Configuração validada do ambiente (fonte única de verdade).
 *
 * Em vez de ler `process.env` espalhado pelo código, o app importa `config`.
 * `loadConfig` é exportada para permitir testes com ambientes simulados.
 */

const DEV_JWT_FALLBACK = "development-secret-change-in-production";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1).optional(),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRES_IN: z.string().min(1).default("2d"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().min(1).default("0.0.0.0"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3001"),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    RATE_LIMIT_WINDOW: z.string().min(1).default("1 minute"),
    // Lockout de conta (anti-brute-force): nº de falhas até bloquear e duração do bloqueio (min).
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
    // Cookie de auth: "lax" p/ mesma-site (subdomínios/reverse proxy); "none" p/ cross-site
    // (força secure). Ajustável por deploy sem mexer no código.
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
    // Domínio do cookie de sessão. Em produção com subdomínios (app./api.), usar ".dominio.com"
    // para o cookie ser compartilhado entre o Web e a API (e legível pelo gate do Web). Sem valor
    // = cookie host-only (default — bom para dev em localhost).
    COOKIE_DOMAIN: z.string().min(1).optional(),
    PUBLIC_HEALTH: z
      .string()
      .optional()
      .transform((v) => v !== "false"), // default true; só "false" desliga
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    CLOUDINARY_UPLOAD_FOLDER: z.string().min(1).optional(),
    CLOUDINARY_ALLOWED_FORMATS: z.string().min(1).default("jpg,png,webp"),
    // Email transacional (Resend). Sem chave → modo dev: o link é logado em vez de enviado.
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM: z.string().min(1).optional(),
    // Base do app web — monta os links de verificação/reset enviados por email.
    APP_BASE_URL: z.string().url().default("http://localhost:3001"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "JWT_SECRET é obrigatório e deve ter no mínimo 32 caracteres em produção",
        });
      }
    }
  });

export type Config = {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  databaseUrl: string | undefined;
  jwtSecret: string;
  jwtExpiresIn: string;
  port: number;
  host: string;
  corsOrigin: string;
  rateLimitMax: number;
  rateLimitWindow: string;
  loginMaxAttempts: number;
  loginLockMinutes: number;
  cookieSameSite: "lax" | "strict" | "none";
  cookieSecure: boolean;
  cookieDomain: string | undefined;
  publicHealth: boolean;
  appBaseUrl: string;
  resend: { apiKey: string; from: string } | null;
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadFolder?: string;
    allowedFormats: string;
  } | null;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
      .join("; ");
    throw new Error(`Configuração de ambiente inválida: ${details}`);
  }

  const e = parsed.data;

  const resend =
    e.RESEND_API_KEY && e.RESEND_FROM ? { apiKey: e.RESEND_API_KEY, from: e.RESEND_FROM } : null;

  const cloudinary =
    e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET
      ? {
          cloudName: e.CLOUDINARY_CLOUD_NAME,
          apiKey: e.CLOUDINARY_API_KEY,
          apiSecret: e.CLOUDINARY_API_SECRET,
          allowedFormats: e.CLOUDINARY_ALLOWED_FORMATS,
          ...(e.CLOUDINARY_UPLOAD_FOLDER ? { uploadFolder: e.CLOUDINARY_UPLOAD_FOLDER } : {}),
        }
      : null;

  return {
    nodeEnv: e.NODE_ENV,
    isProduction: e.NODE_ENV === "production",
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET ?? DEV_JWT_FALLBACK,
    jwtExpiresIn: e.JWT_EXPIRES_IN,
    port: e.PORT,
    host: e.HOST,
    corsOrigin: e.CORS_ORIGIN,
    rateLimitMax: e.RATE_LIMIT_MAX,
    rateLimitWindow: e.RATE_LIMIT_WINDOW,
    loginMaxAttempts: e.LOGIN_MAX_ATTEMPTS,
    loginLockMinutes: e.LOGIN_LOCK_MINUTES,
    cookieSameSite: e.COOKIE_SAMESITE,
    // SameSite=None exige Secure (regra do browser); em prod sempre Secure.
    cookieSecure: e.NODE_ENV === "production" || e.COOKIE_SAMESITE === "none",
    cookieDomain: e.COOKIE_DOMAIN,
    publicHealth: e.PUBLIC_HEALTH,
    appBaseUrl: e.APP_BASE_URL,
    resend,
    cloudinary,
  };
}

/** Config carregada uma vez a partir do ambiente do processo. */
export const config = loadConfig();
