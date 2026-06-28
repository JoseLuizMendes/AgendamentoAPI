"use client";

import { ChartColumn } from "lucide-react";

import { EmptyState } from "@/components/tenant/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountBars } from "@/components/tenant/dashboard/charts";
import { newClientsByMonth, type Client } from "./clients";

/** Novos clientes por mês (pela 1ª visita). Reusa `CountBars` do dashboard. */
export function ClientsTrendCard({ clients, className }: { clients: Client[]; className?: string }) {
  const data = newClientsByMonth(clients);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Novos clientes</CardTitle>
        <CardDescription>Por mês (primeira visita).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        {clients.length === 0 ? (
          <EmptyState icon={ChartColumn}>Sem dados ainda.</EmptyState>
        ) : (
          <CountBars data={data} dataKey="count" name="Novos" fill maxBarSize={72} />
        )}
      </CardContent>
    </Card>
  );
}
