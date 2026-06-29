import { describe, it, expect } from "vitest";
import { summarizeServices, serviceHighlights, priceBuckets, durationBuckets } from "./services-stats";
import type { Service } from "@/components/tenant/types";

function svc(p: Partial<Service> & { id: number }): Service {
  return {
    id: p.id,
    name: p.name ?? `Serviço ${p.id}`,
    priceInCents: p.priceInCents ?? 5000,
    durationInMinutes: p.durationInMinutes ?? 30,
    tenantId: 1,
  };
}

describe("summarizeServices", () => {
  it("lista vazia → tudo zero", () => {
    expect(summarizeServices([])).toEqual({
      count: 0,
      avgPriceInCents: 0,
      avgDurationMin: 0,
      totalPriceInCents: 0,
      totalDurationMin: 0,
    });
  });

  it("conta, soma e calcula médias (arredondadas)", () => {
    const list = [
      svc({ id: 1, priceInCents: 5000, durationInMinutes: 30 }),
      svc({ id: 2, priceInCents: 10000, durationInMinutes: 45 }),
      svc({ id: 3, priceInCents: 10000, durationInMinutes: 60 }),
    ];
    // preço: soma 25000, média 8333.33 → 8333; duração: soma 135, média 45
    expect(summarizeServices(list)).toEqual({
      count: 3,
      avgPriceInCents: 8333,
      avgDurationMin: 45,
      totalPriceInCents: 25000,
      totalDurationMin: 135,
    });
  });
});

describe("serviceHighlights", () => {
  it("lista vazia → tudo null", () => {
    expect(serviceHighlights([])).toEqual({
      mostExpensive: null,
      cheapest: null,
      longest: null,
      shortest: null,
    });
  });

  it("seleciona extremos de preço e duração", () => {
    const a = svc({ id: 1, name: "A", priceInCents: 5000, durationInMinutes: 30 });
    const b = svc({ id: 2, name: "B", priceInCents: 20000, durationInMinutes: 15 });
    const c = svc({ id: 3, name: "C", priceInCents: 9000, durationInMinutes: 90 });
    const h = serviceHighlights([a, b, c]);
    expect(h.mostExpensive?.id).toBe(2);
    expect(h.cheapest?.id).toBe(1);
    expect(h.longest?.id).toBe(3);
    expect(h.shortest?.id).toBe(2);
  });

  it("um único serviço → ele em todos os destaques", () => {
    const only = svc({ id: 7 });
    const h = serviceHighlights([only]);
    expect([h.mostExpensive?.id, h.cheapest?.id, h.longest?.id, h.shortest?.id]).toEqual([7, 7, 7, 7]);
  });
});

describe("priceBuckets", () => {
  it("conta por faixa; R$50 cai em 'R$50–100' (limite inferior inclusivo)", () => {
    const list = [
      svc({ id: 1, priceInCents: 4999 }), // até R$50
      svc({ id: 2, priceInCents: 5000 }), // R$50–100
      svc({ id: 3, priceInCents: 15000 }), // R$100–200
      svc({ id: 4, priceInCents: 20000 }), // R$200+
      svc({ id: 5, priceInCents: 50000 }), // R$200+
    ];
    expect(priceBuckets(list)).toEqual([
      { label: "até R$50", count: 1 },
      { label: "R$50–100", count: 1 },
      { label: "R$100–200", count: 1 },
      { label: "R$200+", count: 2 },
    ]);
  });

  it("lista vazia → todas as faixas em zero", () => {
    expect(priceBuckets([]).every((b) => b.count === 0)).toBe(true);
  });
});

describe("durationBuckets", () => {
  it("conta por faixa; 30min cai em '30–60 min' (limite inferior inclusivo)", () => {
    const list = [
      svc({ id: 1, durationInMinutes: 20 }), // < 30 min
      svc({ id: 2, durationInMinutes: 30 }), // 30–60 min
      svc({ id: 3, durationInMinutes: 90 }), // 60–120 min
      svc({ id: 4, durationInMinutes: 120 }), // 120 min+
      svc({ id: 5, durationInMinutes: 240 }), // 120 min+
    ];
    expect(durationBuckets(list)).toEqual([
      { label: "< 30 min", count: 1 },
      { label: "30–60 min", count: 1 },
      { label: "60–120 min", count: 1 },
      { label: "120 min+", count: 2 },
    ]);
  });

  it("lista vazia → todas as faixas em zero", () => {
    expect(durationBuckets([]).every((b) => b.count === 0)).toBe(true);
  });
});
