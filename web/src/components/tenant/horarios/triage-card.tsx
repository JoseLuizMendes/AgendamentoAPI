"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TenantSettings } from "@/components/tenant/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Limiares da triagem de status (o dono define os tempos). Keyed pelos valores
 * iniciais no pai → remonta com os valores corretos quando /settings carrega.
 */
export function TriageSettingsCard({
  initial,
  onSaved,
  className,
}: {
  initial: TenantSettings;
  onSaved: () => Promise<void>;
  className?: string;
}) {
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
    if (!Number.isInteger(p) || p < 0 || p > 1440)
      return toast.error("Minutos após o início inválidos (0–1440)");
    if (!Number.isInteger(o) || o < 0 || o > 1440)
      return toast.error("Minutos após o fim inválidos (0–1440)");
    saveMutation.mutate({ statusPromptAfterStartMin: p, overdueAfterEndMin: o });
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Triagem de status</CardTitle>
        <CardDescription>
          Quando cobrar a definição do status de um atendimento que já aconteceu.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
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

        {/* Legenda das fases (espelha o ciclo de vida da agenda — phase.ts). Cores via tokens
            --color-phase-*; descrições refletem os limiares acima em tempo real. */}
        <div className="mt-auto space-y-2.5 border-t pt-4">
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            Fases do atendimento
          </p>
          <LegendRow dotClass="border border-foreground/40" label="Futuro" desc="ainda não começou" />
          <LegendRow
            color="var(--primary)"
            label="Em andamento"
            desc="começou, dentro da janela inicial"
          />
          <LegendRow
            color="var(--color-phase-awaiting)"
            label="Aguardando definição"
            desc={`após ${promptMin || "0"} min do início`}
          />
          <LegendRow
            color="var(--color-phase-overdue)"
            label="Atrasado"
            desc={`após ${overdueMin || "0"} min do fim sem resolução`}
          />
          <LegendRow
            dotClass="bg-muted-foreground opacity-50"
            label="Resolvido"
            desc="status definido (concluído, faltou, cancelado)"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Linha da legenda: bolinha colorida (token) + rótulo + descrição. */
function LegendRow({
  label,
  desc,
  color,
  dotClass,
}: {
  label: string;
  desc: string;
  color?: string;
  dotClass?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span
        className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dotClass)}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span className="leading-snug">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground"> — {desc}</span>
      </span>
    </div>
  );
}
