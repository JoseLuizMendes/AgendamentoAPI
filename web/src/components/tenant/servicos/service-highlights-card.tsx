"use client";

import { ArrowDown, ArrowUp, Coins, Hourglass, Tag, Timer } from "lucide-react";

import { useTenant } from "@/components/tenant/tenant-context";
import { EmptyState, StatRow, formatBRL } from "@/components/tenant/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { serviceHighlights, summarizeServices } from "./services-stats";
import type { Service } from "@/components/tenant/types";

/** Minutos → "Xh Ymin" / "Xh" / "Y min". */
function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

type IconType = React.ComponentType<{ className?: string }>;

function HighlightRow({
  icon: Icon,
  label,
  service,
  value,
}: {
  icon: IconType;
  label: string;
  service: Service | null;
  value: (s: Service) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <span className="text-muted-foreground flex shrink-0 items-center gap-2">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="min-w-0 truncate text-right">
        {service ? (
          <>
            <span className="font-medium">{service.name}</span>
            <span className="text-muted-foreground font-mono"> · {value(service)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
    </div>
  );
}

/** Destaques: serviços nos extremos de preço e duração (derivado de `services`). */
export function ServiceHighlightsCard({ className }: { className?: string }) {
  const { services } = useTenant();
  const h = serviceHighlights(services);
  const s = summarizeServices(services);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-wide">Destaques</CardTitle>
        <CardDescription>Extremos de preço e duração.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        {services.length === 0 ? (
          <EmptyState icon={Tag}>Nenhum serviço cadastrado.</EmptyState>
        ) : (
          <>
            <HighlightRow icon={ArrowUp} label="Mais caro" service={h.mostExpensive} value={(svc) => formatBRL(svc.priceInCents)} />
            <HighlightRow icon={ArrowDown} label="Mais barato" service={h.cheapest} value={(svc) => formatBRL(svc.priceInCents)} />
            <HighlightRow icon={Timer} label="Mais longo" service={h.longest} value={(svc) => `${svc.durationInMinutes} min`} />
            <HighlightRow icon={Timer} label="Mais curto" service={h.shortest} value={(svc) => `${svc.durationInMinutes} min`} />
            <StatRow icon={Coins} label="Valor total" value={formatBRL(s.totalPriceInCents)} />
            <StatRow icon={Hourglass} label="Tempo total" value={formatMinutes(s.totalDurationMin)} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
