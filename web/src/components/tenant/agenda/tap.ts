const TAP_DURATION_MS = 60 * 60_000;

/**
 * Janela de agendamento a partir de um toque na grade (mobile): começa no slot
 * tocado (o FullCalendar já entrega o instante snapped em 15 min) e dura 1h —
 * a mesma duração default do botão "Novo". Pura → testável no Vitest.
 */
export function tapRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getTime());
  return { start, end: new Date(start.getTime() + TAP_DURATION_MS) };
}
