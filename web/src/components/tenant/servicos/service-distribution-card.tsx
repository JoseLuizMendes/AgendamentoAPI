"use client";

import { ChartColumn } from "lucide-react";

import { useTenant } from "@/components/tenant/tenant-context";
import { EmptyState } from "@/components/tenant/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountBars } from "@/components/tenant/dashboard/charts";
import { priceBuckets } from "./services-stats";

/** Distribuição dos serviços por faixa de preço (gráfico). Reusa `CountBars` do dashboard. */
export function ServiceDistributionCard({ className }: { className?: string }) {
  const { services } = useTenant();
  const data = priceBuckets(services);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Distribuição</CardTitle>
        <CardDescription>Serviços por faixa de preço.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        {services.length === 0 ? (
          <EmptyState icon={ChartColumn}>Nenhum serviço cadastrado.</EmptyState>
        ) : (
          <CountBars data={data} dataKey="count" name="Serviços" />
        )}
      </CardContent>
    </Card>
  );
}
