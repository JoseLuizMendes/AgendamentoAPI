"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Plus, RefreshCw } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { useTenant } from "@/components/tenant/tenant-context";
import { DAYS, EmptyState } from "@/components/tenant/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HorariosPage() {
  const { hours, reloadHours } = useTenant();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [isOff, setIsOff] = useState(false);
  const [saving, setSaving] = useState(false);

  async function createHours() {
    setSaving(true);
    try {
      await apiRequest("/hours", {
        method: "POST",
        body: { dayOfWeek, openTime, closeTime, isOff: isOff || undefined },
      });
      toast.success(`Horário de ${DAYS[dayOfWeek]} salvo`);
      await reloadHours();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
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
            <Button onClick={createHours} disabled={saving} className="w-full">
              <Plus className="size-4" /> {saving ? "Salvando..." : "Salvar horário"}
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
    </div>
  );
}
