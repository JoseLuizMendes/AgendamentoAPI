"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/tenant/tenant-context";
import { EmptyState } from "@/components/tenant/shared";
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
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [closed, setClosed] = useState(true);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [calOpen, setCalOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new ApiError("Escolha uma data", 400);
      const body: { date: string; isOff?: boolean; openTime?: string; closeTime?: string } = {
        date: format(date, "yyyy-MM-dd"),
      };
      if (closed) {
        body.isOff = true;
      } else {
        if (!openTime || !closeTime) throw new ApiError("Informe abertura e fechamento", 400);
        body.openTime = openTime;
        body.closeTime = closeTime;
      }
      await apiRequest("/overrides", { method: "POST", body });
    },
    onSuccess: async () => {
      toast.success("Exceção salva");
      setDate(undefined);
      setClosed(true);
      setOpenTime("");
      setCloseTime("");
      await reloadOverrides();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar exceção"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/overrides/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Exceção removida");
      await reloadOverrides();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao remover"),
  });

  const sorted = [...overrides].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Exceções de data</CardTitle>
        <CardDescription>Feriados e dias com horário especial.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Data</Label>
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

        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full">
          <Plus className="size-4" /> {createMutation.isPending ? "Salvando..." : "Adicionar exceção"}
        </Button>

        <div className="space-y-2 border-t pt-3">
          {sorted.length === 0 ? (
            <EmptyState icon={CalendarOff}>Nenhuma exceção cadastrada.</EmptyState>
          ) : (
            sorted.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-mono">{format(new Date(`${o.date}T00:00:00`), "dd/MM/yyyy")}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {o.isOff || !o.openTime ? "Fechado" : `${o.openTime}–${o.closeTime}`}
                  </span>
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
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
                        onClick={() => deleteMutation.mutate(o.id)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
