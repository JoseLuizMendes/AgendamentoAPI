// Espelha a resposta de GET /reports/summary.

export type ReportScalars = {
  revenueRealizedInCents: number;
  revenueExpectedInCents: number;
  appointmentsTotal: number;
  completed: number;
  canceled: number;
  noShow: number;
  clients: number;
  newClients: number;
  ticketMedioInCents: number;
  occupancyRate: number;
  noShowRate: number;
  cancelRate: number;
};

export type ReportSummary = {
  range: { from: string; to: string; granularity: string };
  current: ReportScalars;
  previous: ReportScalars;
  series: { key: string; label: string; revenueInCents: number; appointments: number }[];
  topServices: { serviceId: number; name: string; count: number; revenueInCents: number }[];
  byWeekday: number[];
  byHour: number[];
};
