"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, DentalProcedure, Tooth } from "@/components/tenant/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DENTAL_PROCEDURES, PERMANENT_LOWER, PERMANENT_UPPER, PROCEDURE_LABEL } from "./dental";

/**
 * Odontograma clicável (notação FDI). Lê os dentes da consulta, deixa marcar/desmarcar cada dente
 * com o "procedimento ativo" e salva via `PUT /appointments/:id/teeth` (replace-on-edit).
 * Gating de vertical é responsabilidade de quem renderiza (só DENTAL).
 */
export function OdontogramaPicker({ appointmentId, onSaved }: { appointmentId: number; onSaved?: () => void }) {
  const teethQuery = useQuery({
    queryKey: ["appointment", appointmentId, "teeth"],
    queryFn: () => apiRequest<Appointment>(`/appointments/${appointmentId}`).then((a) => a.teeth ?? []),
  });

  if (teethQuery.isPending) return <Skeleton className="h-40 w-full" />;
  if (teethQuery.isError) return <p className="text-destructive text-sm">Não foi possível carregar o odontograma.</p>;

  return <PickerInner key={appointmentId} appointmentId={appointmentId} initial={teethQuery.data} onSaved={onSaved} />;
}

function PickerInner({
  appointmentId,
  initial,
  onSaved,
}: {
  appointmentId: number;
  initial: Tooth[];
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [chart, setChart] = useState<Map<number, DentalProcedure>>(
    () => new Map(initial.map((t) => [t.toothFdi, t.procedure])),
  );
  const [active, setActive] = useState<DentalProcedure>("AVALIACAO");

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<Tooth[]>(`/appointments/${appointmentId}/teeth`, {
        method: "PUT",
        body: { teeth: [...chart.entries()].map(([toothFdi, procedure]) => ({ toothFdi, procedure })) },
      }),
    onSuccess: () => {
      toast.success("Odontograma salvo");
      queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId, "teeth"] });
      onSaved?.();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar o odontograma"),
  });

  function toggle(fdi: number) {
    setChart((prev) => {
      const next = new Map(prev);
      if (next.get(fdi) === active) next.delete(fdi);
      else next.set(fdi, active);
      return next;
    });
  }

  const marked = [...chart.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="odo-proc" className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Procedimento ativo
        </label>
        <Select value={active} onValueChange={(v) => setActive(v as DentalProcedure)}>
          <SelectTrigger id="odo-proc" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DENTAL_PROCEDURES.map((p) => (
              <SelectItem key={p} value={p}>
                {PROCEDURE_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Clique num dente para marcar/desmarcar com o procedimento ativo.
        </p>
      </div>

      <div className="space-y-1.5 overflow-x-auto py-1" role="group" aria-label="Odontograma (notação FDI)">
        <ToothRow teeth={PERMANENT_UPPER} chart={chart} onToggle={toggle} />
        <ToothRow teeth={PERMANENT_LOWER} chart={chart} onToggle={toggle} />
      </div>

      {marked.length > 0 ? (
        <ul className="space-y-1">
          {marked.map(([fdi, procedure]) => (
            <li key={fdi} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-mono">{fdi}</span>
                <span className="text-muted-foreground"> · {PROCEDURE_LABEL[procedure]}</span>
              </span>
              <button
                type="button"
                onClick={() => setChart((prev) => {
                  const next = new Map(prev);
                  next.delete(fdi);
                  return next;
                })}
                className="text-muted-foreground hover:text-destructive focus-visible:ring-ring rounded text-xs focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`Remover dente ${fdi}`}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum dente marcado.</p>
      )}

      <Button className="w-full" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        {saveMutation.isPending ? "Salvando..." : "Salvar odontograma"}
      </Button>
    </div>
  );
}

function ToothRow({
  teeth,
  chart,
  onToggle,
}: {
  teeth: readonly number[];
  chart: Map<number, DentalProcedure>;
  onToggle: (fdi: number) => void;
}) {
  return (
    <div className="flex justify-center gap-0.5">
      {teeth.map((fdi, i) => {
        const procedure = chart.get(fdi);
        const selected = procedure !== undefined;
        return (
          <button
            key={fdi}
            type="button"
            onClick={() => onToggle(fdi)}
            aria-pressed={selected}
            aria-label={selected ? `Dente ${fdi}: ${PROCEDURE_LABEL[procedure]}` : `Dente ${fdi}`}
            title={selected ? PROCEDURE_LABEL[procedure] : `Dente ${fdi}`}
            className={cn(
              "flex h-8 w-5 shrink-0 items-center justify-center rounded-md border font-mono text-[9px] transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
              i === 8 ? "ml-2" : "",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground hover:bg-accent focus-visible:ring-ring",
            )}
          >
            {fdi}
          </button>
        );
      })}
    </div>
  );
}
