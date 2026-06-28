"use client";

import { useState } from "react";

import { useTenant } from "@/components/tenant/tenant-context";
import { Bento } from "@/components/ui/bento";
import { WeekCard } from "@/components/tenant/horarios/week-card";
import { WeekSummaryCard } from "@/components/tenant/horarios/week-summary-card";
import { DayEditorCard } from "@/components/tenant/horarios/day-editor";
import { OverridesCard } from "@/components/tenant/horarios/overrides-card";
import { TriageSettingsCard } from "@/components/tenant/horarios/triage-card";

export default function HorariosPage() {
  const { hours, reloadHours, settings, reloadSettings } = useTenant();
  const [selectedDay, setSelectedDay] = useState(0);
  const current = hours.find((h) => h.dayOfWeek === selectedDay);

  // Remonta o editor (estado fresco) ao trocar de dia OU quando os valores do dia
  // mudam após salvar/recarregar — inclui os intervalos. Sem useEffect de sync.
  const editorKey = `${selectedDay}:${current?.openTime ?? ""}:${current?.closeTime ?? ""}:${current?.isOff ?? false}:${current?.breaks.map((b) => b.id).join(",") ?? ""}`;

  return (
    <div className="p-6 lg:p-8">
      <Bento>
        {/* Coluna esquerda (2/6): Semana + Resumo empilhados. O Resumo estica (flex-1)
            p/ a coluna terminar alinhada com a direita quando esta for mais alta. */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <WeekCard selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          <WeekSummaryCard className="flex-1" />
        </div>

        {/* Coluna direita (4/6): Editor do dia + (Exceções | Triagem). A linha de baixo
            estica (flex-1 + auto-rows-fr) p/ preencher a sobra quando a esquerda for mais alta. */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <DayEditorCard
            key={editorKey}
            dayOfWeek={selectedDay}
            current={current}
            allHours={hours}
            onReload={reloadHours}
          />
          <div className="grid flex-1 auto-rows-fr gap-4 sm:grid-cols-2">
            <OverridesCard />
            <TriageSettingsCard
              key={`${settings.statusPromptAfterStartMin}-${settings.overdueAfterEndMin}`}
              initial={settings}
              onSaved={reloadSettings}
            />
          </div>
        </div>
      </Bento>
    </div>
  );
}
