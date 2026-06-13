---
nicho: "web/src/app/[tenant]/dashboard"
escopo: "Rota do Dashboard"
---

# .../dashboard/

> Complementa `../CLAUDE.md` ([tenant]) e a raiz.

- `page.tsx` tem o filtro de período + busca `/reports/summary` via `useQuery(["reports",period])`
  (cálculo do intervalo dentro do `queryFn`, não no render).
- Componentes de visualização (KPIs, gráficos, funil, export CSV) em
  `components/tenant/dashboard/` (ver o CLAUDE.md de lá).
- Estado vazio quando `appointmentsTotal === 0`.
