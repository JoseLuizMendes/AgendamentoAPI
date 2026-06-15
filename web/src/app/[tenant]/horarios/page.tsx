"use client";

import { useState } from "react";

import { useTenant } from "@/components/tenant/tenant-context";
import { Bento } from "@/components/ui/bento";
import { WeekCard } from "@/components/tenant/horarios/week-card";
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
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <Bento>
        <WeekCard className="h-fit lg:col-span-3" selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <DayEditorCard
          key={editorKey}
          className="h-fit lg:col-span-3"
          dayOfWeek={selectedDay}
          current={current}
          allHours={hours}
          onReload={reloadHours}
        />
        <OverridesCard className="h-fit lg:col-span-2" />
        <TriageSettingsCard
          key={`${settings.statusPromptAfterStartMin}-${settings.overdueAfterEndMin}`}
          className="lg:col-span-4"
          initial={settings}
          onSaved={reloadSettings}
        />
      </Bento>
    </div>
  );
}
