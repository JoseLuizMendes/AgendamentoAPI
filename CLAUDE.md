# AgendamentoAPI — CLAUDE.md (raiz)

> Diretrizes globais do repositório. Derivado do **Preferencias Dev** do vault do dev
> (`Dev/0 - Planner Project/Preferencias Dev.md`) e das regras constitucionais R1–R7
> (`Dev/CLAUDE.md`), adaptadas para um repositório de código.
>
> **Boot obrigatório:** antes de qualquer trabalho substantivo, leia (1) este arquivo e
> (2) o `CLAUDE.md` da subpasta em que você vai mexer (`api/`, `api/src/services/`,
> `api/src/routes/`, `web/`, `web/src/components/tenant/`). Sem isso, **não** comece.
>
> **Spec Kit (fonte de princípios + specs):** os **princípios** consolidados vivem em
> `.specify/memory/constitution.md` (derivados destas regras); os **designs de feature** vivem
> isolados em `specs/NNN-*/`. Este `CLAUDE.md` e os por-pasta seguem como **contexto operacional
> local** e devem obedecer a constitution. Em conflito, vale a regra mais restritiva → C4 (pare e
> reporte). Fluxo de feature: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
> `/speckit-implement` (skills em `.claude/skills/speckit-*`).

---

## ⚠️ Regras Constitucionais (Anti-Alucinação) — Inegociáveis

> Precedem qualquer outra instrução. Em conflito com qualquer regra abaixo desta seção,
> vencem estas.

- **C1 — Ler o arquivo real antes de editar.** Use `Read` no arquivo de verdade nesta
  sessão antes de alterá-lo. Conhecimento de memória é insuficiente — o arquivo pode ter
  mudado. Nunca edite às cegas.
- **C2 — Quality gate é verificação, não declaração.** Só afirme "passa", "feito",
  "corrigido" ou marque uma tarefa `completed` **depois** de rodar o comando
  (`tsc`/`lint`/`test`/app) e ver a saída. Sem execução → diga o que falta.
- **C3 — Sem fonte explícita, não inventar.** Decisão/valor/regra sem fonte (código lido,
  fala do dev, doc) vira `[PENDENTE — perguntar ao dev: <pergunta específica>]`. Inventar é
  proibido mesmo que "pareça óbvio".
- **C4 — Fonte da verdade das regras.** São este `CLAUDE.md` + o `Preferencias Dev`. Em
  conflito entre arquivos, **pare e reporte ao dev** — não tente conciliar sozinho.
- **C5 — TDD inegociável.** Nenhuma feature/bugfix marca `completed` sem teste passando,
  com evidência. Teste primeiro (RED → GREEN → REFACTOR).
- **C6 — Validar toda sugestão contra o canon.** Antes de propor QUALQUER lib, padrão,
  ferramenta, dependência, estrutura ou comando, valide contra a **Stack Congelada** + as
  regras deste arquivo. Se violar: **não** sugira como aceitável; **pare**, cite a regra
  exata, e pergunte se o dev quer abrir exceção justificada (registrada aqui) ou alternativa
  no canon. Vale inclusive em conversa casual.
- **C7 — Context7 antes de bibliotecas.** Consulte a doc atual via Context7 (MCP) antes de
  usar/atualizar qualquer biblioteca da stack. Nunca adivinhe API.
- **C8 — Gatilho ambíguo = parar e perguntar.** Pedido fora do escopo conhecido, sem padrão
  claro no código, → pare e pergunte. Não improvise um fluxo novo pra "encaixar".

---

## Stack Congelada

> A stack está **feita** e é mantida por decisão do dev. Não trocar de framework/runtime.
> Adicionar lib nova exige C6 + C7.

| Camada | Tecnologia | Regra principal |
|---|---|---|
| Linguagem | TypeScript 5.x | `strict: true`. **`any` proibido** sem exceção aprovada. |
| Backend (HTTP) | **Fastify 5** + `fastify-type-provider-zod` | **Express banido.** Rotas finas; regra nos services. |
| ORM / DB | Prisma 7 + PostgreSQL (Neon) | Schema declarativo. Campo novo = **migration**. |
| Frontend | Next.js 16 (App Router) + React 19 | Componentes funcionais + hooks. |
| Validação | Zod | Validação nas **bordas** (rotas, forms). |
| Data fetching | **@tanstack/react-query** | **`useEffect` para fetch é proibido.** |
| Styling | Tailwind v4 + shadcn/ui | **Só tokens** (`globals.css`). **Hex hardcoded proibido.** |
| UI feedback | sonner (toasts) + lucide (ícones) | — |
| Agenda / gráficos | FullCalendar 6 + Recharts | — |
| Testes | Vitest (unit/integração) + Playwright (E2E/visual) | **TDD.** Nada `done` sem verde. |
| Package manager | **pnpm** | npm/yarn/bun banidos. |

> Nota: o `Preferencias Dev` lista NestJS como backend principal. **Este projeto usa Fastify
> puro** por decisão do dev — Fastify é o adaptador HTTP (a regra "Express banido" é
> respeitada). Registrado como exceção consciente de stack.

---

## Metodologia — Akita + SDD + TDD

1. **Spec-first:** nenhuma implementação sem o comportamento esperado claro (critério de
   aceite). Sem spec → pergunte (C3/C8).
2. **Test-first (TDD):**
   1. Ler o critério de aceite.
   2. Escrever o teste que o valida → **RED**.
   3. Mínimo de código para passar → **GREEN**.
   4. Refatorar com teste verde → **REFACTOR**.
3. **Incrementalismo:** uma tarefa por vez, completamente finalizada (teste verde) antes da
   próxima.
4. **Zero débito intencional:** código de produção desde o dia 1.
5. **Rastreabilidade:** commit descreve a mudança; mensagens no padrão do repo
   (`feat:`/`fix:` + corpo).

---

## Arquitetura — Layered (decisão registrada)

Matriz dos 6 sinais (`Preferencias Dev` §Filosofia §3):

| Sinal | Este projeto | Aponta para |
|---|---|---|
| Domínio | CRUD + regras simples (conflito de horário, status, ocupação) | Layered |
| Canais de I/O | Único (REST) | Layered |
| Troca de infra provável | Baixa (Prisma/Postgres firmes) | Layered |
| Isolamento de testes | Aceitável com a DB de teste (`?schema=test`) | Layered |
| Time-to-market | MVP / curto | Layered |
| Time | 1 dev | Layered |

→ **6/6 Layered.** Arquitetura **em camadas** (não Hexagonal). Promoção tardia para Hexagonal
é permitida se a complexidade subir — registrar a decisão aqui antes.

**Regra de dependência (inegociável):**

```
web (cliente HTTP)  →  api
                       └─ routes (HTTP)  →  services (regra)  →  prisma (dados)
```

- **`services/` não importam Fastify nem `req`/`reply`.** Recebem `PrismaClient` + ids/DTOs.
- **`routes/` não carregam regra de negócio.** Só schema Zod + auth + mapear body→service.
- **SOLID + Clean Code:** uma responsabilidade por módulo; funções alvo < 20 linhas; nomes
  revelam intenção; sem magic numbers/strings (extrair const); DRY (rule of three);
  imutabilidade é padrão.

---

## Testes

| Tipo | Onde | Comando |
|---|---|---|
| Unit | `api/tests/unit` | `pnpm -C api test` |
| Integração | `api/tests/integration` | `pnpm -C api test:integration` |
| E2E / visual | Playwright (MCP) | mockar `/auth/me`,`/services`,`/hours`,`/settings`,`/appointments`,`/reports/*` |

> ⚠️ **Integração exige `DATABASE_URL` com `?schema=test`.** Os testes fazem `deleteMany` em
> todas as tabelas — **NUNCA** rode contra o banco real do `.env` (Neon `schema=public`).

---

## Comandos de verificação

```bash
# Backend
pnpm -C api exec tsc -p tsconfig.json --noEmit   # typecheck
pnpm -C api test                                  # unit (35)
pnpm -C api prisma migrate deploy                 # aplica migrations pendentes

# Frontend
pnpm -C web exec tsc --noEmit                     # typecheck
pnpm -C web lint                                  # eslint (ver baseline abaixo)
```

**Baseline de lint (web):** manter ≤ o baseline atual. Erros `set-state-in-effect` restantes
são apenas os **não-fetch** (`setMounted`, `theme-toggle`, `hero`) — qualquer fetch novo
**deve** usar React Query (C6).

---

## Boot Sequence (per-sessão)

1. Ler este `CLAUDE.md`.
2. Ler o `CLAUDE.md` da subpasta-alvo.
3. Identificar a tarefa + critério de aceite (spec-first; sem spec → perguntar).
4. TDD: teste → implementação → refactor → verificar (C2/C5).
5. Resumir o que foi feito com a evidência da verificação.

## Exceções aprovadas (registro)

- **Stack backend = Fastify** (não NestJS) — decisão do dev.
- ~~**UI: Base UI (`@base-ui/react`) para o `combobox`**~~ — **revertida em 2026-06-15**: o
  `combobox` ficou sem uso após o bento de Horários; `combobox.tsx` apagado e `@base-ui/react`
  removido. Canon de UI volta a **Radix puro** (`@radix-ui/react-*` ou o meta-pacote `radix-ui`).
- **Vitest ligado no `web`** — 2026-06-15. O `web` passou a ter unit-test runner (Vitest, já no
  canon) para lógica pura de UI (ex.: `availability.ts` da agenda). `pnpm -C web test`.
- **Gráficos: Apache ECharts (`echarts`) no dashboard** — 2026-06-28, aprovado pelo dev. Recharts não
  faz zoom por scroll/pinça nativo; o ECharts tem `dataZoom: { type: 'inside' }` (wheel + pinça de
  fábrica). Escopo: o gráfico combinado "Movimento financeiro" (receita + agendamentos, eixo duplo).
  **Recharts segue como padrão** nos demais gráficos; imports modulares (`echarts/core` + `use`),
  cores via tokens lidos do CSS (`getComputedStyle`), tema re-aplicado no toggle claro/escuro.
- _(novas exceções entram aqui, com data e justificativa, via C6)_

<!-- SPECKIT START -->
Feature ativa: **Prod-Readiness & Hardening Final** — `specs/004-prod-readiness/` ([spec](specs/004-prod-readiness/spec.md) + [plan](specs/004-prod-readiness/plan.md) + [tasks](specs/004-prod-readiness/tasks.md)). **✅ Implementada US1–US5** (verificação local verde; integração/Docker validam no CI/VPS): CVEs zerados (fast-jwt/fastify/next; 0 crítico runtime), app inteiro na VPS (web dockerizado standalone + Caddy 2 domínios + web no CI/deploy), sessão/navegador endurecidos (token fora do body, JWT 2d, COOKIE_DOMAIN, Swagger fora de prod, headers, gate `proxy.ts`, CSP estrita em prod), higiene de repo/infra (node_modules/lockfiles removidos, Redis removido, audit bloqueante, backup/rollback doc), limpeza de tokens + dvh. **Próximo:** spec **005-observabilidade**.
Features prontas: `specs/001-observabilidade-frontend`, `specs/002-dashboard-redesign`, e
`specs/003-seguranca-hardening` (**✅ concluída**: anti-brute-force, hardening, email verify/reset). Princípios:
`.specify/memory/constitution.md`; contexto/mapa: `.specify/memory/project-context.md`.
<!-- SPECKIT END -->
