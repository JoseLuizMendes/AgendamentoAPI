import type { Service } from "@/components/tenant/types";

export type ServicesSummary = {
  count: number;
  avgPriceInCents: number;
  avgDurationMin: number;
  totalPriceInCents: number;
  totalDurationMin: number;
};

/** Agregados só-leitura dos serviços (somas + médias arredondadas; zero quando vazio). */
export function summarizeServices(services: Service[]): ServicesSummary {
  const count = services.length;
  if (count === 0) {
    return { count: 0, avgPriceInCents: 0, avgDurationMin: 0, totalPriceInCents: 0, totalDurationMin: 0 };
  }
  const totalPriceInCents = services.reduce((sum, s) => sum + s.priceInCents, 0);
  const totalDurationMin = services.reduce((sum, s) => sum + s.durationInMinutes, 0);
  return {
    count,
    avgPriceInCents: Math.round(totalPriceInCents / count),
    avgDurationMin: Math.round(totalDurationMin / count),
    totalPriceInCents,
    totalDurationMin,
  };
}

export type ServiceHighlights = {
  mostExpensive: Service | null;
  cheapest: Service | null;
  longest: Service | null;
  shortest: Service | null;
};

/** Serviços nos extremos de preço e duração (null quando a lista é vazia). */
export function serviceHighlights(services: Service[]): ServiceHighlights {
  if (services.length === 0) {
    return { mostExpensive: null, cheapest: null, longest: null, shortest: null };
  }
  const byPriceDesc = [...services].sort((a, b) => b.priceInCents - a.priceInCents);
  const byDurationDesc = [...services].sort((a, b) => b.durationInMinutes - a.durationInMinutes);
  return {
    mostExpensive: byPriceDesc[0],
    cheapest: byPriceDesc[byPriceDesc.length - 1],
    longest: byDurationDesc[0],
    shortest: byDurationDesc[byDurationDesc.length - 1],
  };
}

export type PriceBucket = { label: string; count: number };

// Faixas de preço (em centavos). Limite inferior inclusivo, superior exclusivo.
const BUCKETS: { label: string; max: number }[] = [
  { label: "até R$50", max: 5000 },
  { label: "R$50–100", max: 10000 },
  { label: "R$100–200", max: 20000 },
  { label: "R$200+", max: Infinity },
];

/** Distribuição dos serviços por faixa de preço (para o gráfico). */
export function priceBuckets(services: Service[]): PriceBucket[] {
  return BUCKETS.map((bucket, i) => {
    const min = i === 0 ? 0 : BUCKETS[i - 1].max;
    const count = services.filter((s) => s.priceInCents >= min && s.priceInCents < bucket.max).length;
    return { label: bucket.label, count };
  });
}

// Faixas de duração (em minutos). Limite inferior inclusivo, superior exclusivo.
const DURATION_BUCKETS: { label: string; max: number }[] = [
  { label: "< 30 min", max: 30 },
  { label: "30–60 min", max: 60 },
  { label: "60–120 min", max: 120 },
  { label: "120 min+", max: Infinity },
];

/** Distribuição dos serviços por faixa de duração (para o gráfico do Resumo). */
export function durationBuckets(services: Service[]): PriceBucket[] {
  return DURATION_BUCKETS.map((bucket, i) => {
    const min = i === 0 ? 0 : DURATION_BUCKETS[i - 1].max;
    const count = services.filter(
      (s) => s.durationInMinutes >= min && s.durationInMinutes < bucket.max,
    ).length;
    return { label: bucket.label, count };
  });
}
