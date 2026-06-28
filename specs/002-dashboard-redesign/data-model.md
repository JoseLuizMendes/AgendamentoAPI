# Data Model — Redesign do Dashboard

> Sem persistência nova. Tudo deriva de `ReportSummary` (`/reports/summary`). Aqui ficam as
> derivações/visões usadas pelos novos componentes. Fonte: `ReportScalars` (`current`/`previous`).

## Derivações puras (em `metrics.ts`, testáveis)

| Saída | Fórmula | Estado vazio |
|---|---|---|
| **Cancelamento (%)** | `current.cancelRate` (já calculado) | "—" se `appointmentsTotal === 0` |
| **No-show (%)** | `current.noShowRate` (já calculado) | "—" se `appointmentsTotal === 0` |
| **Δ Cancelamento / No-show** | `deltaPct(current.rate, previous.rate)` | omitido se sem base |
| **Clientes novos** | `current.newClients` | 0 → estado vazio |
| **Clientes recorrentes** | `current.clients - current.newClients` (≥ 0) | 0 → estado vazio |
| **Proporção novos/recorrentes** | `newClients / clients` (0 se `clients === 0`) | "—" se `clients === 0` |

### `clientSplit(scalars)` → `{ novos, recorrentes, totalClientes, novosPct }`
- `recorrentes = max(0, clients - newClients)`; `novosPct = clients > 0 ? newClients/clients : 0`.
- Função pura, testada no Vitest (caminhos: sem clientes, só novos, mistura).

## Movimento (sem transformação nova)

- **Por dia da semana**: `byWeekday: number[]` (índice 0=Dom … 6=Sáb) → reusa o mapeamento de
  `WEEKDAYS` já existente na página.
- **Por hora**: `byHour: number[]` (filtrado para a faixa exibida, ex.: 6h–22h, como hoje).
- Ambos alimentam o mesmo `HighlightBars` (pico destacado), só trocando a série conforme a aba.

## Componentes (props — contrato de UI)

- **MovementCard**: `{ byWeekday: number[]; byHour: number[] }` + estado interno de aba.
- **RetentionKpis**: `{ current: ReportScalars; previous: ReportScalars }`.
