"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Pencil, Phone, Tag, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { formatBRL, NEXT_STATUS, StatusPill } from "@/components/tenant/shared";
import type { Appointment, Service } from "@/components/tenant/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { durationLabel, localInputToISO, toLocalInputValue } from "./datetime";
import { DateTimePicker } from "./datetime-picker";
import { useTenant } from "@/components/tenant/tenant-context";
import { isDental } from "@/components/tenant/dental/dental";
import { OdontogramaPicker } from "@/components/tenant/dental/odontograma-picker";

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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* `key` força estado fresco (view/edit + form) a cada agendamento aberto. */}
      {appointment ? (
        <DetailContent key={appointment.id} appointment={appointment} services={services} onChanged={onChanged} />
      ) : null}
    </Sheet>
  );
}

function DetailContent({
  appointment: a,
  services,
  onChanged,
}: {
  appointment: Appointment;
  services: Service[];
  onChanged: () => void;
}) {
  const { me } = useTenant();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [name, setName] = useState(a.customerName);
  const [phone, setPhone] = useState(a.customerPhone);
  const [serviceId, setServiceId] = useState(a.serviceId);
  const [startStr, setStartStr] = useState(toLocalInputValue(new Date(a.startTime)));
  const [endStr, setEndStr] = useState(toLocalInputValue(new Date(a.endTime)));
  const [notes, setNotes] = useState(a.notes ?? "");

  const saveMutation = useMutation({
    mutationFn: (body: {
      customerName: string;
      customerPhone: string;
      serviceId: number;
      startTime: string;
      endTime: string;
      notes?: string;
    }) => apiRequest(`/appointments/${a.id}`, { method: "PATCH", body }),
    onSuccess: () => {
      toast.success("Agendamento atualizado");
      onChanged();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar"),
  });
  const statusMutation = useMutation({
    mutationFn: (status: string) => apiRequest(`/appointments/${a.id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      toast.success("Status atualizado");
      onChanged();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar"),
  });
  const removeMutation = useMutation({
    mutationFn: () => apiRequest(`/appointments/${a.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Agendamento excluído");
      onChanged();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao excluir"),
  });
  const busy = saveMutation.isPending || statusMutation.isPending || removeMutation.isPending;

  const service = a.service ?? services.find((s) => s.id === a.serviceId);
  const start = new Date(a.startTime);
  const end = new Date(a.endTime);
  const transitions = NEXT_STATUS[a.status] ?? [];

  // Trocar o serviço ajusta o fim para a duração padrão dele (ainda editável).
  function onServiceChange(id: number) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc && startStr) {
      setEndStr(toLocalInputValue(new Date(new Date(startStr).getTime() + svc.durationInMinutes * 60_000)));
    }
  }

  function save() {
    if (!name.trim()) return toast.error("Informe o cliente");
    if (phone.trim().length < 6) return toast.error("Telefone deve ter ao menos 6 dígitos");
    if (!serviceId) return toast.error("Selecione um serviço");
    if (!startStr || !endStr) return toast.error("Informe início e fim");
    if (new Date(endStr) <= new Date(startStr)) return toast.error("O fim deve ser após o início");

    saveMutation.mutate({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      serviceId,
      startTime: localInputToISO(startStr),
      endTime: localInputToISO(endStr),
      notes: notes.trim(),
    });
  }

  function updateStatus(status: string) {
    statusMutation.mutate(status);
  }

  function remove() {
    removeMutation.mutate();
    setConfirmOpen(false);
  }

  return (
    <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
      <SheetHeader>
        <div className="flex items-center justify-between gap-3 pr-8">
          <SheetTitle className="font-display text-2xl tracking-wide">
            {editing ? "Editar agendamento" : a.customerName}
          </SheetTitle>
          {editing ? null : <StatusPill status={a.status} />}
        </div>
        <SheetDescription className="sr-only">Detalhes, edição e ações do agendamento</SheetDescription>
      </SheetHeader>

      {editing ? (
        <div className="flex-1 space-y-4 overflow-y-auto px-6">
          <div className="space-y-2">
            <Label htmlFor="e-name">Cliente</Label>
            <Input id="e-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-phone">Telefone</Label>
            <Input id="e-phone" className="h-11" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-svc">Serviço</Label>
            <Select value={String(serviceId)} onValueChange={(v) => onServiceChange(Number(v))}>
              <SelectTrigger id="e-svc" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} — {formatBRL(s.priceInCents)} · {s.durationInMinutes}min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="e-start">Início</Label>
              <DateTimePicker id="e-start" value={startStr} onChange={setStartStr} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-end">Fim</Label>
              <DateTimePicker id="e-end" value={endStr} onChange={setEndStr} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-notes">Observações</Label>
            <Textarea
              id="e-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferências, detalhes…"
              rows={3}
            />
          </div>
        </div>
      ) : (
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

          {a.notes ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
            </div>
          ) : null}

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

          {isDental(me) ? (
            <section className="space-y-3 border-t pt-5">
              <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Odontograma</p>
              <OdontogramaPicker appointmentId={a.id} />
            </section>
          ) : null}
        </div>
      )}

      {editing ? (
        <div className="flex gap-2 border-t p-6">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={busy} onClick={save}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 border-t p-6">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Editar
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive flex-1" disabled={busy}>
                <Trash2 className="size-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir agendamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={remove}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </SheetContent>
  );
}
