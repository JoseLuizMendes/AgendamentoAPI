---
nicho: "web/src/app/[tenant]/agenda"
escopo: "Rota da Agenda"
---

# .../agenda/

> Complementa `../CLAUDE.md` ([tenant]) e a raiz.

- `page.tsx` é fino: só monta `<AgendaCalendar/>` num container de altura fixa.
- **Toda a lógica/UI vive em** `components/tenant/agenda/` (ver o CLAUDE.md de lá): FullCalendar,
  fases, cores por token, drawers, `DateTimePicker`, triagem.
- Dados via React Query nos componentes; nada de fetch aqui.
