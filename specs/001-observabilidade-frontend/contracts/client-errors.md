# Contract — `POST /client-errors`

Endpoint **público** (sem auth) para receber relatórios de erro do navegador. Fire-and-forget do
lado do cliente; o servidor valida, loga e responde sem corpo.

## Request

- **Method/Path**: `POST /client-errors`
- **Auth**: nenhuma (na allowlist pública de `plugins/auth.ts`).
- **Rate limit**: `{ max: 30, timeWindow: "1 minute" }` por IP (config de rota, espelha o booking público).
- **Headers**: `Content-Type: application/json`.
- **Body** (Zod `ClientErrorSchema`): ver [data-model.md](../data-model.md).

```json
{
  "message": "Cannot read properties of undefined (reading 'map')",
  "stack": "TypeError: ...\n  at ClientsTableCard (...)",
  "componentStack": "\n  at ClientsTableCard\n  at ...",
  "url": "https://app.exemplo.com/acme/clientes",
  "userAgent": "Mozilla/5.0 ...",
  "appVersion": "a1b2c3d",
  "kind": "render"
}
```

## Responses

| Status | Quando | Corpo |
|---|---|---|
| **204 No Content** | payload válido | (vazio) |
| **400 Bad Request** | `message` ausente/vazia ou campo inválido | `{ "message": "Validation error: ..." }` |
| **429 Too Many Requests** | acima de 30/min no IP | `{ "message": "Rate limit exceeded, retry in 1 minute" }` |

> Observação: o **error handler global** preserva o 429 (correção já aplicada na sessão de
> prod-readiness) em vez de mascarar como 500.

## Efeitos colaterais

- Registra `req.log.error({ clientError: <body>, ip: req.ip }, "client error")` (pino, com `redact`
  de `authorization`/`cookie`).
- **Não** escreve no banco.

## Testes de contrato (TDD, sem DB — `app.inject`)

1. Body válido → **204**, sem corpo.
2. Body sem `message` → **400**.
3. 31ª requisição na janela (mesmo IP) → **429**.
