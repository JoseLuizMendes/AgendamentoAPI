"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";

import { paginate } from "@/lib/paginate";
import { EmptyState, formatBRL } from "@/components/tenant/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filterClients, formatShortDate, sortClients, type Client, type ClientSortKey } from "./clients";

const PAGE_SIZE = 8;

/** Card principal: lista de clientes com busca, ordenação e paginação. */
export function ClientsTableCard({
  clients,
  loading,
  className,
}: {
  clients: Client[];
  loading?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ClientSortKey>("recent");
  const [page, setPage] = useState(1);

  const filtered = sortClients(filterClients(clients, query), sort);
  const { items, page: currentPage, pageCount } = paginate(filtered, page, PAGE_SIZE);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Clientes ({clients.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou telefone"
              aria-label="Buscar clientes"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <NativeSelect
            className="w-44"
            aria-label="Ordenar clientes"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as ClientSortKey);
              setPage(1);
            }}
          >
            <option value="recent">Mais recentes</option>
            <option value="visits">Mais visitas</option>
            <option value="total">Maior gasto</option>
            <option value="name">Nome (A-Z)</option>
          </NativeSelect>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState icon={Users}>Nenhum cliente ainda.</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search}>Nenhum cliente encontrado.</EmptyState>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="overflow-hidden rounded-xl border">
              {/* Ritmo do sistema: células px-4 py-3 (escala 4/8/12/16) em vez do p-2 do shadcn.
                  Divisórias verticais: border-r (token) em toda célula/cabeçalho menos a última. */}
              <Table className="[&_td]:px-4 [&_td]:py-3 [&_th]:h-11 [&_th]:px-4 [&_td:not(:last-child)]:border-r [&_th:not(:last-child)]:border-r">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs uppercase tracking-widest">Cliente</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest">Telefone</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-widest">Última visita</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Visitas</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-widest">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.phone || c.name}>
                      <TableCell className="truncate font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{c.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{formatShortDate(c.lastVisit)}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.visits}</TableCell>
                      <TableCell className="font-display text-right text-lg tracking-wide">
                        {formatBRL(c.totalInCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

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
        )}
      </CardContent>
    </Card>
  );
}
