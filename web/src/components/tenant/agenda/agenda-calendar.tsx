"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
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
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { toast } from "sonner";

import { apiRequest, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/tenant/tenant-context";
import { STATUS_META } from "@/components/tenant/shared";
import type { Appointment, Service } from "@/components/tenant/types";
import { serviceColor, statusColor, type ColorMode } from "./colors";
import { AppointmentCreateDrawer } from "./appointment-create-drawer";
import { AppointmentDetailDrawer } from "./appointment-detail-drawer";

const ACTIVE = new Set(["SCHEDULED", "CONFIRMED"]);
const STATUS_ORDER = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELED"] as const;
const COLOR_MODE_KEY = "agenda:colorMode";

export function AgendaCalendar() {
  const { services, hours } = useTenant();
  const rangeRef = useRef<{ start: string; end: string } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  // Preferência de cor persiste entre sessões (init lazy — este subtree só
  // renderiza no client, depois do gate de auth do TenantProvider).
  const [colorMode, setColorMode] = useState<ColorMode>(() =>
    typeof window !== "undefined" && localStorage.getItem(COLOR_MODE_KEY) === "status" ? "status" : "service",
  );
  const [createSel, setCreateSel] = useState<{ start: Date; end: Date } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // FullCalendar acessa o DOM — renderiza só após montar (evita SSR/hydration).
  useEffect(() => setMounted(true), []);

  function changeColorMode(mode: ColorMode) {
    setColorMode(mode);
    localStorage.setItem(COLOR_MODE_KEY, mode);
  }

  const fetchRange = useCallback(async (startISO: string, endISO: string) => {
    setLoadingEvents(true);
    try {
      const res = await apiRequest<Appointment[]>(
        `/appointments?from=${encodeURIComponent(startISO)}&to=${encodeURIComponent(endISO)}`,
      );
      setAppointments(res);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        toast.error(err instanceof ApiError ? err.message : "Erro ao carregar agenda");
      }
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const reload = useCallback(() => {
    if (rangeRef.current) void fetchRange(rangeRef.current.start, rangeRef.current.end);
  }, [fetchRange]);

  function onDatesSet(arg: DatesSetArg) {
    const start = arg.start.toISOString();
    const end = arg.end.toISOString();
    rangeRef.current = { start, end };
    void fetchRange(start, end);
  }

  const businessHours = useMemo(
    () =>
      hours
        .filter((h) => !h.isOff)
        .map((h) => ({ daysOfWeek: [h.dayOfWeek], startTime: h.openTime, endTime: h.closeTime })),
    [hours],
  );

  const openTimes = hours.filter((h) => !h.isOff);
  const slotMinTime = openTimes.length ? `${[...openTimes.map((h) => h.openTime)].sort()[0]}:00` : "07:00:00";
  const slotMaxTime = openTimes.length
    ? `${[...openTimes.map((h) => h.closeTime)].sort().at(-1)}:00`
    : "20:00:00";

  const events: EventInput[] = useMemo(
    () =>
      appointments.map((a) => {
        const muted = a.status === "CANCELED" || a.status === "NO_SHOW";
        const st = statusColor(a.status);
        const svc = serviceColor(a.serviceId);
        // A borda lateral sempre reflete o status (leitura rápida do estágio).
        // O corpo do evento segue o modo escolhido (serviço x status).
        const body = colorMode === "status" ? st : muted ? null : svc;
        return {
          id: String(a.id),
          start: a.startTime,
          end: a.endTime,
          editable: ACTIVE.has(a.status),
          backgroundColor: body ? body.bg : "var(--muted)",
          borderColor: st.border,
          textColor: body ? body.text : "var(--muted-foreground)",
          classNames: muted ? ["fc-appt-muted"] : [],
          extendedProps: { appt: a },
        };
      }),
    [appointments, colorMode],
  );

  async function patchTimes(id: number, startISO: string, endISO: string, revert: () => void) {
    try {
      await apiRequest(`/appointments/${id}`, { method: "PATCH", body: { startTime: startISO, endTime: endISO } });
      toast.success("Agendamento atualizado");
      reload();
    } catch (err) {
      revert();
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar");
    }
  }

  function onEventDrop(arg: EventDropArg) {
    const { start, end } = arg.event;
    if (!start || !end) return arg.revert();
    void patchTimes(Number(arg.event.id), start.toISOString(), end.toISOString(), arg.revert);
  }

  function onEventResize(arg: EventResizeDoneArg) {
    const { start, end } = arg.event;
    if (!start || !end) return arg.revert();
    void patchTimes(Number(arg.event.id), start.toISOString(), end.toISOString(), arg.revert);
  }

  function onSelect(arg: DateSelectArg) {
    setCreateSel({ start: arg.start, end: arg.end });
    setCreateOpen(true);
    arg.view.calendar.unselect();
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
    const a = arg.event.extendedProps.appt as Appointment;
    const service = a.service ?? services.find((s) => s.id === a.serviceId);
    return (
      <div className="flex flex-col overflow-hidden px-1 py-0.5 leading-tight">
        <span className="text-[11px] opacity-90">{arg.timeText}</span>
        <span className="truncate text-xs font-semibold">{a.customerName}</span>
        {service ? <span className="truncate text-[11px] opacity-90">{service.name}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <ColorLegend mode={colorMode} services={services} />
        <ColorModeToggle mode={colorMode} onChange={changeColorMode} />
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
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={ptBrLocale}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "novo timeGridWeek,timeGridDay,dayGridMonth",
          }}
          customButtons={{ novo: { text: "+ Novo", click: openCreateDefault } }}
          buttonText={{ today: "Hoje", week: "Semana", day: "Dia", month: "Mês" }}
          allDaySlot={false}
          nowIndicator
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          slotMinTime={slotMinTime}
          slotMaxTime={slotMaxTime}
          businessHours={businessHours}
          expandRows
          height="100%"
          selectable
          selectMirror
          editable
          eventResizableFromStart
          events={events}
          datesSet={onDatesSet}
          select={onSelect}
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
