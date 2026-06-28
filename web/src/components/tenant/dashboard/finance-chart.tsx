"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { ComposeOption } from "echarts/core";
import type {
  DataZoomComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from "echarts/components";

echarts.use([BarChart, LineChart, DataZoomComponent, GridComponent, TooltipComponent, CanvasRenderer]);

type ECOption = ComposeOption<
  BarSeriesOption | LineSeriesOption | GridComponentOption | TooltipComponentOption | DataZoomComponentOption
>;

type Point = { label: string; revenueInCents: number; appointments: number };
type TipParam = { seriesName?: string; value?: unknown; marker?: string; axisValueLabel?: string };

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Lê um token de cor do CSS (`var(--*)`) resolvido no elemento; fallback se ausente. */
function cssVar(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * "Movimento financeiro": agendamentos (barras, eixo esq.) + receita (linha, eixo dir.) na mesma
 * linha do tempo, com zoom por scroll/pinça (`dataZoom: inside`). ECharts (exceção C6) por causa do
 * zoom nativo. Cores via tokens lidos do CSS (re-aplicadas no toggle claro/escuro).
 */
export function FinanceChart({ data, height = 260 }: { data: Point[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const { resolvedTheme } = useTheme();

  // init + resize + dispose (uma vez)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // setOption a cada mudança de dados ou tema (re-lê os tokens)
  useEffect(() => {
    const chart = chartRef.current;
    const el = ref.current;
    if (!chart || !el) return;

    const fg = cssVar(el, "--foreground", "#e5e5e5");
    const muted = cssVar(el, "--muted-foreground", fg);
    const border = cssVar(el, "--border", muted);
    const popover = cssVar(el, "--popover", "#171717");
    const popoverFg = cssVar(el, "--popover-foreground", fg);

    const option: ECOption = {
      grid: { left: 4, right: 4, top: 16, bottom: 24, containLabel: true },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: popover,
        borderColor: border,
        textStyle: { color: popoverFg, fontSize: 12 },
        formatter: (params) => {
          const arr = (Array.isArray(params) ? params : [params]) as TipParam[];
          const label = arr[0]?.axisValueLabel ?? "";
          const lines = arr
            .map((p) => {
              const v = p.seriesName === "Receita" ? brl(Number(p.value)) : String(p.value ?? 0);
              return `${p.marker ?? ""} ${p.seriesName}: ${v}`;
            })
            .join("<br/>");
          return `<div style="font-weight:600;margin-bottom:2px">${label}</div>${lines}`;
        },
      },
      // Zoom por scroll do mouse (PC) e pinça (mobile), sem barra.
      dataZoom: [{ type: "inside", zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false }],
      xAxis: {
        type: "category",
        data: data.map((d) => d.label),
        axisLine: { lineStyle: { color: border } },
        axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 11, hideOverlap: true },
      },
      yAxis: [
        {
          type: "value",
          axisLabel: { color: muted, fontSize: 11 },
          splitLine: { lineStyle: { color: border, opacity: 0.4 } },
        },
        {
          type: "value",
          position: "right",
          axisLabel: { color: muted, fontSize: 11, formatter: (v: number) => brl(v) },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Agendamentos",
          type: "bar",
          yAxisIndex: 0,
          data: data.map((d) => d.appointments),
          barMaxWidth: 28,
          itemStyle: { color: muted, borderRadius: [3, 3, 0, 0] },
          // Sem emphasis/blur: hover não apaga a série (mostra só tooltip + eixo).
          emphasis: { disabled: true },
        },
        {
          name: "Receita",
          type: "line",
          yAxisIndex: 1,
          data: data.map((d) => d.revenueInCents),
          smooth: true,
          symbol: "none",
          itemStyle: { color: fg },
          lineStyle: { color: fg, width: 2 },
          areaStyle: { color: fg, opacity: 0.08 },
          emphasis: { disabled: true },
        },
      ],
    };
    chart.setOption(option, true);
  }, [data, resolvedTheme]);

  return <div ref={ref} className="text-foreground w-full" style={{ height }} />;
}
