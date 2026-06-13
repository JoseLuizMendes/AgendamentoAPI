---
nicho: "api/src/services"
escopo: "Camada de regra de negócio (use cases) — sem HTTP"
---

# api/src/services/

> Complementa `../../CLAUDE.md` e o `CLAUDE.md` raiz.

## Escopo do Diretório

Regra de negócio do AgendamentoAPI: `appointments`, `services`, `availability`, `settings`,
`reports`, `appointment-conflict`, `appointment-status`. É o **coração** da camada Layered.

## Diretrizes Específicas

- **ZERO Fastify aqui.** Proibido importar `fastify`, `FastifyRequest`/`Reply` ou tocar em
  HTTP. A função recebe `PrismaClient` (ou `Prisma.TransactionClient`) + `tenantId`/`userId`/
  `role` + um DTO simples, e retorna entidade/DTO ou lança erro de domínio.
- **Erros de domínio:** lançar `NotFoundError`/`ConflictError`/`ValidationError` de
  `../utils/errors`. Nunca retornar `null` para "não encontrado" quando o contrato espera erro.
- **Tenant scoping:** todo `where` inclui `tenantId`. `getAppointment`/`getService` já validam
  posse — reusar, não reimplementar.
- **Concorrência:** mudança de horário/criação usa `prisma.$transaction(..., { isolationLevel:
  Serializable })` + `assertNoConflict(tx, tenantId, start, end, excludeId?)`. Falha de
  serialização (`P2034`) → traduzir para `ConflictError`.
- **Transições de status:** validar com `assertStatusTransition` (`appointment-status.ts`);
  não inventar transição nova sem o dev.
- **Pureza/SRP:** uma responsabilidade por service. Cálculo de tempo em `utils/time`; nada de
  formatação de resposta HTTP aqui.
- **Datas:** trabalhar com `Date`/`luxon`; respeitar o `timezone` da tenant (ver `reports.ts`).

## Stack Local

| Camada | Tecnologia | Restrição |
|---|---|---|
| Regra | TS puro + Prisma client | Sem Fastify/HTTP. |
| Tempo | luxon + `utils/time` | Fuso da tenant. |

## Testes

- **Tipo:** unitário (lógica pura: `slots`, `time`, `appointment-status`) + integração
  (services via endpoints).
- **Ferramenta:** Vitest.
- **Cobertura:** todo caminho de erro (conflito 409, not found, validação) tem teste.

## Dependências Permitidas

- `@prisma/client`, `luxon`, utils internos (`../utils/*`). Nada de HTTP/Fastify.

## Quality Gate

- [ ] Nenhum import de Fastify/HTTP
- [ ] `where` escopado por `tenantId`
- [ ] Erros de domínio via `utils/errors`
- [ ] Conflito/concorrência via `assertNoConflict` + transação Serializable
- [ ] Teste do caminho feliz **e** dos de erro, verdes

## Referências

- `../../CLAUDE.md` (api) · `../routes/CLAUDE.md` · raiz
