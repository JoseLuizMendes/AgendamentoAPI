"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Clock, Plus, RefreshCw, Tag, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { paginate } from "@/lib/paginate";
import { useTenant } from "@/components/tenant/tenant-context";
import { EmptyState, formatBRL } from "@/components/tenant/shared";
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

const PAGE_SIZE = 5;

/** Lista de serviços: seleciona (carrega no editor), exclui e pagina. Espelha `week-card`. */
export function ServiceListCard({
  selectedId,
  onSelect,
  className,
}: {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  className?: string;
}) {
  const { services, reloadServices } = useTenant();
  const [page, setPage] = useState(1);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/services/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Serviço removido");
      await reloadServices();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao remover"),
  });

  const sorted = [...services].sort((a, b) => a.name.localeCompare(b.name));
  const { items, page: currentPage, pageCount } = paginate(sorted, page, PAGE_SIZE);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-display text-xl tracking-wide">Serviços ({services.length})</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onSelect(null)} aria-label="Novo serviço">
              <Plus className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={reloadServices} aria-label="Recarregar">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {services.length === 0 ? (
          <EmptyState icon={Tag}>Nenhum serviço cadastrado.</EmptyState>
        ) : (
          <ul className="flex-1 space-y-2">
            {items.map((s) => {
              const selected = s.id === selectedId;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    selected ? "border-foreground/40 bg-muted/60" : "hover:bg-muted/30",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {s.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.imageUrl} alt="" className="size-9 shrink-0 rounded-md border object-cover" />
                    ) : null}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-xs">
                        <Clock className="size-3.5" /> {s.durationInMinutes} min · {formatBRL(s.priceInCents)}
                      </span>
                    </span>
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label={`Excluir ${s.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {s.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                          O serviço sai do catálogo. Se houver agendamentos vinculados, a API pode
                          recusar a exclusão.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            if (s.id === selectedId) onSelect(null);
                            deleteMutation.mutate(s.id);
                          }}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
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
      </CardContent>
    </Card>
  );
}
