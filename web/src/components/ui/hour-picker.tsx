"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ITEM_H = 40; // altura de cada célula, em px (deve casar com `h-10`)
const SPACER = "h-20"; // (VISIBLE-1)/2 * ITEM_H = 80px → centraliza os extremos

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function hourOptions() {
  return Array.from({ length: 24 }, (_, i) => pad2(i));
}

function minuteOptions(step: number) {
  const s = Math.min(60, Math.max(1, Math.floor(step) || 1));
  const out: string[] = [];
  for (let m = 0; m < 60; m += s) out.push(pad2(m));
  return out;
}

/** Insere ":" depois de 2 dígitos enquanto digita (mantém valores parciais). */
function maskWhileTyping(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** Normaliza texto livre para "HH:MM" com clamp (0–23 / 0–59), ou "" se vazio. */
function normalizeTime(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (!d) return "";
  const hRaw = d.length <= 2 ? Number(d) : Number(d.slice(0, 2));
  const mRaw = d.length <= 2 ? 0 : Number(d.slice(2));
  const h = Math.min(23, Math.max(0, Number.isNaN(hRaw) ? 0 : hRaw));
  const m = Math.min(59, Math.max(0, Number.isNaN(mRaw) ? 0 : mRaw));
  return `${pad2(h)}:${pad2(m)}`;
}

/** Índice da opção igual a `v`, senão a mais próxima por valor numérico. */
function indexOfValue(options: string[], v: string) {
  const exact = options.indexOf(v);
  if (exact !== -1) return exact;
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  let best = 0;
  let bestDist = Infinity;
  options.forEach((opt, i) => {
    const dist = Math.abs(Number(opt) - n);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function clampIndex(i: number, len: number) {
  return Math.min(len - 1, Math.max(0, i));
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function nowHHMM() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function WheelColumn({
  options,
  initialIndex,
  scrollRef,
  label,
}: {
  options: string[];
  initialIndex: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  label: string;
}) {
  const idleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetTop = React.useRef<number | null>(null);

  // Posiciona a coluna no valor inicial — efeito só de DOM (sem setState).
  React.useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = initialIndex * ITEM_H;
  }, [initialIndex, scrollRef]);

  // Roda do mouse/trackpad: preventDefault + scrollTo nativo (suave) até o item
  // central. `scrollTo` é programático → não é bloqueado pelo scroll-lock do Dialog
  // (que só intercepta os EVENTOS wheel/touch), e anima sem o bug de arredondamento
  // de uma animação manual. `targetTop` acumula giros rápidos antes de assentar.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxTop = (options.length - 1) * ITEM_H;

    function onWheel(e: WheelEvent) {
      const node = scrollRef.current;
      if (!node) return;
      e.preventDefault();
      const from = targetTop.current ?? node.scrollTop;
      const snapped = Math.min(
        maxTop,
        Math.max(0, clampIndex(Math.round((from + e.deltaY) / ITEM_H), options.length) * ITEM_H),
      );
      targetTop.current = snapped;
      node.scrollTo({ top: snapped, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollRef, options.length]);

  function scrollToIndex(i: number) {
    scrollRef.current?.scrollTo({
      top: clampIndex(i, options.length) * ITEM_H,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  // Ao parar de rolar (roda, toque ou arraste), centraliza no item mais próximo e
  // libera o acúmulo de giros.
  function handleScroll() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      targetTop.current = null;
      const idx = clampIndex(Math.round(el.scrollTop / ITEM_H), options.length);
      const top = idx * ITEM_H;
      if (Math.abs(el.scrollTop - top) > 0.5) {
        el.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
    }, 90);
  }

  return (
    <div
      ref={scrollRef}
      role="group"
      aria-label={label}
      onScroll={handleScroll}
      className={cn(
        "relative z-10 h-[200px] w-14 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none [&::-webkit-scrollbar]:hidden"
      )}
    >
      <div aria-hidden className={SPACER} />
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          tabIndex={-1}
          onClick={() => scrollToIndex(i)}
          className="flex h-10 w-full items-center justify-center font-mono text-lg tabular-nums text-foreground"
        >
          {opt}
        </button>
      ))}
      <div aria-hidden className={SPACER} />
    </div>
  );
}

export interface TimeWheelProps {
  value: string;
  onChange: (value: string) => void;
  /** Passo dos minutos (default 1 → 00..59). */
  minuteStep?: number;
  className?: string;
  /** Chamado depois de confirmar (ex.: fechar o popover). */
  onConfirm?: () => void;
  confirmLabel?: string;
}

/**
 * Roda de duas colunas (horas/minutos), estilo Samsung. A rolagem é suave e funciona
 * dentro de Dialogs; confirma a seleção (lê a posição central) só no botão — então
 * rolar nunca dispara re-render que "puxe" o scroll de volta.
 */
export function TimeWheel({
  value,
  onChange,
  minuteStep = 1,
  className,
  onConfirm,
  confirmLabel = "OK",
}: TimeWheelProps) {
  const hours = React.useMemo(() => hourOptions(), []);
  const minutes = React.useMemo(() => minuteOptions(minuteStep), [minuteStep]);

  const hRef = React.useRef<HTMLDivElement | null>(null);
  const mRef = React.useRef<HTMLDivElement | null>(null);

  const base = normalizeTime(value) || nowHHMM();
  const initialH = indexOfValue(hours, base.slice(0, 2));
  const initialM = indexOfValue(minutes, base.slice(3, 5));

  function confirm() {
    const hi = clampIndex(Math.round((hRef.current?.scrollTop ?? 0) / ITEM_H), hours.length);
    const mi = clampIndex(Math.round((mRef.current?.scrollTop ?? 0) / ITEM_H), minutes.length);
    onChange(`${hours[hi]}:${minutes[mi]}`);
    onConfirm?.();
  }

  function goNow() {
    const n = nowHHMM();
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    hRef.current?.scrollTo({ top: indexOfValue(hours, n.slice(0, 2)) * ITEM_H, behavior });
    mRef.current?.scrollTo({ top: indexOfValue(minutes, n.slice(3, 5)) * ITEM_H, behavior });
  }

  return (
    <div className={cn("w-fit", className)}>
      <div className="relative flex items-stretch justify-center gap-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-10 -translate-y-1/2 border-y border-border bg-muted/40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-linear-to-b from-popover to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-linear-to-t from-popover to-transparent"
        />
        <WheelColumn options={hours} initialIndex={initialH} scrollRef={hRef} label="Horas" />
        <div className="relative z-10 flex items-center font-mono text-lg text-muted-foreground">:</div>
        <WheelColumn options={minutes} initialIndex={initialM} scrollRef={mRef} label="Minutos" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={goNow}>
          Agora
        </Button>
        <Button type="button" size="sm" onClick={confirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

export interface HourPickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Passo dos minutos (default 1 → 00..59). */
  minuteStep?: number;
  className?: string;
  "aria-label"?: string;
}

function HourPicker({
  id,
  value,
  onChange,
  disabled = false,
  minuteStep = 1,
  className,
  "aria-label": ariaLabel,
}: HourPickerProps) {
  const [open, setOpen] = React.useState(false);

  // Input controlado por um rascunho, sincronizado com `value` durante o render
  // (padrão "ajustar estado no render" — sem useEffect, sem set-state-in-effect).
  const [draft, setDraft] = React.useState(value);
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  function commitText(raw: string) {
    const norm = normalizeTime(raw);
    setDraft(norm);
    onChange(norm);
  }

  function commitWheel(v: string) {
    setDraft(v);
    onChange(v);
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <div
        className={cn(
          "flex h-11 w-full items-center gap-1 rounded-md border border-input bg-transparent pr-1 pl-3 shadow-xs transition-[color,box-shadow]",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          "dark:bg-input/30",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          placeholder="--:--"
          aria-label={ariaLabel ?? "Hora (HH:MM)"}
          value={draft}
          onChange={(e) => setDraft(maskWhileTyping(e.target.value))}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText(draft);
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-base tracking-wider tabular-nums outline-none placeholder:tracking-normal placeholder:text-muted-foreground md:text-sm"
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label="Abrir seletor de hora"
          >
            <Clock className="size-4 opacity-70" />
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent align="start" className="w-auto p-3">
        <TimeWheel
          value={value}
          onChange={commitWheel}
          minuteStep={minuteStep}
          confirmLabel="Pronto"
          onConfirm={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

export { HourPicker };
