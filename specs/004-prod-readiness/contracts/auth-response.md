# Contract Change — Respostas de Autenticação

Única mudança de contrato de API desta feature. As demais mudanças são de infra/headers/config, sem
alterar shape de endpoint.

## `POST /auth/login`

### Antes
```json
{
  "user": { "id": 1, "email": "a@b.com", "name": "Ana", "role": "OWNER" },
  "token": "<jwt>"
}
```

### Depois
```json
{
  "user": { "id": 1, "email": "a@b.com", "name": "Ana", "role": "OWNER" }
}
```
- O campo **`token` é removido** do corpo. A sessão continua sendo entregue via cookie `token`
  (httpOnly, `secure` em prod, `sameSite` configurável, `maxAge` = 2 dias).
- Status: `200`.

## `POST /auth/signup`

### Antes
```json
{
  "user": { "...": "..." },
  "tenant": { "id": 1, "name": "Salão", "slug": "salao" },
  "token": "<jwt>"
}
```

### Depois
```json
{
  "user": { "...": "..." },
  "tenant": { "id": 1, "name": "Salão", "slug": "salao" }
}
```
- O campo **`token` é removido** do corpo. Cookie httpOnly definido como antes. Status: `201`.

## Impacto / compatibilidade
- **Web**: nenhum — o cliente já usa só o cookie (`lib/auth.ts`/`apiRequest` com `credentials:"include"`);
  confirmado na auditoria que o campo `token` não é lido.
- **Swagger/consumidores externos**: a doc some em produção; o schema de resposta (Zod) é atualizado para
  refletir a remoção do `token`.
- **Testes**: o teste de contrato de `/login` e `/signup` deve asseverar a **ausência** de `token` no
  corpo e a **presença** do cookie `Set-Cookie: token=...; HttpOnly` (TDD: escrever este teste primeiro —
  RED — antes de remover o campo).

## Endpoints sem mudança de contrato (reafirmado)
`/auth/logout`, `/auth/me`, `/auth/verify-email*`, `/auth/forgot-password`, `/auth/reset-password`,
e todas as rotas de domínio (`/services`, `/appointments`, `/hours`, `/settings`, `/reports/*`,
`/public/*`) permanecem com o mesmo shape.
