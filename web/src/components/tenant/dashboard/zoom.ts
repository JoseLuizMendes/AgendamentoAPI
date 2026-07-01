/** Menor janela (em % do eixo) que os botões +/− permitem — evita zoom "quebrado". */
export const MIN_SPAN = 8;

/** Quanto a janela encolhe/cresce por passo (proporção do span atual). */
const STEP = 0.3;

/**
 * Próxima janela do dataZoom (percentuais 0–100) ao apertar +/−: estreita ou
 * alarga ~30% em torno do centro, respeitando o span mínimo e o clamp 0–100.
 * Pura → testável no Vitest.
 */
export function zoomStep(start: number, end: number, dir: "in" | "out"): { start: number; end: number } {
  const span = end - start;
  const center = (start + end) / 2;
  const nextSpan =
    dir === "in" ? Math.max(MIN_SPAN, span * (1 - STEP)) : Math.min(100, span * (1 + STEP));
  let s = center - nextSpan / 2;
  let e = center + nextSpan / 2;
  if (s < 0) {
    e -= s;
    s = 0;
  }
  if (e > 100) {
    s -= e - 100;
    e = 100;
  }
  return { start: Math.max(0, s), end: Math.min(100, e) };
}
