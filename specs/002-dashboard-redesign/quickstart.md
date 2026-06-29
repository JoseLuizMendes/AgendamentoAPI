# Quickstart — Validar o Redesign do Dashboard

Guia de validação. Detalhes em [contracts/dashboard-ui.md](./contracts/dashboard-ui.md) e
[data-model.md](./data-model.md).

## Pré-requisitos
- `pnpm -C web dev` (ou validação via Playwright/MCP mockando `/reports/summary`).

## 1. Lógica pura (automatizado)

```bash
pnpm -C web test       # inclui metrics.test.ts (clientSplit: sem clientes / só novos / mistura)
pnpm -C web exec tsc --noEmit
pnpm -C web lint
```

**Esperado**: `clientSplit` correto (recorrentes = clients − newClients, nunca < 0; proporção 0 se
sem clientes); tsc/lint limpos.

## 2. Movimento unificado (manual/visual)

1. Abrir o dashboard → existe **um** card "Movimento" com abas "Por dia da semana" e "Por hora".
2. Clicar nas abas → a série troca **sem recarregar** a página; o pico continua destacado.
3. Trocar o período no topo (Semana/Mês/Ano) → as duas abas refletem o novo intervalo.

## 3. Métricas de retenção (visual)

1. Com dados → ver **Cancelamento** e **No-show** em %, com delta vs período anterior.
2. Ver **Novos vs recorrentes** (contagem + proporção).
3. Período sem dados → taxas mostram **"—"** (não "0%"); deltas omitidos.

## 4. Compactação (visual)

1. Com pouco dado → nenhum gráfico fica desproporcionalmente alto/vazio.
2. Conferir claro/escuro e **0 erro de console**.

## Critérios de aceite (do spec)
- **SC-001**: ≤ 3 cards grandes de gráfico (movimento unificado + receita + agendamentos).
- **SC-002**: nenhum card com área vazia maior que o conteúdo útil.
- **SC-003**: cancelamento/no-show + novos vs recorrentes legíveis num relance.
- **SC-004**: troca de dimensão sem recarregar e sem perder o período.
- **SC-005**: zero regressão claro/escuro e zero erro de console.
