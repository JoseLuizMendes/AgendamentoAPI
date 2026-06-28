"use client";

import { CircleDollarSign, Clock, Tag } from "lucide-react";

import { useTenant } from "@/components/tenant/tenant-context";
import { StatRow, formatBRL } from "@/components/tenant/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountBars } from "@/components/tenant/dashboard/charts";
import { summarizeServices, durationBuckets } from "./services-stats";

/** Resumo só-leitura do catálogo (derivado de `services`). Sem fetch — reage às mutações. */
export function ServiceSummaryCard({ className }: { className?: string }) {
  const { services } = useTenant();
  const s = summarizeServices(services);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Resumo dos serviços</CardTitle>
        <CardDescription>Visão geral do catálogo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <StatRow icon={Tag} label="Serviços" value={s.count} />
          <StatRow icon={CircleDollarSign} label="Preço médio" value={formatBRL(s.avgPriceInCents)} />
          <StatRow icon={Clock} label="Duração média" value={`${s.avgDurationMin} min`} />
        </div>
        {services.length > 0 ? (
          <div className="flex flex-1 flex-col justify-center border-t pt-3">
            <p className="text-muted-foreground mb-1 font-mono text-xs uppercase tracking-widest">
              Por faixa de duração
            </p>
            <CountBars data={durationBuckets(services)} dataKey="count" name="Serviços" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
