import type { Appointment } from "@/components/tenant/types";

export type Client = {
  phone: string;
  name: string;
  visits: number; // atendimentos não cancelados
  noShows: number; // status NO_SHOW
  lastVisit: string; // maior startTime (ISO)
  firstVisit: string; // menor startTime (ISO)
  totalInCents: number; // soma dos concluídos
};

/** Ticket médio do cliente (gasto por visita); 0 quando sem visitas. */
export function avgTicketInCents(c: Client): number {
  return c.visits > 0 ? Math.round(c.totalInCents / c.visits) : 0;
}

export type ClientSortKey = "recent" | "visits" | "total" | "name";

/**
 * Base de clientes derivada dos agendamentos (não há model Customer). Agrega por
 * `customerPhone || customerName`. Regras: `visits` ignora CANCELED; `totalInCents` soma só
 * COMPLETED; `name` segue o da visita mais recente.
 */
export function aggregateClients(appts: Appointment[]): Client[] {
  const map = new Map<string, Client>();
  for (const a of appts) {
    const key = a.customerPhone || a.customerName;
    const ts = +new Date(a.startTime);
    const price = a.status === "COMPLETED" ? (a.service?.priceInCents ?? 0) : 0;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        phone: a.customerPhone,
        name: a.customerName,
        visits: a.status === "CANCELED" ? 0 : 1,
        noShows: a.status === "NO_SHOW" ? 1 : 0,
        lastVisit: a.startTime,
        firstVisit: a.startTime,
        totalInCents: price,
      });
      continue;
    }
    if (a.status !== "CANCELED") cur.visits += 1;
    if (a.status === "NO_SHOW") cur.noShows += 1;
    cur.totalInCents += price;
    if (ts > +new Date(cur.lastVisit)) {
      cur.lastVisit = a.startTime;
      cur.name = a.customerName;
    }
    if (ts < +new Date(cur.firstVisit)) {
      cur.firstVisit = a.startTime;
    }
  }
  return [...map.values()];
}

export function filterClients(clients: Client[], query: string): Client[] {
  const q = query.trim().toLowerCase();
  if (!q) return clients;
  return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
}

export function sortClients(clients: Client[], key: ClientSortKey): Client[] {
  return [...clients].sort((a, b) => {
    if (key === "visits") return b.visits - a.visits;
    if (key === "total") return b.totalInCents - a.totalInCents;
    if (key === "name") return a.name.localeCompare(b.name);
    return +new Date(b.lastVisit) - +new Date(a.lastVisit);
  });
}

export type ClientsSummary = {
  total: number;
  recurring: number; // clientes com mais de 1 visita
  ticketMedioInCents: number; // soma(total) / soma(visitas)
  totalInCents: number;
};

export function summarizeClients(clients: Client[]): ClientsSummary {
  const total = clients.length;
  const totalInCents = clients.reduce((s, c) => s + c.totalInCents, 0);
  const totalVisits = clients.reduce((s, c) => s + c.visits, 0);
  const recurring = clients.filter((c) => c.visits > 1).length;
  return {
    total,
    recurring,
    ticketMedioInCents: totalVisits > 0 ? Math.round(totalInCents / totalVisits) : 0,
    totalInCents,
  };
}

export type ClientHighlights = {
  topSpender: Client | null;
  topVisitor: Client | null;
  mostRecent: Client | null; // última visita mais recente
  newest: Client | null; // 1ª visita mais recente (entrou por último)
  mostInactive: Client | null; // última visita mais antiga (há mais tempo sem voltar)
  topAvgTicket: Client | null; // maior gasto por visita
  mostNoShows: Client | null; // mais faltas (null se ninguém faltou)
};

export function clientHighlights(clients: Client[]): ClientHighlights {
  if (clients.length === 0) {
    return {
      topSpender: null,
      topVisitor: null,
      mostRecent: null,
      newest: null,
      mostInactive: null,
      topAvgTicket: null,
      mostNoShows: null,
    };
  }
  const max = (f: (c: Client) => number) => [...clients].sort((a, b) => f(b) - f(a))[0];
  const topNoShows = max((c) => c.noShows);
  return {
    topSpender: max((c) => c.totalInCents),
    topVisitor: max((c) => c.visits),
    mostRecent: max((c) => +new Date(c.lastVisit)),
    newest: max((c) => +new Date(c.firstVisit)),
    mostInactive: max((c) => -new Date(c.lastVisit).getTime()), // menor lastVisit
    topAvgTicket: max(avgTicketInCents),
    mostNoShows: topNoShows.noShows > 0 ? topNoShows : null,
  };
}

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Data curta a partir do ISO ("2026-06-16…" → "16 jun 26"), tz-independente (usa o calendário do ISO). */
export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS_PT[Number(month) - 1]} ${year.slice(2)}`;
}

/** Novos clientes por mês (pela 1ª visita), nos últimos `monthsBack` meses. */
export function newClientsByMonth(
  clients: Client[],
  monthsBack = 6,
  now: Date = new Date(),
): { label: string; count: number }[] {
  const buckets: { key: string; label: string; count: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: MONTHS_PT[d.getMonth()], count: 0 });
  }
  for (const c of clients) {
    const k = c.firstVisit.slice(0, 7); // "YYYY-MM" (tz-independente)
    const b = buckets.find((x) => x.key === k);
    if (b) b.count += 1;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}
