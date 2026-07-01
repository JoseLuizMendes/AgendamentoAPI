"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import { useIsMobile } from "@/lib/use-media-query";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/components/tenant/tenant-context";
import { STATUS_META } from "@/components/tenant/shared";
import type { Appointment, Service } from "@/components/tenant/types";
import { serviceColor, statusColor, type ColorMode } from "./colors";
import { computeLockedBands, isAvailable, type Interval } from "./availability";
import { calendarLayout } from "./layout";
import { tapRange } from "./tap";
import { phaseOf, PHASE_CLASS } from "./phase";
import { AppointmentCreateDrawer } from "./appointment-create-drawer";
import { AppointmentDetailDrawer } from "./appointment-detail-drawer";
import { TriagePanel } from "./triage-panel";

const ACTIVE = new Set(["SCHEDULED", "CONFIRMED"]);
const STATUS_ORDER = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELED"] as const;
const COLOR_MODE_KEY = "agenda:colorMode";
const EMPTY_APPOINTMENTS: Appointment[] = [];

/** Desloca um horário "HH:MM" por `deltaMin` (clamp 00:00–24:00) → "HH:MM:00". */
function shiftClock(hhmm: string, deltaMin: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, Math.min(24 * 60, h * 60 + m + deltaMin));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`;
}

export function AgendaCalendar() {
  const { services, hours, settings, overrides } = useTenant();
  const queryClient = useQueryClient();

  const mounted = useMounted();
  const isMobile = useIsMobile();
  const layout = calendarLayout(isMobile);
  const [now, setNow] = useState(() => Date.now());
  const [range, setRange] = useState<{
    startISO: string;
    endISO: string;
    startMs: number;
    endMs: number;
  } | null>(null);
  // Preferência de cor persiste entre sessões (init lazy — este subtree só
  // renderiza no client, depois do gate de auth do TenantProvider).
  const [colorMode, setColorMode] = useState<ColorMode>(() =>
    typeof window !== "undefined" && localStorage.getItem(COLOR_MODE_KEY) === "status" ? "status" : "service",
  );
  const [createSel, setCreateSel] = useState<{ start: Date; end: Date } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewType, setViewType] = useState("timeGridWeek");

  // Avança o "agora" a cada minuto para as fases progredirem em tempo real.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  function changeColorMode(mode: ColorMode) {
    setColorMode(mode);
    localStorage.setItem(COLOR_MODE_KEY, mode);
  }

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", "range", range?.startISO, range?.endISO],
    queryFn: () =>
      apiRequest<Appointment[]>(
        `/appointments?from=${encodeURIComponent(range!.startISO)}&to=${encodeURIComponent(range!.endISO)}`,
      ),
    enabled: range !== null,
  });
  const appointments = appointmentsQuery.data ?? EMPTY_APPOINTMENTS;
  const loadingEvents = appointmentsQuery.isFetching;

  useEffect(() => {
    const err = appointmentsQuery.error;
    if (err && !(err instanceof ApiError && err.status === 401)) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao carregar agenda");
    }
  }, [appointmentsQuery.error]);

  // Recarrega todas as queries de agendamento (agenda + triagem) — usado pelos drawers.
  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
    [queryClient],
  );

  function onDatesSet(arg: DatesSetArg) {
    setViewType(arg.view.type);
    setRange({
      startISO: arg.start.toISOString(),
      endISO: arg.end.toISOString(),
      startMs: arg.start.getTime(),
      endMs: arg.end.getTime(),
    });
  }

  const openTimes = hours.filter((h) => !h.isOff);
  // Folga antes da abertura e depois do fechamento → eventos nas pontas do
  // expediente não ficam grudados na borda da grade.
  const earliestOpen = openTimes.length ? [...openTimes.map((h) => h.openTime)].sort()[0] : "07:00";
  const latestClose = openTimes.map((h) => h.closeTime).sort().at(-1) ?? "20:00";
  const slotMinTime = shiftClock(earliestOpen, -30);
  const slotMaxTime = shiftClock(latestClose, 60);

  const visibleDays = useMemo(() => {
    if (!range) return [] as Date[];
    const days: Date[] = [];
    const cursor = new Date(range.startMs);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getTime() < range.endMs) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [range]);

  const lockedBands = useMemo<Interval[]>(() => {
    if (!viewType.startsWith("timeGrid")) return [];
    return computeLockedBands(visibleDays, hours, overrides, new Date(now), slotMinTime, slotMaxTime);
  }, [viewType, visibleDays, hours, overrides, now, slotMinTime, slotMaxTime]);

  const events: EventInput[] = useMemo(() => {
    const list: EventInput[] = appointments.map((a) => {
      const muted = a.status === "CANCELED" || a.status === "NO_SHOW";
      const st = statusColor(a.status);
      const svc = serviceColor(a.serviceId);
      // A borda lateral sempre reflete o status (leitura rápida do estágio).
      // O corpo do evento segue o modo escolhido (serviço x status).
      const body = colorMode === "status" ? st : muted ? null : svc;
      const cls: string[] = [];
      if (muted) cls.push("fc-appt-muted");
      const phaseCls = PHASE_CLASS[phaseOf(a, now, settings)];
      if (phaseCls) cls.push(phaseCls);
      return {
        id: String(a.id),
        start: a.startTime,
        end: a.endTime,
        editable: ACTIVE.has(a.status),
        backgroundColor: body ? body.bg : "var(--muted)",
        borderColor: st.border,
        textColor: body ? body.text : "var(--muted-foreground)",
        classNames: cls,
        extendedProps: { appt: a },
      };
    });

    // Faixas cinza das regiões indisponíveis (passado, fechado, feriado, fora do
    // expediente, intervalo) — calculadas pelo helper de disponibilidade.
    for (const band of lockedBands) {
      list.push({
        start: band.start.toISOString(),
        end: band.end.toISOString(),
        display: "background",
        classNames: ["fc-locked-bg"],
      });
    }
    return list;
  }, [appointments, colorMode, now, settings, lockedBands]);

  const patchTimesMutation = useMutation({
    mutationFn: (v: { id: number; startTime: string; endTime: string }) =>
      apiRequest(`/appointments/${v.id}`, { method: "PATCH", body: { startTime: v.startTime, endTime: v.endTime } }),
    onSuccess: () => {
      toast.success("Agendamento atualizado");
      void reload();
    },
  });

  function applyMove(arg: EventDropArg | EventResizeDoneArg) {
    const { start, end } = arg.event;
    if (!start || !end) return arg.revert();
    patchTimesMutation.mutate(
      { id: Number(arg.event.id), startTime: start.toISOString(), endTime: end.toISOString() },
      {
        onError: (err) => {
          arg.revert();
          toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar");
        },
      },
    );
  }

  function onEventDrop(arg: EventDropArg) {
    applyMove(arg);
  }

  function onEventResize(arg: EventResizeDoneArg) {
    applyMove(arg);
  }

  function onSelect(arg: DateSelectArg) {
    setCreateSel({ start: arg.start, end: arg.end });
    setCreateOpen(true);
    arg.view.calendar.unselect();
  }

  // Toque simples na grade (mobile): o `select` do FullCalendar exige long-press +
  // arrasto no touch — o tap dispara só `dateClick`. Abre o drawer no slot tocado.
  function onDateClick(arg: DateClickArg) {
    if (!isMobile || !arg.view.type.startsWith("timeGrid")) return;
    const { start, end } = tapRange(arg.date);
    if (!isAvailable(start, end, hours, overrides, new Date(now), slotMinTime, slotMaxTime)) {
      toast.error("Horário indisponível");
      return;
    }
    setCreateSel({ start, end });
    setCreateOpen(true);
  }

  function onEventClick(arg: EventClickArg) {
    setDetail(arg.event.extendedProps.appt as Appointment);
    setDetailOpen(true);
  }

  function openCreateDefault() {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() - (start.getMinutes() % 30) + 30);
    setCreateSel({ start, end: new Date(start.getTime() + 60 * 60_000) });
    setCreateOpen(true);
  }

  function renderEvent(arg: EventContentArg) {
    const a = arg.event.extendedProps.appt as Appointment | undefined;
    // Eventos "fantasma" (mirror do arraste de seleção/movimentação) não têm
    // agendamento por trás — renderiza só o horário, sem acessar dados do appt.
    // Eventos de fundo (sombra do passado) não renderizam conteúdo.
    if (!a) {
      if (arg.event.display === "background") return null;
      return <div className="px-1 py-0.5 text-[11px] font-medium leading-tight">{arg.timeText}</div>;
    }
    const service = a.service ?? services.find((s) => s.id === a.serviceId);

    // Vista lista (mobile, estilo "Agenda"): a hora e o ponto de cor já vêm em colunas próprias
    // da lista — o conteúdo do evento é só o título (cliente + serviço), sem duplicar a hora.
    if (arg.view.type.startsWith("list")) {
      return (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{a.customerName}</span>
          {service ? <span className="text-muted-foreground truncate text-xs">{service.name}</span> : null}
        </div>
      );
    }

    const start = arg.event.start;
    const end = arg.event.end;
    const durationMin = start && end ? (end.getTime() - start.getTime()) / 60000 : 60;
    const startLabel = start
      ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
      : arg.timeText;
    const title = `${arg.timeText} · ${a.customerName}${service ? ` · ${service.name}` : ""}`;

    // Serviços curtos (< 30 min) ocupam um bloco fino — mostra só uma linha (hora +
    // nome) pra não estourar; o resto fica no title (hover) e no drawer de detalhes.
    if (durationMin < 30) {
      return (
        <div className="flex h-full items-center gap-1 overflow-hidden px-1 leading-none" title={title}>
          <span className="shrink-0 text-[10px] opacity-80">{startLabel}</span>
          <span className="truncate text-[11px] font-semibold">{a.customerName}</span>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col overflow-hidden px-1 py-0.5 leading-tight" title={title}>
        <span className="text-[11px] opacity-90">{arg.timeText}</span>
        <span className="truncate text-xs font-semibold">{a.customerName}</span>
        {service ? <span className="truncate text-[11px] opacity-90">{service.name}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Legenda e alternância de cor só no desktop — na lista do mobile poluem e tomam altura. */}
        <div className="hidden min-w-0 lg:flex">
          <ColorLegend mode={colorMode} services={services} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* No mobile o "novo" sai da toolbar do FullCalendar (overflow) — vira botão aqui. */}
          <Button size="sm" className="rounded-full lg:hidden" onClick={openCreateDefault}>
            <Plus className="size-4" /> Novo
          </Button>
          <TriagePanel onResolved={reload} />
          <div className="hidden lg:block">
            <ColorModeToggle mode={colorMode} onChange={changeColorMode} />
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
      {loadingEvents ? (
        <span
          className="bg-primary/70 absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse motion-reduce:animate-none"
          aria-hidden
        />
      ) : null}
      {mounted ? (
        <FullCalendar
          // Remonta ao cruzar o breakpoint p/ a view inicial (lista x semana) acompanhar o device.
          key={isMobile ? "mobile" : "desktop"}
          plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
          initialView={layout.initialView}
          locale={ptBrLocale}
          headerToolbar={layout.headerToolbar}
          customButtons={{ novo: { text: "+ Novo", click: openCreateDefault } }}
          buttonText={{ today: "Hoje", week: "Semana", day: "Dia", month: "Mês", list: "Agenda" }}
          // Toque: long-press curto p/ arrastar/redimensionar e selecionar na grade ("Dia") do mobile.
          longPressDelay={250}
          eventLongPressDelay={250}
          selectLongPressDelay={250}
          allDaySlot={false}
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false, omitZeroMinute: false, meridiem: false }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false, meridiem: false }}
          slotMinTime={slotMinTime}
          slotMaxTime={slotMaxTime}
          expandRows
          height="100%"
          selectable
          selectAllow={(span) =>
            viewType.startsWith("timeGrid")
              ? isAvailable(span.start, span.end, hours, overrides, new Date(now), slotMinTime, slotMaxTime)
              : span.start.getTime() >= Date.now()
          }
          eventAllow={(dropInfo) =>
            viewType.startsWith("timeGrid")
              ? isAvailable(dropInfo.start, dropInfo.end, hours, overrides, new Date(now), slotMinTime, slotMaxTime)
              : true
          }
          editable
          eventResizableFromStart
          events={events}
          datesSet={onDatesSet}
          select={onSelect}
          dateClick={onDateClick}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          eventResize={onEventResize}
          eventContent={renderEvent}
        />
      ) : (
        <div className="text-muted-foreground grid h-full place-items-center font-mono text-sm">
          Carregando agenda…
        </div>
      )}
      </div>

      <AppointmentCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        start={createSel?.start ?? null}
        end={createSel?.end ?? null}
        services={services}
        onCreated={() => {
          setCreateOpen(false);
          reload();
        }}
      />

      <AppointmentDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        appointment={detail}
        services={services}
        onChanged={() => {
          setDetailOpen(false);
          reload();
        }}
      />
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />;
}

/** Legenda que reflete o modo de cor ativo (serviços ou status). */
function ColorLegend({ mode, services }: { mode: ColorMode; services: Service[] }) {
  const items =
    mode === "status"
      ? STATUS_ORDER.map((s) => ({ key: s, label: STATUS_META[s]?.label ?? s, color: statusColor(s).bg }))
      : services.map((s) => ({ key: String(s.id), label: s.name, color: serviceColor(s.id).bg }));

  if (items.length === 0) {
    return <p className="text-muted-foreground text-xs">Cadastre um serviço para colorir a agenda.</p>;
  }

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {items.map((it) => (
        <li key={it.key} className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Dot color={it.color} />
          <span className="max-w-[12rem] truncate">{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Alterna a cor dos eventos entre serviço e status. */
function ColorModeToggle({ mode, onChange }: { mode: ColorMode; onChange: (mode: ColorMode) => void }) {
  const options: { key: ColorMode; label: string }[] = [
    { key: "service", label: "Serviço" },
    { key: "status", label: "Status" },
  ];
  return (
    <div
      role="group"
      aria-label="Colorir eventos por"
      className="bg-muted/60 inline-flex shrink-0 gap-1 rounded-full border p-1"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={mode === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "focus-visible:ring-ring rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
            mode === o.key
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
