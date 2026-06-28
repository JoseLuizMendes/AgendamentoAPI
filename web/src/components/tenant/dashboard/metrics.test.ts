import { describe, it, expect } from "vitest";
import { clientSplit, formatRate } from "./metrics";

describe("clientSplit", () => {
  it("sem clientes → tudo zero, proporção 0", () => {
    expect(clientSplit({ clients: 0, newClients: 0 })).toEqual({
      novos: 0,
      recorrentes: 0,
      totalClientes: 0,
      novosPct: 0,
    });
  });

  it("só novos → recorrentes 0, proporção 1", () => {
    expect(clientSplit({ clients: 3, newClients: 3 })).toEqual({
      novos: 3,
      recorrentes: 0,
      totalClientes: 3,
      novosPct: 1,
    });
  });

  it("mistura: recorrentes = clients - novos", () => {
    const r = clientSplit({ clients: 10, newClients: 4 });
    expect(r.novos).toBe(4);
    expect(r.recorrentes).toBe(6);
    expect(r.novosPct).toBeCloseTo(0.4);
  });

  it("defensivo: newClients nunca passa de clients (recorrentes ≥ 0)", () => {
    const r = clientSplit({ clients: 2, newClients: 5 });
    expect(r.novos).toBe(2);
    expect(r.recorrentes).toBe(0);
  });
});

describe("formatRate", () => {
  it("sem base (denominador zero) → '—'", () => {
    expect(formatRate(0.5, false)).toBe("—");
  });
  it("com base → percentual arredondado", () => {
    expect(formatRate(0.123, true)).toBe("12%");
    expect(formatRate(0, true)).toBe("0%");
  });
});
