---
nicho: "web/src/components/tenant/agenda"
escopo: "Agenda interativa (FullCalendar) + drawers + ciclo de vida"
---

# web/src/components/tenant/agenda/

> Complementa `../CLAUDE.md` (tenant) e a raiz.

## Escopo

`agenda-calendar` (FullCalendar timeGrid/dayGrid), `colors` (tokens serviço/status), `phase`
(ciclo de vida derivado), `triage-panel` (triagem in-app), `datetime`/`datetime-picker`,
`appointment-create-drawer`, `appointment-detail-drawer`.

## Diretrizes

- **Leitura de agendamentos via `useQuery`** keyed por intervalo (`["appointments","range",from,to]`);
  escrita via `useMutation` + `invalidateQueries(["appointments"])`. Sem `useEffect` de fetch.
- Cores **só por token** (`colors.ts` → `var(--color-*)`); nunca hex. Borda lateral = status;
  corpo = serviço/status (toggle).
- Fase do card por `phase.ts` (`phaseOf`/`PHASE_CLASS`/`NEEDS_TRIAGE`), derivada de tempo + status +
  `settings`. Não recalcular fase ad-hoc.
- `selectAllow` bloqueia criar no passado; sem `nowIndicator`. `renderEvent` tolera evento sem
  `extendedProps.appt` (mirror/bg).
- Datas: campos de início/fim usam **`DateTimePicker`** (Calendar shadcn + hora); helpers de
  conversão em `datetime.ts` (`toLocalInputValue`/`localInputToISO`).
- Drawers via `Sheet`; estado de form resetado por `key` (sem efeito de sync) — ver create/detail.

## Quality Gate
- [ ] Read via useQuery / write via useMutation (sem useEffect-fetch)
- [ ] Cores por token (zero hex) · fase por `phase.ts`
- [ ] Campos de data/hora via `DateTimePicker`

## Referências
- `../CLAUDE.md` (tenant) · `phase.ts`, `colors.ts`, `datetime-picker.tsx` · raiz
