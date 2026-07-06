---
nicho: "web/src/components/tenant/clientes"
escopo: "Componentes da página de Clientes (bento)"
---

# web/src/components/tenant/clientes/

> Complementa `../CLAUDE.md` (tenant) e a raiz.

## Escopo

Cards da página de Clientes, num grid **bento** espelhando Horários/Serviços:
`clients-table-card` (lista principal: busca + ordenação + paginação de 8; altura natural),
`clients-summary-card` (KPIs), `clients-highlights-card` (maior gasto, maior ticket médio, mais
visitas, cliente novo, mais recente, inativo/reativação, mais faltas), `clients-trend-card`
(gráfico "novos clientes por mês"; estica `flex-1` p/ fechar a coluna direita).
Lógica pura em `clients.ts` + `.test.ts`.

## Diretrizes

- **Fonte = agendamentos** (`/appointments`): **não há model Customer**. A página
  (`app/[tenant]/clientes/page.tsx`) faz `useQuery(["appointments","all"])`, agrega com
  `aggregateClients` e passa `clients: Client[]` aos cards (presentacionais).
- **Lógica pura em `clients.ts`** (testada): `aggregateClients` (por `phone||name`; `visits`
  ignora CANCELED; `noShows` conta NO_SHOW; `total` só COMPLETED; `firstVisit`/`lastVisit`),
  `avgTicketInCents`, `filterClients`, `sortClients`, `summarizeClients`, `clientHighlights`
  (7 destaques: gasto/ticket/visitas/novo/recente/inativo/faltas), `newClientsByMonth`.
- **Sem `useEffect` de fetch.** O único efeito da página é navegação/toast no erro (401 → login).
- **Reuso:** `paginate` (`@/lib/paginate`), `StatRow`/`EmptyState`/`formatBRL` (`../shared`),
  `CountBars` (`../dashboard/charts`), `Bento`/`Card*`/`Table`/`Input`/`Select`/`Skeleton`
  (`@/components/ui/*`). **Só tokens; sem hex.**
- Paginação da tabela: `PAGE_SIZE = 8`; busca/ordenação resetam a página.

## Decisões pendentes
- **Detalhe do cliente:** drawer com histórico de agendamentos ficou de fora (decisão 2026-06-26).
  ⚠️ **PENDENTE — avaliar** adicionar um `Sheet` ao clicar na linha.

## Referências
- `../CLAUDE.md` (tenant) · `../servicos/` (mesmo padrão) · raiz
