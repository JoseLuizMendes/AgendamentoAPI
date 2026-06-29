import { describe, it, expect } from "vitest";
import { upcomingOverrides } from "./overrides-list";
import type { BusinessDateOverride } from "@/components/tenant/types";

function ov(date: string): BusinessDateOverride {
  return { id: Number(date.replaceAll("-", "")), date, isOff: true, tenantId: 1 };
}

describe("upcomingOverrides", () => {
  const today = "2026-06-19";

  it("oculta datas passadas (anteriores a hoje)", () => {
    const list = [ov("2026-06-16"), ov("2026-06-20")];
    expect(upcomingOverrides(list, today).map((o) => o.date)).toEqual(["2026-06-20"]);
  });

  it("mantém a data de hoje (expira só quando o dia passa)", () => {
    const list = [ov("2026-06-19")];
    expect(upcomingOverrides(list, today).map((o) => o.date)).toEqual(["2026-06-19"]);
  });

  it("ordena por data crescente", () => {
    const list = [ov("2026-07-01"), ov("2026-06-25"), ov("2026-06-20")];
    expect(upcomingOverrides(list, today).map((o) => o.date)).toEqual([
      "2026-06-20",
      "2026-06-25",
      "2026-07-01",
    ]);
  });

  it("lista vazia → vazio", () => {
    expect(upcomingOverrides([], today)).toEqual([]);
  });
});
