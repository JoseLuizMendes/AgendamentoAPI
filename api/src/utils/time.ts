export function parseTimeToMinutes(time: string): number {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Formato de horário inválido. Use HH:MM");
  }

  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error("Horário inválido");
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Horário fora do intervalo");
  }

  return hours * 60 + minutes;
}

export function assertIsoDate(date: string): void {
  // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida. Use YYYY-MM-DD");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data inválida");
  }
}

export function toDayOfWeekUtc(date: string): number {
  assertIsoDate(date);
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

export function dateAtUtcTime(date: string, time: string): Date {
  assertIsoDate(date);
  parseTimeToMinutes(time);

  const parsed = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data/hora inválida");
  }

  return parsed;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function toIso(date: Date): string {
  return date.toISOString();
}
