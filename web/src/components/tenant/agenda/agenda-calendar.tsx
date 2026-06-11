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
import { useTenant } from "@/components/tenant/tenant-context";
import type { Appointment } from "@/components/tenant/types";
import { serviceColor } from "./colors";
import { AppointmentCreateDrawer } from "./appointment-create-drawer";
import { AppointmentDetailDrawer } from "./appointment-detail-drawer";

const ACTIVE = new Set(["SCHEDULED", "CONFIRMED"]);

export function AgendaCalendar() {
  const { services, hours } = useTenant();
  const rangeRef = useRef<{ start: string; end: string } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [createSel, setCreateSel] = useState<{ start: Date; end: Date } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // FullCalendar acessa o DOM — renderiza só após montar (evita SSR/hydration).
  useEffect(() => setMounted(true), []);

  const fetchRange = useCallback(async (startISO: string, endISO: string) => {
    try {
      const res = await apiRequest<Appointment[]>(
        `/appointments?from=${encodeURIComponent(startISO)}&to=${encodeURIComponent(endISO)}`,
      );
      setAppointments(res);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        toast.error(err instanceof ApiError ? err.message : "Erro ao carregar agenda");
      }
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
        const color = serviceColor(a.serviceId);
        return {
          id: String(a.id),
          start: a.startTime,
          end: a.endTime,
          editable: ACTIVE.has(a.status),
          backgroundColor: muted ? "var(--muted)" : color.bg,
          borderColor: muted ? "var(--border)" : color.border,
          textColor: muted ? "var(--muted-foreground)" : color.text,
          classNames: muted ? ["fc-appt-muted"] : [],
          extendedProps: { appt: a },
        };
      }),
    [appointments],
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
