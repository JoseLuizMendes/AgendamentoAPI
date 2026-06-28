// Lógica pura de métricas do dashboard (derivada de ReportScalars). Sem React/JSX — testável.

export type ClientSplit = {
  novos: number;
  recorrentes: number;
  totalClientes: number;
  novosPct: number; // 0..1
};

/**
 * Divide os clientes do período em novos (1ª visita) e recorrentes.
 * Defensivo: `newClients` nunca passa de `clients`, então recorrentes ≥ 0.
 */
export function clientSplit(s: { clients: number; newClients: number }): ClientSplit {
  const totalClientes = s.clients;
  const novos = Math.min(s.newClients, totalClientes);
  const recorrentes = Math.max(0, totalClientes - novos);
  const novosPct = totalClientes > 0 ? novos / totalClientes : 0;
  return { novos, recorrentes, totalClientes, novosPct };
}

/** Formata uma taxa 0..1 como "NN%"; "—" quando não há base (denominador zero). */
export function formatRate(rate: number, hasBase: boolean): string {
  return hasBase ? `${Math.round(rate * 100)}%` : "—";
}
