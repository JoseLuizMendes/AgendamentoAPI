"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { Eyebrow } from "@/components/brand/eyebrow";
import { EmptyState, formatBRL } from "@/components/tenant/shared";
import type { Appointment } from "@/components/tenant/types";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";

type Client = {
  phone: string;
  name: string;
  visits: number;
  lastVisit: string;
  totalInCents: number;
};

type SortKey = "recent" | "visits" | "total" | "name";

function aggregate(appts: Appointment[]): Client[] {
  const map = new Map<string, Client & { lastTs: number }>();
  for (const a of appts) {
    const key = a.customerPhone || a.customerName;
    const ts = +new Date(a.startTime);
    const cur = map.get(key);
    const price = a.status === "COMPLETED" ? (a.service?.priceInCents ?? 0) : 0;
    if (!cur) {
      map.set(key, {
        phone: a.customerPhone,
        name: a.customerName,
        visits: a.status === "CANCELED" ? 0 : 1,
        lastVisit: a.startTime,
        lastTs: ts,
        totalInCents: price,
      });
    } else {
      if (a.status !== "CANCELED") cur.visits += 1;
      cur.totalInCents += price;
      if (ts > cur.lastTs) {
        cur.lastTs = ts;
        cur.lastVisit = a.startTime;
        cur.name = a.customerName;
      }
    }
  }
  return [...map.values()];
}

export default function ClientesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const { data: appts, error } = useQuery({
    queryKey: ["appointments", "all"],
    queryFn: () => apiRequest<Appointment[]>("/appointments"),
  });

  useEffect(() => {
    if (!error) return;
    if (error instanceof ApiError && error.status === 401) router.replace("/login");
    else toast.error(error instanceof ApiError ? error.message : "Erro ao carregar clientes");
  }, [error, router]);

  const clients = useMemo(() => {
    if (!appts) return [];
    const q = query.trim().toLowerCase();
    let list = aggregate(appts);
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
    list.sort((a, b) => {
      if (sort === "visits") return b.visits - a.visits;
      if (sort === "total") return b.totalInCents - a.totalInCents;
      if (sort === "name") return a.name.localeCompare(b.name);
      return +new Date(b.lastVisit) - +new Date(a.lastVisit);
    });
    return list;
  }, [appts, query, sort]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div>
        <Eyebrow className="mb-3">Base de clientes</Eyebrow>
        <h1 className="font-display text-3xl tracking-wide lg:text-4xl">
          Clientes {appts ? <span className="text-muted-foreground">({clients.length})</span> : null}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Buscar por nome ou telefone" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <NativeSelect className="w-44" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="recent">Mais recentes</option>
          <option value="visits">Mais visitas</option>
          <option value="total">Maior gasto</option>
          <option value="name">Nome (A-Z)</option>
        </NativeSelect>
      </div>

      {!appts ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState icon={Users}>Nenhum cliente encontrado.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="text-muted-foreground hidden grid-cols-[1.5fr_1fr_auto_auto] gap-4 border-b px-4 py-2.5 font-mono text-xs uppercase tracking-widest sm:grid">
            <span>Cliente</span>
            <span>Telefone</span>
            <span className="text-right">Visitas</span>
            <span className="text-right">Total</span>
          </div>
          {clients.map((c) => (
            <div
              key={c.phone || c.name}
              className="hover:bg-muted/40 grid grid-cols-2 items-center gap-x-4 gap-y-1 border-b px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1.5fr_1fr_auto_auto]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-muted-foreground text-xs">
                  últ. {new Date(c.lastVisit).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                </p>
              </div>
              <span className="text-muted-foreground truncate text-right sm:text-left">{c.phone || "—"}</span>
              <span className="text-right tabular-nums">{c.visits}</span>
              <span className="font-display text-right text-lg tracking-wide">{formatBRL(c.totalInCents)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
