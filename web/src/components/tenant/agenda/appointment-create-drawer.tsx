"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { formatBRL } from "@/components/tenant/shared";
import type { Service } from "@/components/tenant/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { durationLabel, localInputToISO, toLocalInputValue } from "./datetime";

export function AppointmentCreateDrawer({
  open,
  onOpenChange,
  start,
  end,
  services,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  start: Date | null;
  end: Date | null;
  services: Service[];
  onCreated: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* `key` pela seleção → form fresco a cada novo arraste, sem efeito de reset. */}
      {start && end ? (
        <CreateContent
          key={`${start.getTime()}-${end.getTime()}`}
          start={start}
          end={end}
          services={services}
          onCreated={onCreated}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function CreateContent({
  start,
  end,
  services,
  onCreated,
  onClose,
}: {
  start: Date;
  end: Date;
  services: Service[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? 0);
  const [startStr, setStartStr] = useState(toLocalInputValue(start));
  const [endStr, setEndStr] = useState(toLocalInputValue(end));

  const createMutation = useMutation({
    mutationFn: (body: {
      customerName: string;
      customerPhone: string;
      serviceId: number;
      startTime: string;
      endTime: string;
    }) => apiRequest("/appointments", { method: "POST", body }),
    onSuccess: () => {
      toast.success("Agendamento criado");
      onCreated();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao criar agendamento"),
  });

  const startDate = startStr ? new Date(startStr) : null;
  const endDate = endStr ? new Date(endStr) : null;

  function save() {
    if (!name.trim()) return toast.error("Informe o cliente");
    if (phone.trim().length < 6) return toast.error("Telefone deve ter ao menos 6 dígitos");
    if (!serviceId) return toast.error("Selecione um serviço");
    if (!startStr || !endStr) return toast.error("Informe início e fim");
    if (new Date(endStr) <= new Date(startStr)) return toast.error("O fim deve ser após o início");

    createMutation.mutate({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      serviceId,
      startTime: localInputToISO(startStr),
      endTime: localInputToISO(endStr),
    });
  }

  return (
    <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
      <SheetHeader>
        <SheetTitle className="font-display text-xl tracking-wide">Novo agendamento</SheetTitle>
        <SheetDescription>
          {startDate && endDate
            ? `${startDate.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${durationLabel(startDate, endDate)}`
            : "Reserve um horário."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-6">
        <div className="space-y-2">
          <Label htmlFor="c-name">Cliente</Label>
          <Input id="c-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-phone">Telefone</Label>
          <Input id="c-phone" className="h-11" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-svc">Serviço</Label>
          <NativeSelect id="c-svc" className="h-11" value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))} disabled={services.length === 0}>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="c-start">Início</Label>
            <Input id="c-start" type="datetime-local" className="h-11" value={startStr} onChange={(e) => setStartStr(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-end">Fim</Label>
            <Input id="c-end" type="datetime-local" className="h-11" value={endStr} onChange={(e) => setEndStr(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t p-6">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={save} disabled={createMutation.isPending || services.length === 0}>
          <Plus className="size-4" /> {createMutation.isPending ? "Salvando..." : "Agendar"}
        </Button>
      </div>
    </SheetContent>
  );
}
