# Data Model — 004 Prod-Readiness & Hardening

**Resumo**: esta feature **não altera o schema do banco**. Não há entidade nova nem migration. O que muda
são propriedades operacionais e de contrato em entidades já existentes. Documentado aqui para rastreio.

## Entidades afetadas (sem mudança estrutural)

### Sessão de usuário (cookie httpOnly + JWT)
- **Natureza**: não é tabela; é o cookie `token` (JWT assinado pela API).
- **Mudança nesta fase**:
  - Validade reduzida para **2 dias** (`JWT_EXPIRES_IN="2d"`; `maxAge` do cookie casado).
  - **Não** é mais exposta no corpo das respostas de `/auth/login` e `/auth/signup` (só no cookie).
- **Sem schema**: nenhuma coluna nova.

### AuthToken (verificação de email / reset de senha) — `prisma/schema.prisma`
- **Campos existentes relevantes**: `tokenHash`, `type`, `expiresAt`, `usedAt`, `createdAt`.
- **Mudança nesta fase**: **operacional** — rotina de limpeza (`DELETE WHERE expiresAt < now()` ou
  `usedAt IS NOT NULL`). **Sem** alteração de colunas.

### IdempotencyKey (booking) — `prisma/schema.prisma`
- **Campos existentes relevantes**: `key`, `tenantId`, `appointmentId`, `createdAt`.
- **Mudança nesta fase**: **operacional** — limpeza por idade (`DELETE WHERE createdAt < now() - intervalo`).
  **Sem** alteração de colunas.

## Configuração de ambiente (não-DB) tocada
- `JWT_EXPIRES_IN` (default `"2d"`).
- `CORS_ORIGIN` (inclui o domínio do Web em produção).
- Novas chaves de deploy (env da VPS, não do código-fonte): `WEB_DOMAIN`, `API_DOMAIN`,
  `NEXT_PUBLIC_API_URL`. Refletidas em `api/.env.example` / `web/.env.example`.

## Confirmação de invariantes (inalterados)
- Multi-tenancy por `tenantId` — intocado.
- Optimistic lock (`Appointment.version`) — intocado.
- Tokens guardados como hash — intocado.

> Conclusão: **nenhuma migration** é criada nesta feature (Quality Gate "campo novo ⇒ migration" não se
> aplica — não há campo novo).
