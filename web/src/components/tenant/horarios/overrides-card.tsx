"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarOff, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/tenant/tenant-context";
import { EmptyState } from "@/components/tenant/shared";
import { paginate } from "@/lib/paginate";
import { upcomingOverrides } from "./overrides-list";
import type { BusinessDateOverride } from "@/components/tenant/types";

const PAGE_SIZE = 5;
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { HourPicker } from "@/components/ui/hour-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

/** Exceções de data (feriados / horário especial) — CRUD sobre /overrides. */
export function OverridesCard({ className }: { className?: string }) {
  const { overrides, reloadOverrides } = useTenant();
  const [editing, setEditing] = useState<BusinessDateOverride | null>(null);
  const [page, setPage] = useState(1);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/overrides/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Exceção removida");
      await reloadOverrides();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao remover"),
  });

  // Oculta exceções já vencidas (decisão 2026-06-19; ver overrides-list.ts) e pagina o resto.
  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = upcomingOverrides(overrides, today);
  const { items, page: currentPage, pageCount } = paginate(upcoming, page, PAGE_SIZE);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Exceções de data</CardTitle>
        <CardDescription>Feriados e dias com horário especial.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Keyed por id (ou "new") → remonta com os valores certos ao entrar/sair de edição,
            sem useEffect de sync. */}
        <OverrideForm key={editing?.id ?? "new"} initial={editing} onDone={() => setEditing(null)} />

        <div className="flex flex-1 flex-col border-t pt-3">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarOff}>Nenhuma exceção futura.</EmptyState>
          ) : (
            <ul className="flex-1 space-y-2">
              {items.map((o) => (
                <li
                  key={o.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                    editing?.id === o.id && "border-primary",
                  )}
                >
                  <span className="min-w-0 truncate">
                    <span className="font-mono">{format(new Date(`${o.date}T00:00:00`), "dd/MM/yyyy")}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {o.isOff || !o.openTime ? "Fechado" : `${o.openTime}–${o.closeTime}`}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setEditing(o)}
                      aria-label="Editar exceção"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Excluir exceção"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir exceção</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remover a exceção dessa data? O dia volta ao horário normal da semana.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              if (editing?.id === o.id) setEditing(null);
                              deleteMutation.mutate(o.id);
                            }}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pageCount > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-muted-foreground font-mono text-xs">
                Página {currentPage} de {pageCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                aria-label="Próxima página"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Form de exceção (criar ou editar). Remontado por `key` no pai → estado inicial fresco de
 * `initial`, sem useEffect de sync. Ao editar, a data fica travada (o PUT não altera a data).
 */
function OverrideForm({ initial, onDone }: { initial: BusinessDateOverride | null; onDone: () => void }) {
  const { reloadOverrides } = useTenant();
  const isEdit = initial != null;
  const [date, setDate] = useState<Date | undefined>(
    initial ? new Date(`${initial.date}T00:00:00`) : undefined,
  );
  const [closed, setClosed] = useState(initial ? initial.isOff || !initial.openTime : true);
  const [openTime, setOpenTime] = useState(initial?.openTime ?? "");
  const [closeTime, setCloseTime] = useState(initial?.closeTime ?? "");
  const [calOpen, setCalOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new ApiError("Escolha uma data", 400);
      const body: { date?: string; isOff?: boolean; openTime?: string; closeTime?: string } = {};
      if (!isEdit) body.date = format(date, "yyyy-MM-dd");
      if (closed) {
        body.isOff = true;
      } else {
        if (!openTime || !closeTime) throw new ApiError("Informe abertura e fechamento", 400);
        body.isOff = false;
        body.openTime = openTime;
        body.closeTime = closeTime;
      }
      if (initial) {
        await apiRequest(`/overrides/${initial.id}`, { method: "PUT", body });
      } else {
        await apiRequest("/overrides", { method: "POST", body });
      }
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Exceção atualizada" : "Exceção salva");
      await reloadOverrides();
      onDone();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar exceção"),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Data</Label>
        {isEdit ? (
          <p className="text-muted-foreground text-sm">
            <span className="font-mono">{date ? format(date, "dd 'de' MMM yyyy", { locale: ptBR }) : ""}</span>
            <span className="ml-2 text-xs">(trocar data = excluir e recriar)</span>
          </p>
        ) : (
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn("w-full justify-start gap-2 font-normal", !date && "text-muted-foreground")}
              >
                <CalendarOff className="size-4 shrink-0" />
                {date ? format(date, "dd 'de' MMM yyyy", { locale: ptBR }) : "Escolher data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setCalOpen(false);
                }}
                locale={ptBR}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Label className="flex items-center gap-2 text-sm">
        <Checkbox checked={closed} onCheckedChange={(c) => setClosed(!!c)} className="size-4" />
        Fechado neste dia
      </Label>

      {!closed ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Abre</Label>
            <HourPicker value={openTime} onChange={setOpenTime} aria-label="Hora de abertura" />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <HourPicker value={closeTime} onChange={setCloseTime} aria-label="Hora de fechamento" />
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1">
          <Plus className="size-4" />{" "}
          {saveMutation.isPending ? "Salvando..." : isEdit ? "Salvar alteração" : "Adicionar exceção"}
        </Button>
        {isEdit ? (
          <Button type="button" variant="ghost" onClick={onDone} disabled={saveMutation.isPending}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
