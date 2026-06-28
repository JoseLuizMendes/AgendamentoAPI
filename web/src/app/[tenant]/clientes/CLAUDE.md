---
nicho: "web/src/app/[tenant]/clientes"
escopo: "Rota de Clientes"
---

# .../clientes/

> Complementa `../CLAUDE.md` ([tenant]) e a raiz.

- `page.tsx` é **fina**: faz `useQuery(["appointments","all"])`, agrega com `aggregateClients`
  e monta o **bento** (largura total). Os cards vivem em `@/components/tenant/clientes/*`
  (tabela, resumo, destaques, novos por mês). Base derivada **dos agendamentos** (não há model
  Customer): agrega por telefone (visitas, 1ª/última visita, total gasto).
- Lógica pura/testável em `clientes/clients.ts`. Tabela = shadcn `Table` + paginação (`@/lib/paginate`).
- Exibir data é só formatação (`toLocaleDateString`); **picker de data** só em campos de entrada
  (agenda), não aqui.
- Único `useEffect` = navegação/toast no erro (401 → login). **Sem `useEffect` de fetch.**
