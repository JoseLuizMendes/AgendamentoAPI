// Exporta o resumo do dashboard como CSV (KPIs, distribuição por status,
// série temporal e top serviços). Valores monetários em reais com ponto
// decimal e nomes entre aspas — compatível com planilhas.

import type { ReportSummary } from "./types";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
  CANCELED: "Cancelado",
};
const STATUS_ORDER = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELED"];

function cell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function reais(cents: number): string {
  return (cents / 100).toFixed(2);
}
function pct(rate: number): string {
  return (rate * 100).toFixed(1);
}

export function buildSummaryCsv(summary: ReportSummary): string {
  const c = summary.current;
  const rows: (string | number)[][] = [
    ["Indicador", "Valor"],
    ["Receita realizada (R$)", reais(c.revenueRealizedInCents)],
    ["Receita esperada (R$)", reais(c.revenueExpectedInCents)],
    ["Agendamentos", c.appointmentsTotal],
    ["Clientes", c.clients],
    ["Novos clientes", c.newClients],
    ["Ticket médio (R$)", reais(c.ticketMedioInCents)],
    ["Ocupação (%)", pct(c.occupancyRate)],
    ["No-show (%)", pct(c.noShowRate)],
    ["Cancelamento (%)", pct(c.cancelRate)],
    [],
    ["Status", "Quantidade"],
    ...STATUS_ORDER.map((s) => [STATUS_LABELS[s] ?? s, c.byStatus[s] ?? 0]),
    [],
    ["Período", "Receita (R$)", "Agendamentos"],
    ...summary.series.map((b) => [b.label, reais(b.revenueInCents), b.appointments]),
    [],
    ["Serviço", "Quantidade", "Receita (R$)"],
    ...summary.topServices.map((s) => [s.name, s.count, reais(s.revenueInCents)]),
  ];
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadSummaryCsv(summary: ReportSummary, filename: string): void {
  // BOM para o Excel interpretar acentos como UTF-8.
  const blob = new Blob(["﻿" + buildSummaryCsv(summary)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
