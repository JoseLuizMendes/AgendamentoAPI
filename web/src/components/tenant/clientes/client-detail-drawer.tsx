"use client";

import { CalendarClock, Phone } from "lucide-react";

import type { Appointment, MeResponse } from "@/components/tenant/types";
import { formatBRL, StatusPill } from "@/components/tenant/shared";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isDental } from "@/components/tenant/dental/dental";
import { PatientOdontogram } from "@/components/tenant/dental/odontograma-view";
import { avgTicketInCents, formatShortDate, type Client } from "./clients";

/** Drawer de detalhe do cliente: resumo, histórico e — em tenant DENTAL — odontograma consolidado. */
export function ClientDetailDrawer({
  open,
  onOpenChange,
  client,
  appointments,
  me,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  appointments: Appointment[];
  me: MeResponse;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {client ? (
        <ClientDetailContent
          key={client.phone || client.name}
          client={client}
          appointments={appointments}
          me={me}
        />
      ) : null}
    </Sheet>
  );
}

function ClientDetailContent({
  client,
  appointments,
  me,
}: {
  client: Client;
  appointments: Appointment[];
  me: MeResponse;
}) {
  const clientKey = client.phone || client.name;
  const history = appointments
    .filter((a) => (a.customerPhone || a.customerName) === clientKey)
    .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));

  return (
    <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
      <SheetHeader>
        <SheetTitle className="font-display text-2xl tracking-wide">{client.name}</SheetTitle>
        <SheetDescription className="sr-only">Ficha do cliente: resumo, histórico e odontograma</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-6">
        <div className="space-y-3">
          {client.phone ? (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="text-muted-foreground size-4 shrink-0" />
              <span className="tabular-nums">{client.phone}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Visitas" value={String(client.visits)} />
            <Stat label="Total" value={formatBRL(client.totalInCents)} />
            <Stat label="Ticket médio" value={formatBRL(avgTicketInCents(client))} />
            <Stat label="Última visita" value={formatShortDate(client.lastVisit)} />
          </div>
        </div>

        {isDental(me) ? (
          <section className="space-y-2 border-t pt-5">
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Odontograma consolidado</p>
            <PatientOdontogram phone={client.phone} />
          </section>
        ) : null}

        <section className="space-y-2 border-t pt-5">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Histórico</p>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem agendamentos.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="text-muted-foreground size-4 shrink-0" />
                    <span>
                      {new Date(a.startTime).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      <span className="text-muted-foreground"> · {a.service?.name ?? "Serviço"}</span>
                    </span>
                  </span>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SheetContent>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">{label}</p>
      <p className="font-display text-lg tracking-wide">{value}</p>
    </div>
  );
}
