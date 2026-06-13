---
nicho: "web/src/app/[tenant]/clientes"
escopo: "Rota de Clientes"
---

# .../clientes/

> Complementa `../CLAUDE.md` ([tenant]) e a raiz.

- `page.tsx` deriva a base de clientes **dos agendamentos** (não há model Customer): agrega por
  telefone (nome, nº de visitas, última visita, total gasto), com busca + ordenação.
- Dados via `useQuery(["appointments","all"])`. Lista renderizada com o **shadcn `Table`**
  (`components/ui/table`).
- Exibir data é só formatação (`toLocaleDateString`); **picker de data** só em campos de entrada
  (agenda), não aqui.
