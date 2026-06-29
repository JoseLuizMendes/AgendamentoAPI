"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HighlightBars } from "./charts";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function argmax(arr: number[]): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if ((arr[i] ?? 0) > (arr[best] ?? 0)) best = i;
  return best;
}

/**
 * Movimento num card só, com abas "Por dia da semana | Por hora". Reusa `HighlightBars`
 * (pico destacado). O período/intervalo vem de fora (a página filtra `/reports/summary`).
 */
export function MovementCard({
  byWeekday,
  byHour,
  className,
}: {
  byWeekday: number[];
  byHour: number[];
  className?: string;
}) {
  const weekdayData = byWeekday.map((v, i) => ({ label: WEEKDAYS[i] ?? String(i), value: v }));
  const hourData = byHour
    .map((v, h) => ({ label: `${h}h`, value: v, h }))
    .filter((d) => d.h >= 6 && d.h <= 22);
  const hourPeak = hourData.findIndex((d) => d.h === argmax(byHour));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Movimento</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekday">
          <TabsList className="mb-4">
            <TabsTrigger value="weekday">Por dia da semana</TabsTrigger>
            <TabsTrigger value="hour">Por hora</TabsTrigger>
          </TabsList>
          <TabsContent value="weekday">
            <HighlightBars data={weekdayData} peakIndex={argmax(byWeekday)} />
          </TabsContent>
          <TabsContent value="hour">
            <HighlightBars data={hourData} peakIndex={hourPeak} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
