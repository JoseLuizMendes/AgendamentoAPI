import { describe, it, expect } from "vitest";
import { calendarLayout } from "./layout";

describe("calendarLayout", () => {
  it("no desktop abre na semana com a toolbar completa", () => {
    const layout = calendarLayout(false);
    expect(layout.initialView).toBe("timeGridWeek");
    expect(layout.headerToolbar).toEqual({
      left: "prev,next today",
      center: "title",
      right: "novo timeGridWeek,timeGridDay,dayGridMonth",
    });
  });

  it("no mobile abre na lista (estilo Agenda) com toolbar enxuta", () => {
    const layout = calendarLayout(true);
    expect(layout.initialView).toBe("listWeek");
    expect(layout.headerToolbar).toEqual({
      left: "prev,next",
      center: "title",
      right: "listWeek,timeGridDay",
    });
  });

  it("no mobile alterna apenas entre lista e dia (sem semana/mês espremidos)", () => {
    const right = calendarLayout(true).headerToolbar.right ?? "";
    expect(right).not.toContain("timeGridWeek");
    expect(right).not.toContain("dayGridMonth");
    expect(right).toContain("listWeek");
    expect(right).toContain("timeGridDay");
  });

  it("não inclui o botão 'novo' na toolbar do mobile (vira ação fora da grade)", () => {
    expect(calendarLayout(true).headerToolbar.right ?? "").not.toContain("novo");
  });
});
