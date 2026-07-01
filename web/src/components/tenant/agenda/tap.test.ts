import { describe, it, expect } from "vitest";
import { tapRange } from "./tap";

describe("tapRange", () => {
  it("preserva o instante tocado como início", () => {
    const date = new Date("2026-07-01T14:15:00");
    expect(tapRange(date).start.getTime()).toBe(date.getTime());
  });

  it("cria uma janela de 1 hora (mesma duração default do 'Novo')", () => {
    const date = new Date("2026-07-01T09:30:00");
    const { start, end } = tapRange(date);
    expect(end.getTime() - start.getTime()).toBe(60 * 60_000);
  });

  it("não muta a data recebida", () => {
    const date = new Date("2026-07-01T10:00:00");
    const before = date.getTime();
    tapRange(date);
    expect(date.getTime()).toBe(before);
  });
});
