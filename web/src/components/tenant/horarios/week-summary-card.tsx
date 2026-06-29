"use client";

import { CalendarCheck, CalendarX2, CircleHelp, Clock, Coffee } from "lucide-react";

import { useTenant } from "@/components/tenant/tenant-context";
import { StatRow } from "@/components/tenant/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeWeek, formatOpenHours } from "./week-summary";

/** Resumo só-leitura da grade semanal (derivado de `hours`). Sem fetch — reage à edição. */
export function WeekSummaryCard({ className }: { className?: string }) {
  const { hours } = useTenant();
  const s = summarizeWeek(hours);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Resumo da semana</CardTitle>
        <CardDescription>Visão geral da grade configurada.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <StatRow icon={Clock} label="Horas abertas / semana" value={formatOpenHours(s.totalOpenMinutes)} />
        <StatRow icon={CalendarCheck} label="Dias abertos" value={s.openDays} />
        <StatRow icon={CalendarX2} label="Dias fechados" value={s.closedDays} />
        <StatRow icon={CircleHelp} label="Dias não configurados" value={s.unsetDays} />
        <StatRow icon={Coffee} label="Intervalos" value={s.breakCount} />
      </CardContent>
    </Card>
  );
}
