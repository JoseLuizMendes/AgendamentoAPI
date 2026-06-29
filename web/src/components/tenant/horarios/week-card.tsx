"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/tenant/tenant-context";
import { DAYS } from "@/components/tenant/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

/** Visão da semana: seleciona o dia (carrega no editor) e exclui o dia configurado. */
export function WeekCard({
  selectedDay,
  onSelectDay,
  className,
}: {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  className?: string;
}) {
  const { hours, reloadHours } = useTenant();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/hours/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Horário removido");
      await reloadHours();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao remover"),
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-display text-xl tracking-wide">Semana</CardTitle>
          <Button variant="ghost" size="sm" onClick={reloadHours} aria-label="Recarregar">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {DAYS.map((dayName, idx) => {
          const h = hours.find((x) => x.dayOfWeek === idx);
          const selected = idx === selectedDay;
          return (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                selected ? "border-foreground/40 bg-muted/60" : "hover:bg-muted/30",
                !h && "opacity-70",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(idx)}
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
              >
                <span className="font-medium">{dayName}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {!h ? "—" : h.isOff ? "Fechado" : `${h.openTime} – ${h.closeTime}`}
                </span>
                {h && !h.isOff && h.breaks.length > 0 ? (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {h.breaks.map((b) => (
                      <span
                        key={b.id}
                        className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {b.label ? `${b.label} · ` : ""}
                        {b.startTime}–{b.endTime}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
              {h ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label={`Excluir horário de ${dayName}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir horário de {dayName}</AlertDialogTitle>
                      <AlertDialogDescription>
                        O dia volta a “não configurado”. Você pode recriá-lo depois.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMutation.mutate(h.id)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
