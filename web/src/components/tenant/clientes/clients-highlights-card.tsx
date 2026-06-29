"use client";

import { ArrowUp, CalendarClock, CalendarX2, Repeat, UserPlus, Users, UserX, Wallet } from "lucide-react";

import { EmptyState, formatBRL } from "@/components/tenant/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clientHighlights, avgTicketInCents, formatShortDate, type Client } from "./clients";

type IconType = React.ComponentType<{ className?: string }>;

function HighlightRow({
  icon: Icon,
  label,
  client,
  value,
}: {
  icon: IconType;
  label: string;
  client: Client | null;
  value: (c: Client) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <span className="text-muted-foreground flex shrink-0 items-center gap-2">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="min-w-0 truncate text-right">
        {client ? (
          <>
            <span className="font-medium">{client.name}</span>
            <span className="text-muted-foreground font-mono"> · {value(client)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
    </div>
  );
}

const daysAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "hoje" : `há ${d}d`;
};

/** Destaques da base: valor, recorrência, aquisição, reativação e risco (no-show). */
export function ClientsHighlightsCard({ clients, className }: { clients: Client[]; className?: string }) {
  const h = clientHighlights(clients);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Destaques</CardTitle>
        <CardDescription>Quem se destaca na base.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        {clients.length === 0 ? (
          <EmptyState icon={Users}>Sem clientes ainda.</EmptyState>
        ) : (
          <>
            <HighlightRow icon={ArrowUp} label="Maior gasto" client={h.topSpender} value={(c) => formatBRL(c.totalInCents)} />
            <HighlightRow icon={Wallet} label="Maior ticket médio" client={h.topAvgTicket} value={(c) => formatBRL(avgTicketInCents(c))} />
            <HighlightRow icon={Repeat} label="Mais visitas" client={h.topVisitor} value={(c) => `${c.visits} visitas`} />
            <HighlightRow icon={UserPlus} label="Cliente novo" client={h.newest} value={(c) => formatShortDate(c.firstVisit)} />
            <HighlightRow icon={CalendarClock} label="Mais recente" client={h.mostRecent} value={(c) => formatShortDate(c.lastVisit)} />
            <HighlightRow icon={UserX} label="Inativo" client={h.mostInactive} value={(c) => daysAgo(c.lastVisit)} />
            <HighlightRow icon={CalendarX2} label="Mais faltas" client={h.mostNoShows} value={(c) => `${c.noShows} faltas`} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
