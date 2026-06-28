---
nicho: "web/src/components/tenant/horarios"
escopo: "Componentes da página de Horários (bento)"
---

# web/src/components/tenant/horarios/

> Complementa `../CLAUDE.md` (tenant) e a raiz.

## Escopo

Cards da página de Horários, dispostos num grid **bento** (`@/components/ui/bento`):
`week-card` (visão da semana: selecionar dia + excluir), `week-summary-card` (resumo
só-leitura da grade — lógica pura em `week-summary.ts` + `.test.ts`), `day-editor`
(abre/fecha, intervalos rotulados, copiar p/ vários dias), `overrides-card` (exceções de
data / feriados — oculta vencidas + paginação, lógica em `overrides-list.ts` + `.test.ts`),
`triage-card` (limiares de triagem de status + legenda das fases).

## Diretrizes

- **Data fetching via React Query** pelo `tenant-context` (`hours`, `overrides`,
  `settings` + `reload*`). **Sem `useEffect` de fetch.**
- **Editar/excluir/intervalos/exceções já existem na API** — só consumir: `PUT`/`DELETE
  /hours/:id`, `POST`/`DELETE /hours/:id/breaks` (com `label`), CRUD `/overrides`.
  Criar dia novo = `POST /hours`; editar dia existente = `PUT` (não re-`POST`, que bate
  na unique `tenantId+dayOfWeek`).
- **Sem `set-state-in-effect`**: o `day-editor` é remontado por `key` (dia + valores) no
  `page.tsx` para reiniciar o estado — não sincronizar via efeito.
- **Só tokens** (sem hex). Reusar `HourPicker`, `Checkbox`, `AlertDialog`,
  `Calendar`/`Popover`, `Card`, `Input` de `@/components/ui/*`; `DAYS`/`EmptyState` de
  `../shared`.
- **Mutations**: `useMutation` + `apiRequest` + `toast` (sonner); erros via `ApiError`.

## Decisões pendentes

- **Exceções vencidas (2026-06-19):** por ora `overrides-card` apenas **oculta** as exceções
  com data passada (`upcomingOverrides`, não-destrutivo — o registro fica no banco).
  ⚠️ **PENDENTE — avaliar com o dev** se vale fazer DELETE automático (ou um cron no backend)
  para limpar exceções vencidas em vez de só esconder.

## Referências
- `../CLAUDE.md` (tenant) · `@/components/ui/bento`, `@/components/ui/hour-picker` · raiz
