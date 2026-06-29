"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DAYS } from "@/components/tenant/shared";
import type { BusinessHours } from "@/components/tenant/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { HourPicker } from "@/components/ui/hour-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Editor do dia selecionado. O pai remonta este componente via `key` (dia + valores),
 * então o estado inicial vem fresco de `current` sem useEffect de sincronização.
 */
export function DayEditorCard({
  dayOfWeek,
  current,
  allHours,
  onReload,
  className,
}: {
  dayOfWeek: number;
  current?: BusinessHours;
  allHours: BusinessHours[];
  onReload: () => Promise<void>;
  className?: string;
}) {
  const [openTime, setOpenTime] = useState(current?.openTime ?? "");
  const [closeTime, setCloseTime] = useState(current?.closeTime ?? "");
  const [isOff, setIsOff] = useState(current?.isOff ?? false);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);

  const [brkStart, setBrkStart] = useState("");
  const [brkEnd, setBrkEnd] = useState("");
  const [brkLabel, setBrkLabel] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isOff) {
        if (!openTime || !closeTime) throw new ApiError("Informe abertura e fechamento", 400);
        if (toMinutes(closeTime) <= toMinutes(openTime))
          throw new ApiError("O fechamento deve ser após a abertura", 400);
      }
      const payload = { openTime: openTime || "00:00", closeTime: closeTime || "00:00", isOff };

      if (current) {
        await apiRequest(`/hours/${current.id}`, { method: "PUT", body: payload });
      } else {
        await apiRequest("/hours", { method: "POST", body: { dayOfWeek, ...payload } });
      }
      // Copiar abre/fecha/fechado para os dias selecionados (PUT se existe, senão POST).
      for (const target of copyTargets) {
        const existing = allHours.find((h) => h.dayOfWeek === target);
        if (existing) {
          await apiRequest(`/hours/${existing.id}`, { method: "PUT", body: payload });
        } else {
          await apiRequest("/hours", { method: "POST", body: { dayOfWeek: target, ...payload } });
        }
      }
    },
    onSuccess: async () => {
      toast.success(`Horário de ${DAYS[dayOfWeek]} salvo`);
      setCopyTargets([]);
      await onReload();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar"),
  });

  const addBreakMutation = useMutation({
    mutationFn: async () => {
      if (!current) throw new ApiError("Salve o dia antes de adicionar intervalos", 400);
      if (!brkStart || !brkEnd) throw new ApiError("Informe início e fim do intervalo", 400);
      if (toMinutes(brkEnd) <= toMinutes(brkStart))
        throw new ApiError("O fim do intervalo deve ser após o início", 400);
      const body: { startTime: string; endTime: string; label?: string } = {
        startTime: brkStart,
        endTime: brkEnd,
      };
      if (brkLabel.trim()) body.label = brkLabel.trim();
      await apiRequest(`/hours/${current.id}/breaks`, { method: "POST", body });
    },
    onSuccess: async () => {
      toast.success("Intervalo adicionado");
      setBrkStart("");
      setBrkEnd("");
      setBrkLabel("");
      await onReload();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao adicionar intervalo"),
  });

  const removeBreakMutation = useMutation({
    mutationFn: (breakId: number) =>
      apiRequest(`/hours/${current?.id}/breaks/${breakId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Intervalo removido");
      await onReload();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao remover intervalo"),
  });

  function toggleCopy(day: number) {
    setCopyTargets((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">{DAYS[dayOfWeek]}</CardTitle>
        <CardDescription>Abertura, fechamento e intervalos do dia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Abre</Label>
            <HourPicker value={openTime} onChange={setOpenTime} disabled={isOff} aria-label="Hora de abertura" />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <HourPicker value={closeTime} onChange={setCloseTime} disabled={isOff} aria-label="Hora de fechamento" />
          </div>
        </div>

        <Label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isOff} onCheckedChange={(c) => setIsOff(!!c)} className="size-4" />
          Fechado neste dia
        </Label>

        {!isOff ? (
          <div className="space-y-2">
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Intervalos</p>
            {current && current.breaks.length > 0 ? (
              <ul className="space-y-1.5">
                {current.breaks.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-mono">
                        {b.startTime}–{b.endTime}
                      </span>
                      {b.label ? <span className="text-muted-foreground"> · {b.label}</span> : null}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      disabled={removeBreakMutation.isPending}
                      onClick={() => removeBreakMutation.mutate(b.id)}
                      aria-label="Remover intervalo"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            {current ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <HourPicker value={brkStart} onChange={setBrkStart} className="w-28" aria-label="Início do intervalo" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fim</Label>
                  <HourPicker value={brkEnd} onChange={setBrkEnd} className="w-28" aria-label="Fim do intervalo" />
                </div>
                <div className="min-w-28 flex-1 space-y-1">
                  <Label className="text-xs">Rótulo</Label>
                  <Input
                    value={brkLabel}
                    onChange={(e) => setBrkLabel(e.target.value)}
                    placeholder="Almoço, Indisponível…"
                  />
                </div>
                <Button variant="outline" disabled={addBreakMutation.isPending} onClick={() => addBreakMutation.mutate()}>
                  <Plus className="size-4" /> Intervalo
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Salve o dia para adicionar intervalos.</p>
            )}
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Copiar para</p>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) =>
              i === dayOfWeek ? null : (
                <button
                  key={i}
                  type="button"
                  aria-pressed={copyTargets.includes(i)}
                  onClick={() => toggleCopy(i)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    copyTargets.includes(i)
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {d.slice(0, 3)}
                </button>
              ),
            )}
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
          <Plus className="size-4" />{" "}
          {saveMutation.isPending ? "Salvando..." : current ? "Salvar alterações" : "Salvar horário"}
        </Button>
      </CardContent>
    </Card>
  );
}
