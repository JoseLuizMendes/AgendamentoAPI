"use client";

import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";

type TipPayload = { name?: string; value?: number | string; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string;
  fmt?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      {label ? <div className="mb-1 font-medium">{label}</div> : null}
      {payload.map((p, i) => (
        <div key={i} className="text-muted-foreground">
          {p.name}:{" "}
          <span className="text-foreground font-medium">
            {typeof p.value === "number" && fmt ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const tickStyle = { fill: "currentColor", opacity: 0.55, fontSize: 11 } as const;

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Mede a largura via ResizeObserver e passa dimensões explícitas ao gráfico.
 * Evita o bug do ResponsiveContainer medir width(-1) na primeira pintura.
 */
function ChartBox({ height, children }: { height: number; children: (w: number, h: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width ?? el.clientWidth;
      setW(Math.floor(cw));
    });
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-foreground w-full" style={{ height }}>
      {w > 0 ? children(w, height) : null}
    </div>
  );
}

export function RevenueArea({ data }: { data: { label: string; revenueInCents: number }[] }) {
  return (
    <ChartBox height={240}>
      {(w, h) => (
        <AreaChart width={w} height={h} data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => brl(v)} />
          <Tooltip cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }} content={<ChartTooltip fmt={brl} />} />
          <Area
            type="monotone"
            dataKey="revenueInCents"
            name="Receita"
            stroke="currentColor"
            strokeWidth={2}
            fill="currentColor"
            fillOpacity={0.14}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </ChartBox>
  );
}

export function CountBars({
  data,
  dataKey,
  name,
}: {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  name: string;
}) {
  return (
    <ChartBox height={240}>
      {(w, h) => (
        <BarChart width={w} height={h} data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} minTickGap={8} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.06 }} content={<ChartTooltip />} />
          <Bar dataKey={dataKey} name={name} fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        </BarChart>
      )}
    </ChartBox>
  );
}

/** Barras com a coluna de pico destacada (ex.: hora/dia mais movimentado). */
export function HighlightBars({ data, peakIndex }: { data: Array<{ label: string; value: number }>; peakIndex: number }) {
  return (
    <ChartBox height={200}>
      {(w, h) => (
        <BarChart width={w} height={h} data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval={0} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.06 }} content={<ChartTooltip />} />
          <Bar dataKey="value" name="Agendamentos" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill="currentColor" fillOpacity={i === peakIndex ? 1 : 0.35} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartBox>
  );
}
