"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiRequest, ApiError } from "@/lib/api";
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
