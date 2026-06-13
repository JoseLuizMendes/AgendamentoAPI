"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, CalendarDays, Download, DollarSign, Receipt, UserX, Users } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/brand/eyebrow";
import { EmptyState, formatBRL } from "@/components/tenant/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/tenant/dashboard/kpi-card";
import { CountBars, HighlightBars, RevenueArea } from "@/components/tenant/dashboard/charts";
import { StatusFunnel } from "@/components/tenant/dashboard/status-funnel";
import { downloadSummaryCsv } from "@/components/tenant/dashboard/export";
import { deltaPct, PERIODS, periodRange, type PeriodKey } from "@/components/tenant/dashboard/periods";
import type { ReportSummary } from "@/components/tenant/dashboard/types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function argmax(arr: number[]): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if ((arr[i] ?? 0) > (arr[best] ?? 0)) best = i;
  return best;
}

export default function DashboardPage() {
  const router = useRouter();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("month");

  const {
    data: summary,
    isPending: loading,
    error,
  } = useQuery({
    queryKey: ["reports", periodKey],
    queryFn: () => {
      const { from, to, granularity } = periodRange(periodKey);
      return apiRequest<ReportSummary>(
        `/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&granularity=${granularity}`,
      );
    },
  });

  useEffect(() => {
    if (!error) return;
    if (error instanceof ApiError && error.status === 401) router.replace("/login");
    else toast.error(error instanceof ApiError ? error.message : "Erro ao carregar indicadores");
  }, [error, router]);

  const weekdayData = useMemo(
    () => (summary?.byWeekday ?? []).map((v, i) => ({ label: WEEKDAYS[i] ?? String(i), value: v })),
    [summary],
  );
  const hourData = useMemo(
    () =>
      (summary?.byHour ?? [])
        .map((v, h) => ({ label: `${h}h`, value: v, h }))
        .filter((d) => d.h >= 6 && d.h <= 22),
    [summary],
  );

  const c = summary?.current;
  const p = summary?.previous;

  function exportCsv() {
    if (!summary) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadSummaryCsv(summary, `relatorio-${periodKey}-${stamp}.csv`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-3">Indicadores</Eyebrow>
          <h1 className="font-display text-3xl tracking-wide lg:text-4xl">Performance</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-muted/60 inline-flex flex-wrap gap-1 rounded-full border p-1">
            {PERIODS.map((per) => (
              <button
                key={per.key}
                onClick={() => setPeriodKey(per.key)}
                aria-pressed={periodKey === per.key}
                className={cn(
                  "focus-visible:ring-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
                  periodKey === per.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {per.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!summary}>
            <Download className="size-4" /> <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        </div>
      </div>

      {loading || !summary || !c || !p ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard icon={DollarSign} label="Receita" value={formatBRL(c.revenueRealizedInCents)} delta={deltaPct(c.revenueRealizedInCents, p.revenueRealizedInCents)} />
            <KpiCard icon={CalendarDays} label="Agendamentos" value={String(c.appointmentsTotal)} delta={deltaPct(c.appointmentsTotal, p.appointmentsTotal)} />
            <KpiCard icon={Users} label="Clientes" value={String(c.clients)} delta={deltaPct(c.clients, p.clients)} hint={`${c.newClients} novos`} />
            <KpiCard icon={Receipt} label="Ticket médio" value={formatBRL(c.ticketMedioInCents)} delta={deltaPct(c.ticketMedioInCents, p.ticketMedioInCents)} />
            <KpiCard icon={Activity} label="Ocupação" value={`${Math.round(c.occupancyRate * 100)}%`} delta={deltaPct(c.occupancyRate, p.occupancyRate)} />
            <KpiCard icon={UserX} label="No-show" value={`${Math.round(c.noShowRate * 100)}%`} delta={deltaPct(c.noShowRate, p.noShowRate)} invertGood />
          </div>

          {c.appointmentsTotal === 0 ? (
            <EmptyState icon={CalendarDays}>
              Sem agendamentos neste período. Os gráficos aparecem assim que houver movimento.
            </EmptyState>
          ) : (
          <>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl tracking-wide">Receita no período</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueArea data={summary.series} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl tracking-wide">Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <CountBars data={summary.series} dataKey="appointments" name="Agendamentos" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl tracking-wide">Top serviços</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.topServices.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sem dados no período.</p>
                ) : (
                  (() => {
                    const max = Math.max(...summary.topServices.map((s) => s.count), 1);
                    return summary.topServices.map((s) => (
                      <div key={s.serviceId} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{s.name}</span>
                          <span className="text-muted-foreground shrink-0">
                            {s.count}× · {formatBRL(s.revenueInCents)}
                          </span>
                        </div>
                        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                          <div className="bg-foreground h-full rounded-full" style={{ width: `${(s.count / max) * 100}%` }} />
                        </div>
                      </div>
                    ));
                  })()
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl tracking-wide">Funil de status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusFunnel byStatus={c.byStatus} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl tracking-wide">Movimento por dia</CardTitle>
              </CardHeader>
              <CardContent>
                <HighlightBars data={weekdayData} peakIndex={argmax(summary.byWeekday)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl tracking-wide">Movimento por hora</CardTitle>
            </CardHeader>
            <CardContent>
              <HighlightBars
                data={hourData}
                peakIndex={hourData.findIndex((d) => d.h === argmax(summary.byHour))}
              />
            </CardContent>
          </Card>
          </>
          )}
        </>
      )}
    </div>
  );
}
