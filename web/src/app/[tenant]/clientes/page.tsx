"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiRequest, ApiError } from "@/lib/api";
import { Bento } from "@/components/ui/bento";
import type { Appointment } from "@/components/tenant/types";
import { aggregateClients } from "@/components/tenant/clientes/clients";
import { ClientsSummaryCard } from "@/components/tenant/clientes/clients-summary-card";
import { ClientsHighlightsCard } from "@/components/tenant/clientes/clients-highlights-card";
import { ClientsTableCard } from "@/components/tenant/clientes/clients-table-card";
import { ClientsTrendCard } from "@/components/tenant/clientes/clients-trend-card";

export default function ClientesPage() {
  const router = useRouter();

  const { data: appts, error } = useQuery({
    queryKey: ["appointments", "all"],
    queryFn: () => apiRequest<Appointment[]>("/appointments"),
  });

  // Efeito de navegação/toast (não é fetch): 401 → login; outros → toast.
  useEffect(() => {
    if (!error) return;
    if (error instanceof ApiError && error.status === 401) router.replace("/login");
    else toast.error(error instanceof ApiError ? error.message : "Erro ao carregar clientes");
  }, [error, router]);

  const clients = useMemo(() => (appts ? aggregateClients(appts) : []), [appts]);

  return (
    // min-h = viewport menos o header (h-16); o bento estica (flex-1) e, no desktop, a linha
    // ocupa 1fr (auto-rows-fr) → as colunas alcançam a base; os cards de baixo crescem (flex-1).
    <div className="flex min-h-[calc(100svh-4rem)] flex-col p-6 lg:p-8">
      <Bento className="flex-1 lg:auto-rows-fr">
        {/* Esquerda (2/6): Resumo + Destaques. */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ClientsSummaryCard clients={clients} />
          <ClientsHighlightsCard clients={clients} className="flex-1" />
        </div>

        {/* Direita (4/6): Tabela (natural/compacta) + Novos por mês (estica p/ fechar a coluna). */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <ClientsTableCard clients={clients} loading={!appts && !error} />
          <ClientsTrendCard clients={clients} className="flex-1" />
        </div>
      </Bento>
    </div>
  );
}
