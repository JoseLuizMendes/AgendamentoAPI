"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Plus, RefreshCw } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { useTenant } from "@/components/tenant/tenant-context";
import { DAYS, EmptyState } from "@/components/tenant/shared";
import type { TenantSettings } from "@/components/tenant/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HorariosPage() {
  const { hours, reloadHours, settings, reloadSettings } = useTenant();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [isOff, setIsOff] = useState(false);

  const createHoursMutation = useMutation({
    mutationFn: (body: { dayOfWeek: number; openTime: string; closeTime: string; isOff?: boolean }) =>
      apiRequest("/hours", { method: "POST", body }),
    onSuccess: async () => {
      toast.success(`Horário de ${DAYS[dayOfWeek]} salvo`);
      await reloadHours();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro inesperado"),
  });

  function createHours() {
    createHoursMutation.mutate({ dayOfWeek, openTime, closeTime, isOff: isOff || undefined });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-display text-xl tracking-wide">Horário de funcionamento</CardTitle>
            <CardDescription>Defina abertura e fechamento por dia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dow">Dia da semana</Label>
              <NativeSelect id="dow" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="open">Abre</Label>
                <Input id="open" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} disabled={isOff} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close">Fecha</Label>
                <Input id="close" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} disabled={isOff} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isOff} onChange={(e) => setIsOff(e.target.checked)} className="accent-primary size-4" />
              Fechado neste dia
            </label>
            <Button onClick={createHours} disabled={createHoursMutation.isPending} className="w-full">
              <Plus className="size-4" /> {createHoursMutation.isPending ? "Salvando..." : "Salvar horário"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-display text-xl tracking-wide">Semana</CardTitle>
              <Button variant="ghost" size="sm" onClick={reloadHours}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {hours.length === 0 ? (
              <EmptyState icon={Clock}>Nenhum horário configurado.</EmptyState>
            ) : (
              DAYS.map((dayName, idx) => {
                const h = hours.find((x) => x.dayOfWeek === idx);
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${h ? "" : "opacity-50"}`}
                  >
                    <span className="font-medium">{dayName}</span>
                    <span className="text-muted-foreground font-mono">
                      {!h ? "—" : h.isOff ? "Fechado" : `${h.openTime} – ${h.closeTime}`}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <TriageSettingsCard
        key={`${settings.statusPromptAfterStartMin}-${settings.overdueAfterEndMin}`}
        initial={settings}
        onSaved={reloadSettings}
      />
    </div>
  );
}

/**
 * Limiares da triagem de status (o dono define os tempos). Keyed pelos valores
 * iniciais → remonta com os valores corretos quando /settings carrega.
 */
function TriageSettingsCard({ initial, onSaved }: { initial: TenantSettings; onSaved: () => Promise<void> }) {
  const [promptMin, setPromptMin] = useState(String(initial.statusPromptAfterStartMin));
  const [overdueMin, setOverdueMin] = useState(String(initial.overdueAfterEndMin));

  const saveMutation = useMutation({
    mutationFn: (body: { statusPromptAfterStartMin: number; overdueAfterEndMin: number }) =>
      apiRequest("/settings", { method: "PATCH", body }),
    onSuccess: async () => {
      toast.success("Triagem atualizada");
      await onSaved();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar"),
  });

  function save() {
    const p = Number(promptMin);
    const o = Number(overdueMin);
    if (!Number.isInteger(p) || p < 0 || p > 1440) return toast.error("Minutos após o início inválidos (0–1440)");
    if (!Number.isInteger(o) || o < 0 || o > 1440) return toast.error("Minutos após o fim inválidos (0–1440)");
    saveMutation.mutate({ statusPromptAfterStartMin: p, overdueAfterEndMin: o });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Triagem de status</CardTitle>
        <CardDescription>
          Quando cobrar a definição do status de um atendimento que já aconteceu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prompt-min">Aguardando após o início (min)</Label>
            <Input
              id="prompt-min"
              type="number"
              min={0}
              max={1440}
              value={promptMin}
              onChange={(e) => setPromptMin(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Passado esse tempo do início, o agendamento pede definição de status.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overdue-min">Vira “passado” após o fim (min)</Label>
            <Input
              id="overdue-min"
              type="number"
              min={0}
              max={1440}
              value={overdueMin}
              onChange={(e) => setOverdueMin(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Sem resolução depois disso, o agendamento é sinalizado como atrasado.
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={saveMutation.isPending} className="w-full sm:w-auto">
          {saveMutation.isPending ? "Salvando..." : "Salvar triagem"}
        </Button>
      </CardContent>
    </Card>
  );
}
