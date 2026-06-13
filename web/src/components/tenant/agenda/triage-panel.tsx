"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, CheckCheck } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/tenant/tenant-context";
import { NEXT_STATUS } from "@/components/tenant/shared";
import type { Appointment } from "@/components/tenant/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NEEDS_TRIAGE, phaseOf, type ApptPhase } from "./phase";

const PHASE_TAG: Partial<Record<ApptPhase, { label: string; cls: string }>> = {
  awaiting: { label: "Aguardando", cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  overdue: { label: "Passou", cls: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400" },
};

/**
 * Substituto in-app do lembrete por WhatsApp (Fase A): lista os agendamentos que
 * já passaram do início e seguem sem status definido, para o dono atribuir 1 dos 5.
 * Leitura via React Query (revalida a cada minuto); escrita via useMutation.
 */
export function TriagePanel({ onResolved }: { onResolved: () => void }) {
  const { services, settings } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Avança o "agora" a cada minuto para as fases progredirem.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const pendingQuery = useQuery({
    queryKey: ["appointments", "pending"],
    queryFn: () => apiRequest<Appointment[]>(`/appointments?to=${encodeURIComponent(new Date().toISOString())}`),
    refetchInterval: 60_000,
  });

  const items = useMemo(
    () => (pendingQuery.data ? pendingQuery.data.filter((a) => NEEDS_TRIAGE.has(phaseOf(a, now, settings))) : null),
    [pendingQuery.data, now, settings],
  );

  const resolveMutation = useMutation({
    mutationFn: (v: { id: number; status: string }) =>
      apiRequest(`/appointments/${v.id}`, { method: "PATCH", body: { status: v.status } }),
    onSuccess: () => {
      toast.success("Status definido");
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onResolved();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar"),
  });

  const count = items?.length ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void queryClient.invalidateQueries({ queryKey: ["appointments", "pending"] });
        }}
        className={cn(
          "focus-visible:ring-ring inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
          count > 0
            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label={`Aguardando definição de status: ${count}`}
      >
        <BellRing className="size-4" />
        <span className="hidden sm:inline">Aguardando definição</span>
        {count > 0 ? (
          <span className="bg-amber-500 inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold leading-none text-white tabular-nums">
            {count}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl tracking-wide">Aguardando definição</SheetTitle>
            <SheetDescription>Atribua um status aos atendimentos que já aconteceram.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-2">
            {items === null ? (
              <p className="text-muted-foreground text-sm">Carregando…</p>
            ) : items.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
                <CheckCheck className="size-6" />
                Tudo em dia — nenhum agendamento aguardando.
              </div>
            ) : (
              items.map((a) => {
                const tag = PHASE_TAG[phaseOf(a, now, settings)];
                const service = a.service ?? services.find((s) => s.id === a.serviceId);
                const start = new Date(a.startTime);
                const transitions = NEXT_STATUS[a.status] ?? [];
                const busy = resolveMutation.isPending && resolveMutation.variables?.id === a.id;
                return (
                  <div key={a.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.customerName}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {service?.name ?? "Serviço"} ·{" "}
                          {start.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {tag ? (
                        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", tag.cls)}>
                          {tag.label}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {transitions.map((t) => (
                        <Button
                          key={t.value}
                          variant={t.value === "CANCELED" || t.value === "NO_SHOW" ? "ghost" : "outline"}
                          size="sm"
                          disabled={busy}
                          onClick={() => resolveMutation.mutate({ id: a.id, status: t.value })}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
