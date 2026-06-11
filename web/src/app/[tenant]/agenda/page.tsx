"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, CalendarDays, Phone, Plus, RefreshCw } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { useTenant } from "@/components/tenant/tenant-context";
import { EmptyState, formatBRL, NEXT_STATUS, StatusPill } from "@/components/tenant/shared";
import type { Appointment } from "@/components/tenant/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgendaPage() {
  const { services } = useTenant();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceId, setServiceId] = useState(0);
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [saving, setSaving] = useState(false);

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) return router.replace("/login");
    toast.error(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Erro inesperado");
  }

  async function loadAppointments() {
    try {
      setAppointments(await apiRequest<Appointment[]>("/appointments"));
    } catch (err) {
      handleError(err);
    }
  }

  useEffect(() => {
    void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Serviço efetivo: o escolhido, ou o primeiro da lista como padrão (derivado,
  // sem effect de sincronização).
  const effectiveServiceId = serviceId || services[0]?.id || 0;

  async function createAppointment() {
    if (!customerName.trim()) return toast.error("Informe o cliente");
    if (!effectiveServiceId) return toast.error("Selecione um serviço");
    if (!startTimeLocal) return toast.error("Informe o início");

    setSaving(true);
    try {
      await apiRequest("/appointments", {
        method: "POST",
        body: {
          customerName: customerName.trim(),
          customerPhone,
          serviceId: effectiveServiceId,
          startTime: new Date(startTimeLocal).toISOString(),
        },
      });
      toast.success("Agendamento criado");
      setCustomerName("");
      setCustomerPhone("");
      setStartTimeLocal("");
      await loadAppointments();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      await apiRequest(`/appointments/${id}`, { method: "PATCH", body: { status } });
      toast.success("Status atualizado");
      await loadAppointments();
    } catch (err) {
      handleError(err);
    }
  }

  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const sorted = useMemo(
    () => [...appointments].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime)),
    [appointments],
  );

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-display text-xl tracking-wide">Novo agendamento</CardTitle>
            <CardDescription>Reserve um horário para um cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Cliente</Label>
              <Input id="cust-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Telefone</Label>
              <Input id="cust-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appt-svc">Serviço</Label>
              <NativeSelect
                id="appt-svc"
                value={effectiveServiceId}
                onChange={(e) => setServiceId(Number(e.target.value))}
                disabled={services.length === 0}
              >
                {services.length === 0 ? (
                  <option value={0}>Cadastre um serviço primeiro</option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatBRL(s.priceInCents)} · {s.durationInMinutes}min
                    </option>
                  ))
                )}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appt-start">Início</Label>
              <Input id="appt-start" type="datetime-local" value={startTimeLocal} onChange={(e) => setStartTimeLocal(e.target.value)} />
            </div>
            <Button onClick={createAppointment} disabled={saving || services.length === 0} className="w-full">
              <Plus className="size-4" /> {saving ? "Agendando..." : "Agendar"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-display text-xl tracking-wide">Agenda ({appointments.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadAppointments}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sorted.length === 0 ? (
              <EmptyState icon={CalendarDays}>Nenhum agendamento ainda.</EmptyState>
            ) : (
              sorted.map((a) => {
                const svc = a.service ?? serviceById.get(a.serviceId);
                const transitions = NEXT_STATUS[a.status] ?? [];
                return (
                  <div key={a.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a.customerName}</p>
                        <p className="text-muted-foreground mt-0.5 text-sm">{svc?.name ?? "Serviço removido"}</p>
                      </div>
                      <StatusPill status={a.status} />
                    </div>
                    <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" />
                        {new Date(a.startTime).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {a.customerPhone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="size-3.5" />
                          {a.customerPhone}
                        </span>
                      ) : null}
                    </div>
                    {transitions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                        {transitions.map((t) => (
                          <Button
                            key={t.value}
                            variant={t.value === "CANCELED" || t.value === "NO_SHOW" ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => updateStatus(a.id, t.value)}
                          >
                            {t.label}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
