# Feature Specification: Redesign do Dashboard (densidade > espaço vazio)

**Feature Branch**: `002-dashboard-redesign`

**Created**: 2026-06-28

**Status**: Draft

**Input**: Os gráficos do dashboard têm altura fixa grande e ficam enormes/vazios com pouco dado —
ocupam muito espaço para pouca informação. Quer-se: unificar "Movimento por dia" + "por hora" num
card com tabs; gráficos proporcionais à densidade; e preencher o espaço com **mais métricas** (taxa
de cancelamento/no-show, clientes novos vs recorrentes) em vez de gráficos inflados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Movimento num card só, com abas (Priority: P1)

O dono vê "quando há movimento" num **único** card, alternando entre **Por dia da semana** e
**Por hora** por abas — em vez de dois cards grandes lado a lado. O filtro de período do topo
(Semana/Mês/Ano) continua mandando no intervalo analisado.

**Why this priority**: é a maior fonte de espaço desperdiçado hoje (dois gráficos grandes para a
mesma pergunta). Unificar dá o ganho de espaço mais visível e imediato.

**Independent Test**: abrir o dashboard → existe um card "Movimento" com duas abas; trocar de aba
muda a dimensão (dia da semana ↔ hora do dia) sem recarregar; o período do topo afeta os dois.

**Acceptance Scenarios**:

1. **Given** o dashboard aberto, **When** olho a seção de movimento, **Then** vejo **um** card com
   abas "Por dia da semana" e "Por hora" (não dois cards separados).
2. **Given** a aba "Por dia da semana" ativa, **When** clico em "Por hora", **Then** o mesmo card
   passa a mostrar a distribuição por hora, mantendo o período selecionado no topo.
3. **Given** um período diferente no filtro do topo, **When** ele muda, **Then** o card de movimento
   reflete o novo intervalo nas duas abas.

---

### User Story 2 - Métricas de retenção que justificam o espaço (Priority: P2)

Em vez de gráficos grandes e vazios, o dono vê **indicadores úteis**: **taxa de cancelamento/no-show**
e **clientes novos vs recorrentes** no período, cada um com a variação (delta) em relação ao período
anterior quando fizer sentido.

**Why this priority**: transforma espaço ocioso em informação acionável (retenção/risco), alinhado
ao pedido "se for pra ocupar, que seja com mais dados".

**Independent Test**: com dados de exemplo, os novos indicadores aparecem com valores corretos
(cancelamento/no-show em %, e a divisão novos vs recorrentes) e o delta correto vs o período anterior.

**Acceptance Scenarios**:

1. **Given** agendamentos no período, **When** abro o dashboard, **Then** vejo a **taxa de
   cancelamento** e a **taxa de no-show** do período (%), com delta vs período anterior.
2. **Given** clientes que atenderam no período, **When** abro o dashboard, **Then** vejo quantos são
   **novos** (1ª visita no período) e quantos são **recorrentes**, com a proporção entre eles.
3. **Given** período sem dados, **When** abro o dashboard, **Then** os indicadores mostram um estado
   vazio claro (sem números enganosos), não um gráfico gigante vazio.

---

### User Story 3 - Layout compacto e proporcional (Priority: P3)

Os gráficos (Receita, Agendamentos, Top serviços) deixam de ter altura fixa exagerada: ficam
**proporcionais** à densidade de informação, sem grandes vãos. A página parece densa e organizada,
não "esticada" para preencher espaço.

**Why this priority**: melhora a percepção geral, mas depende menos de lógica nova — é ajuste de
layout/altura. Vem depois do ganho estrutural (US1) e do conteúdo novo (US2).

**Independent Test**: com **pouco** dado (ex.: 1 serviço, 1 dia com movimento), nenhum card fica
desproporcionalmente alto/vazio; a grade se mantém equilibrada em telas largas e estreitas.

**Acceptance Scenarios**:

1. **Given** pouco dado no período, **When** abro o dashboard, **Then** os gráficos aparecem em
   altura compacta, sem grandes áreas vazias.
2. **Given** tela larga, **When** vejo a grade, **Then** os cards se distribuem de forma equilibrada
   (sem um gráfico solitário ocupando toda a largura sem necessidade).

---

### Edge Cases

- **Período sem nenhum agendamento**: todos os cards mostram estado vazio claro; nenhuma taxa é
  exibida como enganosa (ex.: 0/0 vira "—", não "0%").
- **Só uma dimensão tem dado** (ex.: movimento só numa hora): o card de movimento ainda renderiza
  compacto, com a barra/área proporcional.
- **Delta sem período anterior comparável** (primeiro período de uso): o delta é omitido em vez de
  mostrar variação sem base.
- **Cancelamento/no-show quando não há agendamentos**: taxa exibida como "—".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O dashboard MUST apresentar o movimento num **único card com abas** "Por dia da semana"
  e "Por hora"; trocar de aba MUST alternar a dimensão sem recarregar a página.
- **FR-002**: O filtro de período do topo (Semana/Mês/Ano) MUST continuar controlando o intervalo de
  **todos** os cards, incluindo as duas abas do movimento.
- **FR-003**: O dashboard MUST exibir **taxa de cancelamento** e **taxa de no-show** do período (%),
  com delta vs período anterior quando houver base comparável.
- **FR-004**: O dashboard MUST exibir a contagem de **clientes novos** (1ª visita no período) e
  **recorrentes**, com a proporção entre eles.
- **FR-005**: Todos os indicadores e gráficos MUST ter **estado vazio claro** quando não houver dado,
  sem números enganosos (ex.: taxa "—" quando denominador é zero).
- **FR-006**: Os gráficos MUST ter altura **compacta/proporcional** — sem altura fixa exagerada que
  gere grandes áreas vazias com pouco dado.
- **FR-007**: A página MUST manter a coerência visual atual (largura total, tokens de cor, sem hex;
  variações de valor positivo/negativo seguindo o canon: coral só para negativo).

### Key Entities *(include if feature involves data)*

- **Indicador (KPI)**: um número do período (ex.: taxa de cancelamento) + delta opcional vs período
  anterior + rótulo. Sem persistência própria — derivado dos agendamentos do período.
- **Distribuição de movimento**: série de contagens por dimensão (dia da semana **ou** hora do dia)
  no período selecionado.
- **Segmento de clientes**: novos (1ª visita no período) vs recorrentes (já atenderam antes) —
  derivado dos agendamentos (não há model Customer).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O número de cards "grandes" de gráfico cai de 5 para no máximo 3 (movimento unificado +
  receita + agendamentos), sem perda de informação.
- **SC-002**: Com pouco dado, **nenhum** card de gráfico ocupa altura desproporcional (nenhuma área
  vazia maior que o conteúdo útil do card).
- **SC-003**: O dono consegue ler, num relance (≤ 5s), taxa de cancelamento/no-show e a divisão
  novos vs recorrentes do período — métricas que hoje **não existem** no dashboard.
- **SC-004**: Trocar a dimensão do movimento (dia ↔ hora) acontece **sem recarregar** a página e sem
  perder o período selecionado.
- **SC-005**: Zero regressão visual no claro/escuro e zero erro de console.

## Assumptions

- Reusa a fonte de dados atual do dashboard (`/reports/summary` via React Query) e os componentes de
  gráfico existentes (Recharts com tokens). **Sem dependência nova** (Constituição §III).
- As métricas novas são, sempre que possível, **derivadas dos campos já existentes** de
  `/reports/summary` (ex.: `byStatus` para cancelamento, `newClients`/`clients` para novos vs
  recorrentes). Se algum campo necessário **não** existir na resposta atual, o ajuste no backend de
  relatórios entra como dependência (tarefa separada), preservando o `tenantId` scoping.
- Os novos indicadores seguem o padrão visual de KPI já usado (valor + delta), não novos gráficos.
- Lógica pura nova (agregações de novos vs recorrentes / cancelamento) é **testável** (Vitest do web).
- Escopo é o dashboard da tenant (`/[tenant]/dashboard`); não altera outras telas.
