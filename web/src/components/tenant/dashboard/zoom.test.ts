import { describe, it, expect } from "vitest";
import { zoomStep, MIN_SPAN } from "./zoom";

describe("zoomStep", () => {
  it("aproximar estreita a janela em torno do centro", () => {
    const w = zoomStep(0, 100, "in");
    expect(w.end - w.start).toBeLessThan(100);
    expect((w.start + w.end) / 2).toBeCloseTo(50);
  });

  it("afastar alarga a janela em torno do centro", () => {
    const w = zoomStep(30, 70, "out");
    expect(w.end - w.start).toBeGreaterThan(40);
    expect((w.start + w.end) / 2).toBeCloseTo(50);
  });

  it("nunca estreita além do span mínimo", () => {
    let w = { start: 45, end: 55 };
    for (let i = 0; i < 20; i++) w = zoomStep(w.start, w.end, "in");
    expect(w.end - w.start).toBeGreaterThanOrEqual(MIN_SPAN);
  });

  it("clampa em 0–100 ao afastar", () => {
    const w = zoomStep(0, 90, "out");
    expect(w.start).toBeGreaterThanOrEqual(0);
    expect(w.end).toBeLessThanOrEqual(100);
  });

  it("afastar no zoom total é idempotente (fica 0–100)", () => {
    expect(zoomStep(0, 100, "out")).toEqual({ start: 0, end: 100 });
  });
});
