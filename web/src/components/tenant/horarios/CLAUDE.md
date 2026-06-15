---
nicho: "web/src/components/tenant/horarios"
escopo: "Componentes da página de Horários (bento)"
---

# web/src/components/tenant/horarios/

> Complementa `../CLAUDE.md` (tenant) e a raiz.

## Escopo

Cards da página de Horários, dispostos num grid **bento** (`@/components/ui/bento`):
`week-card` (visão da semana: selecionar dia + excluir), `day-editor` (abre/fecha,
intervalos rotulados, copiar p/ vários dias), `overrides-card` (exceções de data /
feriados), `triage-card` (limiares de triagem de status).

## Diretrizes

- **Data fetching via React Query** pelo `tenant-context` (`hours`, `overrides`,
  `settings` + `reload*`). **Sem `useEffect` de fetch.**
- **Editar/excluir/intervalos/exceções já existem na API** — só consumir: `PUT`/`DELETE
  /hours/:id`, `POST`/`DELETE /hours/:id/breaks` (com `label`), CRUD `/overrides`.
  Criar dia novo = `POST /hours`; editar dia existente = `PUT` (não re-`POST`, que bate
  na unique `tenantId+dayOfWeek`).
- **Sem `set-state-in-effect`**: o `day-editor` é remontado por `key` (dia + valores) no
  `page.tsx` para reiniciar o estado — não sincronizar via efeito.
- **Só tokens** (sem hex). Reusar `HourPicker`, `Combobox`, `Checkbox`, `AlertDialog`,
  `Calendar`/`Popover`, `Card`, `Input` de `@/components/ui/*`; `DAYS`/`EmptyState` de
  `../shared`.
- **Mutations**: `useMutation` + `apiRequest` + `toast` (sonner); erros via `ApiError`.

## Referências
- `../CLAUDE.md` (tenant) · `@/components/ui/bento`, `@/components/ui/hour-picker` · raiz
