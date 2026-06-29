"use client";

import { CircleDollarSign, Coins, UserCheck, Users } from "lucide-react";

import { StatRow, formatBRL } from "@/components/tenant/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeClients, type Client } from "./clients";

/** KPIs da base de clientes (derivado de `clients`). */
export function ClientsSummaryCard({ clients, className }: { clients: Client[]; className?: string }) {
  const s = summarizeClients(clients);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Resumo</CardTitle>
        <CardDescription>Visão geral da base.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <StatRow icon={Users} label="Clientes" value={s.total} />
        <StatRow icon={UserCheck} label="Recorrentes" value={s.recurring} />
        <StatRow icon={CircleDollarSign} label="Ticket médio" value={formatBRL(s.ticketMedioInCents)} />
        <StatRow icon={Coins} label="Total no período" value={formatBRL(s.totalInCents)} />
      </CardContent>
    </Card>
  );
}
