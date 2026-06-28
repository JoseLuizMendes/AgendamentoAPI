"use client";

import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/utils";

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
 *
 * `fill`: em vez de altura fixa, estica (`flex-1`) e mede a altura do container
 * (≥ `minHeight`) — o gráfico preenche o card em vez de flutuar no centro.
 */
function ChartBox({
  height,
  fill = false,
  minHeight = 200,
  children,
}: {
  height: number;
  fill?: boolean;
  minHeight?: number;
  children: (w: number, h: number) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: height });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (rect?: { width: number; height: number }) => ({
      w: Math.floor(rect?.width ?? el.clientWidth),
      h: fill ? Math.max(minHeight, Math.floor(rect?.height ?? el.clientHeight)) : height,
    });
    const ro = new ResizeObserver((entries) => setSize(measure(entries[0]?.contentRect)));
    ro.observe(el);
    setSize(measure({ width: el.clientWidth, height: el.clientHeight }));
    return () => ro.disconnect();
  }, [fill, height, minHeight]);

  return (
    <div
      ref={ref}
      className={cn("text-foreground w-full", fill && "min-h-0 flex-1")}
      style={fill ? undefined : { height }}
    >
      {size.w > 0 ? children(size.w, size.h) : null}
    </div>
  );
}

export function RevenueArea({
  data,
  height = 200,
}: {
  data: { label: string; revenueInCents: number }[];
  height?: number;
}) {
  return (
    <ChartBox height={height}>
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
  fill = false,
  maxBarSize = 40,
  height = 200,
}: {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  name: string;
  fill?: boolean;
  maxBarSize?: number;
  height?: number;
}) {
  return (
    <ChartBox height={height} fill={fill}>
      {(w, h) => (
        <BarChart width={w} height={h} data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} minTickGap={8} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={28} allowDecimals={false} domain={[0, "auto"]} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.06 }} content={<ChartTooltip />} />
          <Bar dataKey={dataKey} name={name} fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={maxBarSize} isAnimationActive={false} />
        </BarChart>
      )}
    </ChartBox>
  );
}

type PeakLabelProps = {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  value?: string | number | boolean | null | readonly (string | number)[];
  index?: number;
};

/** Rótulo de valor exibido só na coluna de pico (mantém o gráfico limpo nas demais). */
function peakValueLabel(peakIndex: number) {
  return function PeakValueLabel({ x, y, width, value, index }: PeakLabelProps) {
    if (index !== peakIndex || x == null || y == null || width == null) return null;
    const cx = Number(x) + Number(width) / 2;
    return (
      <text x={cx} y={Number(y) - 8} textAnchor="middle" className="fill-foreground" fontSize={12} fontWeight={600}>
        {value}
      </text>
    );
  };
}

/**
 * Barras com a coluna de pico destacada (ex.: hora/dia mais movimentado).
 * Grid horizontal sutil + baseline no zero dão referência de leitura; o pico ganha cor cheia
 * e rótulo de valor, enquanto as demais ficam atenuadas. Rótulos do eixo X auto-afinam (minTickGap).
 */
export function HighlightBars({ data, peakIndex, height = 200 }: { data: Array<{ label: string; value: number }>; peakIndex: number; height?: number }) {
  return (
    <ChartBox height={height}>
      {(w, h) => (
        <BarChart width={w} height={h} data={data} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.06 }} content={<ChartTooltip />} />
          <Bar dataKey="value" name="Agendamentos" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill="currentColor" fillOpacity={i === peakIndex ? 1 : 0.28} />
            ))}
            <LabelList dataKey="value" content={peakValueLabel(peakIndex)} />
          </Bar>
        </BarChart>
      )}
    </ChartBox>
  );
}
