// Helpers de data para o calendário (conversão p/ inputs datetime-local e rótulos).

/** Date → valor de <input type="datetime-local"> (horário local, sem timezone). */
export function toLocalInputValue(d: Date): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/** Valor de datetime-local → ISO (UTC) para enviar à API. */
export function localInputToISO(v: string): string {
  return new Date(v).toISOString();
}

/** "1h30", "45 min" etc. */
export function durationLabel(start: Date, end: Date): string {
  const mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
