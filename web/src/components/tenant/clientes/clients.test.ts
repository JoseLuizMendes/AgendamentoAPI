import { describe, it, expect } from "vitest";
import {
  aggregateClients,
  filterClients,
  sortClients,
  summarizeClients,
  clientHighlights,
  newClientsByMonth,
  avgTicketInCents,
  formatShortDate,
  type Client,
} from "./clients";
import type { Appointment, Service } from "@/components/tenant/types";

const svc: Service = { id: 1, name: "Corte", priceInCents: 5000, durationInMinutes: 30, tenantId: 1 };

function appt(p: Partial<Appointment>): Appointment {
  return {
    id: p.id ?? 1,
    customerName: p.customerName ?? "Cliente",
    customerPhone: p.customerPhone ?? "",
    customerEmail: null,
    notes: null,
    serviceId: 1,
    tenantId: 1,
    userId: null,
    startTime: p.startTime ?? "2026-01-01T10:00:00.000Z",
    endTime: p.endTime ?? "2026-01-01T11:00:00.000Z",
    status: p.status ?? "COMPLETED",
    service: p.service ?? svc,
  };
}

function cli(p: Partial<Client> & { name: string }): Client {
  return {
    phone: p.phone ?? "",
    name: p.name,
    visits: p.visits ?? 1,
    noShows: p.noShows ?? 0,
    lastVisit: p.lastVisit ?? "2026-01-01T10:00:00.000Z",
    firstVisit: p.firstVisit ?? "2026-01-01T10:00:00.000Z",
    totalInCents: p.totalInCents ?? 0,
  };
}

describe("aggregateClients", () => {
  it("agrega por telefone: visitas (não-canceladas), total (só concluídos), primeira/última visita", () => {
    const appts = [
      appt({ customerPhone: "11", customerName: "Ana", status: "COMPLETED", startTime: "2026-03-01T10:00:00.000Z" }),
      appt({ customerPhone: "11", customerName: "Ana M.", status: "SCHEDULED", startTime: "2026-05-01T10:00:00.000Z" }),
      appt({ customerPhone: "11", customerName: "Ana", status: "CANCELED", startTime: "2026-02-01T10:00:00.000Z" }),
    ];
    const [c] = aggregateClients(appts);
    expect(c.phone).toBe("11");
    expect(c.visits).toBe(2); // ignora o CANCELED
    expect(c.totalInCents).toBe(5000); // só o COMPLETED
    expect(c.firstVisit).toBe("2026-02-01T10:00:00.000Z"); // menor startTime (inclui cancelado)
    expect(c.lastVisit).toBe("2026-05-01T10:00:00.000Z"); // maior startTime
    expect(c.name).toBe("Ana M."); // nome da visita mais recente
  });

  it("separa clientes distintos", () => {
    const appts = [appt({ customerPhone: "1" }), appt({ customerPhone: "2" })];
    expect(aggregateClients(appts)).toHaveLength(2);
  });

  it("conta no-shows separadamente (no-show também conta como visita)", () => {
    const appts = [
      appt({ customerPhone: "9", status: "COMPLETED" }),
      appt({ customerPhone: "9", status: "NO_SHOW" }),
    ];
    const [c] = aggregateClients(appts);
    expect(c.visits).toBe(2);
    expect(c.noShows).toBe(1);
  });
});

describe("avgTicketInCents", () => {
  it("gasto por visita (0 quando sem visitas)", () => {
    expect(avgTicketInCents(cli({ name: "A", totalInCents: 30000, visits: 3 }))).toBe(10000);
    expect(avgTicketInCents(cli({ name: "B", totalInCents: 0, visits: 0 }))).toBe(0);
  });
});

describe("filterClients", () => {
  const list = [cli({ name: "Ana", phone: "1199" }), cli({ name: "Bruno", phone: "2188" })];
  it("filtra por nome (case-insensitive)", () => {
    expect(filterClients(list, "ana").map((c) => c.name)).toEqual(["Ana"]);
  });
  it("filtra por telefone", () => {
    expect(filterClients(list, "2188").map((c) => c.name)).toEqual(["Bruno"]);
  });
  it("query vazia → todos", () => {
    expect(filterClients(list, "  ")).toHaveLength(2);
  });
});

describe("sortClients", () => {
  const a = cli({ name: "Ana", visits: 5, totalInCents: 100, lastVisit: "2026-01-01T00:00:00.000Z" });
  const b = cli({ name: "Bruno", visits: 2, totalInCents: 900, lastVisit: "2026-06-01T00:00:00.000Z" });
  it("recent: última visita desc", () => expect(sortClients([a, b], "recent")[0].name).toBe("Bruno"));
  it("visits: visitas desc", () => expect(sortClients([a, b], "visits")[0].name).toBe("Ana"));
  it("total: gasto desc", () => expect(sortClients([a, b], "total")[0].name).toBe("Bruno"));
  it("name: A-Z", () => expect(sortClients([b, a], "name")[0].name).toBe("Ana"));
});

describe("summarizeClients", () => {
  it("vazio → zeros", () => {
    expect(summarizeClients([])).toEqual({ total: 0, recurring: 0, ticketMedioInCents: 0, totalInCents: 0 });
  });
  it("conta recorrentes (>1 visita) e ticket médio = total/visitas", () => {
    const list = [
      cli({ name: "A", visits: 3, totalInCents: 30000 }),
      cli({ name: "B", visits: 1, totalInCents: 10000 }),
    ];
    // total 40000, visitas 4 → ticket 10000; recorrentes = 1 (A)
    expect(summarizeClients(list)).toEqual({
      total: 2,
      recurring: 1,
      ticketMedioInCents: 10000,
      totalInCents: 40000,
    });
  });
});

describe("clientHighlights", () => {
  it("vazio → tudo null", () => {
    expect(clientHighlights([])).toEqual({
      topSpender: null,
      topVisitor: null,
      mostRecent: null,
      newest: null,
      mostInactive: null,
      topAvgTicket: null,
      mostNoShows: null,
    });
  });

  it("escolhe maior gasto, mais visitas e mais recente", () => {
    const a = cli({ name: "A", visits: 9, totalInCents: 100, lastVisit: "2026-01-01T00:00:00.000Z" });
    const b = cli({ name: "B", visits: 1, totalInCents: 999, lastVisit: "2026-07-01T00:00:00.000Z" });
    const h = clientHighlights([a, b]);
    expect(h.topSpender?.name).toBe("B");
    expect(h.topVisitor?.name).toBe("A");
    expect(h.mostRecent?.name).toBe("B");
  });

  it("novo (1ª visita mais recente), inativo (última visita mais antiga) e maior ticket médio", () => {
    const a = cli({
      name: "A",
      firstVisit: "2026-01-10T00:00:00.000Z",
      lastVisit: "2026-02-10T00:00:00.000Z",
      totalInCents: 30000,
      visits: 3, // ticket 10000
    });
    const b = cli({
      name: "B",
      firstVisit: "2026-06-01T00:00:00.000Z",
      lastVisit: "2026-06-05T00:00:00.000Z",
      totalInCents: 20000,
      visits: 1, // ticket 20000
    });
    const h = clientHighlights([a, b]);
    expect(h.newest?.name).toBe("B"); // 1ª visita mais recente
    expect(h.mostInactive?.name).toBe("A"); // última visita mais antiga
    expect(h.topAvgTicket?.name).toBe("B"); // 20000 > 10000
  });

  it("mostNoShows: cliente com mais faltas; null quando ninguém faltou", () => {
    const a = cli({ name: "A", noShows: 2 });
    const b = cli({ name: "B", noShows: 0 });
    expect(clientHighlights([a, b]).mostNoShows?.name).toBe("A");
    expect(clientHighlights([b]).mostNoShows).toBeNull();
  });
});

describe("formatShortDate", () => {
  it("formata o ISO como '16 jun 26' (sem zero à esquerda, mês pt-BR, ano 2 dígitos)", () => {
    expect(formatShortDate("2026-06-16T10:00:00.000Z")).toBe("16 jun 26");
  });
  it("é tz-independente: usa o dia do ISO, não o local", () => {
    expect(formatShortDate("2026-01-05T23:59:59.000Z")).toBe("5 jan 26");
    expect(formatShortDate("2026-12-31T00:00:00.000Z")).toBe("31 dez 26");
  });
});

describe("newClientsByMonth", () => {
  it("conta por mês da primeira visita, nos últimos N meses", () => {
    const now = new Date(2026, 5, 15); // junho/2026
    const list = [
      cli({ name: "A", firstVisit: "2026-06-02T12:00:00.000Z" }),
      cli({ name: "B", firstVisit: "2026-06-20T12:00:00.000Z" }),
      cli({ name: "C", firstVisit: "2026-04-10T12:00:00.000Z" }),
      cli({ name: "D", firstVisit: "2025-12-10T12:00:00.000Z" }), // fora da janela de 6 meses
    ];
    const out = newClientsByMonth(list, 6, now);
    expect(out).toHaveLength(6);
    expect(out.map((b) => b.label)).toEqual(["jan", "fev", "mar", "abr", "mai", "jun"]);
    expect(out.find((b) => b.label === "jun")?.count).toBe(2);
    expect(out.find((b) => b.label === "abr")?.count).toBe(1);
    expect(out.reduce((s, b) => s + b.count, 0)).toBe(3); // D ficou de fora
  });
});
