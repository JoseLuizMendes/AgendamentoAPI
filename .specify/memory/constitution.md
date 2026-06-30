# AgendamentoAPI Constitution

> Princípios inegociáveis do projeto. Derivada das regras constitucionais (C1–C8) e da
> metodologia do `CLAUDE.md` raiz. Esta constituição é a **fonte única de princípios**;
> os `CLAUDE.md` por pasta são contexto operacional local e devem obedecê-la.

## Core Principles

### I. Anti-Alucinação (NÃO-NEGOCIÁVEL)
Precede qualquer outra instrução. (C1) **Ler o arquivo real** com `Read` antes de editar —
conhecimento de memória é insuficiente. (C3) Sem fonte explícita (código lido, fala do dev,
doc) **não inventar**: vira `[PENDENTE — perguntar ao dev: <pergunta>]`. (C7) Consultar a doc
atual via **Context7** antes de usar/atualizar qualquer biblioteca. (C8) Gatilho ambíguo ou
fora de padrão conhecido → **parar e perguntar**, nunca improvisar fluxo novo.

### II. Test-First / TDD (NÃO-NEGOCIÁVEL)
(C5) Nenhuma feature/bugfix é marcada `completed` sem teste passando, com evidência. Ciclo
estrito **RED → GREEN → REFACTOR**: escrever o teste que valida o critério de aceite (RED),
mínimo de código para passar (GREEN), refatorar com verde. (C2) Quality gate é **verificação,
não declaração**: só afirmar "passa"/"feito"/"corrigido" **depois** de rodar o comando
(`tsc`/`lint`/`test`/app) e ver a saída.

### III. Stack Congelada (C6)
A stack é mantida por decisão do dev (ver §Stack Congelada). Antes de propor QUALQUER lib,
padrão, ferramenta, dependência ou comando, validar contra a stack. Se violar: **não** sugerir
como aceitável — parar, citar a regra, e perguntar se o dev quer abrir exceção justificada
(registrada aqui) ou alternativa no canon. Vale inclusive em conversa casual.

### IV. Arquitetura em Camadas (Layered)
Regra de dependência inegociável: `web (cliente HTTP) → api → routes (HTTP) → services (regra)
→ prisma (dados)`. `services/` **não** importam Fastify nem `req`/`reply` (recebem
`PrismaClient` + ids/DTOs). `routes/` **não** carregam regra de negócio (só schema Zod + auth +
mapear body→service). SOLID + Clean Code: uma responsabilidade por módulo; funções alvo < 20
linhas; sem magic numbers/strings; DRY (rule of three); imutabilidade é padrão.

### V. Segurança & Multi-tenancy
Todo acesso a dado é escopado por `tenantId` (vem de `requireAuth(req)`) — nunca consultar/
alterar sem o filtro de tenant; `tenantId` **nunca** vem do cliente. Erros de domínio via
`utils/errors`; secrets só em env validada (`config.ts`/zod), nunca `process.env` solto nem
hex/segredo hardcoded. Cores no front só via tokens (sem hex). Regras de segurança modernas
valem para todos os ambientes (cookie httpOnly, rate limit, expiração de token).

### VI. Fonte Única da Verdade (C4)
As regras vivem nesta constituição + no `CLAUDE.md` raiz + no `Preferencias Dev`. Em conflito
entre arquivos, **pare e reporte ao dev** — não tente conciliar sozinho. Specs de feature vivem
em `specs/` (isolados do código); `CLAUDE.md` por pasta é contexto local que aponta para aqui.

## Stack Congelada

| Camada | Tecnologia | Regra principal |
|---|---|---|
| Linguagem | TypeScript 5.x | `strict: true`. `any` proibido sem exceção aprovada. |
| Backend (HTTP) | Fastify 5 + `fastify-type-provider-zod` | Express banido. Rotas finas. |
| ORM / DB | Prisma 7 + PostgreSQL (Neon) | Schema declarativo. Campo novo = migration. |
| Frontend | Next.js 16 (App Router) + React 19 | Componentes funcionais + hooks. |
| Validação | Zod | Validação nas bordas (rotas, forms). |
| Data fetching | @tanstack/react-query | `useEffect` para fetch é proibido. |
| Styling | Tailwind v4 + shadcn/ui | Só tokens (`globals.css`). Hex hardcoded proibido. |
| UI feedback | sonner (toasts) + lucide (ícones) | — |
| Agenda / gráficos | FullCalendar 6 + Recharts | `currentColor` + tokens. |
| Testes | Vitest (unit/integração) + Playwright (E2E/visual) | TDD. Nada `done` sem verde. |
| Package manager | pnpm | npm/yarn/bun banidos. |

Exceções aprovadas vivem aqui e no `CLAUDE.md` raiz (ex.: backend Fastify puro em vez de NestJS;
Vitest ligado no `web` para lógica pura de UI; **Apache ECharts** no gráfico "Movimento financeiro"
do dashboard — zoom wheel/pinça nativo via `dataZoom: inside`, 2026-06-28; Recharts segue padrão no
restante; **Sentry** — `@sentry/node` (OTel-based, portável) + `@sentry/nextjs` — para observabilidade
de produção (erros + tracing SaaS), 2026-06-29, spec 005; **`@fullcalendar/list`** — vista de lista
(estilo "Agenda" do Google/Samsung) como padrão da agenda no mobile, com alternância para a grade
"Dia", 2026-06-30; faz parte do ecossistema FullCalendar 6 já no canon).

## Quality Gates & Workflow

**Metodologia:** Spec-first (sem comportamento esperado claro → perguntar) → Test-first (TDD) →
incrementalismo (uma tarefa por vez, verde antes da próxima) → zero débito intencional.

**Comandos de verificação:**
- Backend: `pnpm -C api exec tsc -p tsconfig.json --noEmit` · `pnpm -C api test` (unit) ·
  `pnpm -C api test:integration` (exige `DATABASE_URL` com `?schema=test`).
- Frontend: `pnpm -C web exec tsc --noEmit` · `pnpm -C web lint` (≤ baseline) · `pnpm -C web test`.

**Gate por mudança:** [ ] dado escopado por `tenantId` · [ ] regra no service, não na rota ·
[ ] erros via `utils/errors` + response schema · [ ] campo novo ⇒ migration · [ ] cor via token
(zero hex) · [ ] fetch via React Query (sem `useEffect`-fetch) · [ ] `tsc`/`lint`/`test` verdes
com evidência.

## Governance

Esta constituição complementa o `CLAUDE.md` raiz e **não** o substitui; em conflito direto de
regra, vence o que for mais restritivo de segurança e, na dúvida, **pare e pergunte ao dev**
(C4/C8). Emendas exigem: registro aqui (com data e justificativa), aprovação do dev, e ajuste
dos artefatos derivados (`CLAUDE.md`, templates). Toda revisão/PR verifica conformidade com
estes princípios; complexidade adicional precisa ser justificada (YAGNI por padrão).

**Version**: 1.0.0 | **Ratified**: 2026-06-27 | **Last Amended**: 2026-06-27
