"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Phone, Tag, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { NEXT_STATUS, StatusPill } from "@/components/tenant/shared";
import type { Appointment, Service } from "@/components/tenant/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { durationLabel } from "./datetime";

export function AppointmentDetailDrawer({
  open,
  onOpenChange,
  appointment,
  services,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  services: Service[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  if (!appointment) return <Sheet open={open} onOpenChange={onOpenChange} />;

  const a = appointment;
  const service = a.service ?? services.find((s) => s.id === a.serviceId);
  const start = new Date(a.startTime);
  const end = new Date(a.endTime);
  const transitions = NEXT_STATUS[a.status] ?? [];

  async function updateStatus(status: string) {
    setBusy(true);
    try {
      await apiRequest(`/appointments/${a.id}`, { method: "PATCH", body: { status } });
      toast.success("Status atualizado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Excluir este agendamento?")) return;
    setBusy(true);
    try {
      await apiRequest(`/appointments/${a.id}`, { method: "DELETE" });
      toast.success("Agendamento excluído");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao excluir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3 pr-8">
            <SheetTitle className="font-display text-2xl tracking-wide">{a.customerName}</SheetTitle>
            <StatusPill status={a.status} />
          </div>
          <SheetDescription className="sr-only">Detalhes e ações do agendamento</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Tag className="text-muted-foreground size-4 shrink-0" />
              <span>{service?.name ?? "Serviço removido"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CalendarClock className="text-muted-foreground size-4 shrink-0" />
              <span>
                {start.toLocaleString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" – "}
                {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                <span className="text-muted-foreground"> · {durationLabel(start, end)}</span>
              </span>
            </div>
            {a.customerPhone ? (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="text-muted-foreground size-4 shrink-0" />
                <span>{a.customerPhone}</span>
              </div>
            ) : null}
          </div>

          {transitions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Mudar status</p>
              <div className="flex flex-wrap gap-2">
                {transitions.map((t) => (
                  <Button
                    key={t.value}
                    variant={t.value === "CANCELED" || t.value === "NO_SHOW" ? "ghost" : "outline"}
                    size="sm"
                    disabled={busy}
                    onClick={() => updateStatus(t.value)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t p-6">
          <Button variant="ghost" className="text-destructive hover:text-destructive w-full" disabled={busy} onClick={remove}>
            <Trash2 className="size-4" /> Excluir agendamento
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
