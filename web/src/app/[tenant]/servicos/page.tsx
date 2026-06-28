"use client";

import { useState } from "react";

import { useTenant } from "@/components/tenant/tenant-context";
import { Bento } from "@/components/ui/bento";
import { ServiceListCard } from "@/components/tenant/servicos/service-list-card";
import { ServiceSummaryCard } from "@/components/tenant/servicos/service-summary-card";
import { ServiceEditorCard } from "@/components/tenant/servicos/service-editor-card";
import { ServiceHighlightsCard } from "@/components/tenant/servicos/service-highlights-card";
import { ServiceDistributionCard } from "@/components/tenant/servicos/service-distribution-card";

export default function ServicosPage() {
  const { services, reloadServices } = useTenant();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = services.find((s) => s.id === selectedId) ?? null;

  // Remonta o editor (estado fresco) ao trocar de serviço OU quando os valores mudam após salvar.
  const editorKey = `${selectedId}:${selected?.name ?? ""}:${selected?.priceInCents ?? ""}:${selected?.durationInMinutes ?? ""}:${selected?.description ?? ""}:${selected?.imageUrl ?? ""}`;

  return (
    <div className="p-6 lg:p-8">
      <Bento>
        {/* Coluna esquerda (2/6): Lista + Resumo empilhados. */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ServiceListCard selectedId={selectedId} onSelect={setSelectedId} />
          <ServiceSummaryCard className="flex-1" />
        </div>

        {/* Coluna direita (4/6): Editor + (Destaques | Distribuição). */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <ServiceEditorCard
            key={editorKey}
            selected={selected}
            onSelect={setSelectedId}
            onSaved={reloadServices}
          />
          <div className="grid flex-1 auto-rows-fr gap-4 sm:grid-cols-2">
            <ServiceHighlightsCard />
            <ServiceDistributionCard />
          </div>
        </div>
      </Bento>
    </div>
  );
}
