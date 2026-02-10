import type { IncomingMessage, ServerResponse } from "node:http";

function getPath(url: string | undefined): string {
  const raw = url ?? "/";
  const noQuery = raw.split("?")[0] ?? "/";
  return noQuery;
}

function stripApiPrefix(path: string): string {
  if (path === "/api") return "/";
  if (path.startsWith("/api/")) return path.slice(4) || "/";
  return path;
}

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Scheduler-Fastify-Pro",
    version: "1.0.0",
    description: "API de agendamento (documentação)",
  },
  paths: {
    "/health/live": { get: { tags: ["health"], responses: { "200": { description: "OK" } } } },
    "/health/ready": { get: { tags: ["health"], responses: { "200": { description: "OK" }, "503": { description: "DB indisponível" } } } },
    "/services": {
      get: { tags: ["services"], responses: { "200": { description: "Lista serviços" } } },
      post: { tags: ["services"], responses: { "201": { description: "Cria serviço" } } },
    },
    "/services/{id}": {
      get: { tags: ["services"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Serviço" }, "404": { description: "Não encontrado" } } },
      put: { tags: ["services"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Atualiza serviço" } } },
      delete: { tags: ["services"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "204": { description: "Remove serviço" } } },
    },
    "/business-hours": {
      get: { tags: ["business"], responses: { "200": { description: "Lista horários" } } },
      put: { tags: ["business"], responses: { "200": { description: "Atualiza horários" } } },
    },
    "/business-hours/{dayOfWeek}/breaks": {
      put: {
        tags: ["business"],
        parameters: [{ name: "dayOfWeek", in: "path", required: true, schema: { type: "integer", minimum: 0, maximum: 6 } }],
        responses: { "200": { description: "Atualiza pausas" }, "404": { description: "Não configurado" } },
      },
    },
    "/business-days": { get: { tags: ["business"], responses: { "200": { description: "Lista overrides" } } } },
    "/business-days/{date}": {
      put: {
        tags: ["business"],
        parameters: [{ name: "date", in: "path", required: true, schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } }],
        responses: { "200": { description: "Upsert override" }, "400": { description: "Requisição inválida" } },
      },
      delete: {
        tags: ["business"],
        parameters: [{ name: "date", in: "path", required: true, schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } }],
        responses: { "204": { description: "Remove override" }, "404": { description: "Não encontrado" } },
      },
    },
    "/slots": { get: { tags: ["appointments"], responses: { "200": { description: "Slots disponíveis" } } } },
    "/appointments": { post: { tags: ["appointments"], responses: { "201": { description: "Cria agendamento" } } } },
    "/appointments/{id}/cancel": {
      patch: {
        tags: ["appointments"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Cancela" }, "404": { description: "Não encontrado" }, "409": { description: "Conflito" } },
      },
    },
  },
} as const;

function docsHtml(specUrl: string): string {
  return `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const path = stripApiPrefix(getPath(req.url));

  if (path === "/") {
    res.statusCode = 302;
    res.setHeader("location", "/docs");
    return res.end();
  }

  if (path === "/openapi.json") {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    return res.end(JSON.stringify(openapi));
  }

  if (path === "/docs" || path.startsWith("/docs/")) {
    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    return res.end(docsHtml("/openapi.json"));
  }

  res.statusCode = 404;
  res.setHeader("content-type", "application/json; charset=utf-8");
  return res.end(JSON.stringify({ message: "Not Found" }));
}
