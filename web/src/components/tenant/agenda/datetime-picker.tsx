"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { HourPicker } from "@/components/ui/hour-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Seletor de data + hora baseado no Calendar do shadcn. `value`/`onChange` no
 * formato datetime-local ("YYYY-MM-DDTHH:mm") — drop-in para `<Input type="datetime-local">`.
 */
export function DateTimePicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const date = value ? new Date(value) : undefined;
  const valid = date !== undefined && !Number.isNaN(date.getTime());
  const time = value ? value.slice(11, 16) : "09:00";

  function setDay(d: Date | undefined) {
    if (!d) return;
    onChange(`${format(d, "yyyy-MM-dd")}T${time}`);
  }
  function setTime(t: string) {
    const day = value ? value.slice(0, 10) : format(new Date(), "yyyy-MM-dd");
    onChange(`${day}T${t}`);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn("h-11 w-full justify-start gap-2 font-normal", !valid && "text-muted-foreground")}
        >
          <CalendarClock className="size-4 shrink-0" />
          <span className="truncate">
            {valid ? format(date, "dd 'de' MMM · HH:mm", { locale: ptBR }) : "Escolher data e hora"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={valid ? date : undefined}
          defaultMonth={valid ? date : undefined}
          onSelect={setDay}
          locale={ptBR}
          autoFocus
        />
        <div className="space-y-1.5 border-t p-3">
          <p className="text-muted-foreground text-xs">Hora</p>
          <HourPicker value={time} onChange={setTime} aria-label="Hora" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
