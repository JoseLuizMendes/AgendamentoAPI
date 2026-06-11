import { LayoutDashboard } from "lucide-react";

import { Eyebrow } from "@/components/brand/eyebrow";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <Eyebrow className="mb-4">Indicadores</Eyebrow>
      <div className="border-border flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-24 text-center">
        <LayoutDashboard className="text-muted-foreground size-8" />
        <div>
          <p className="font-display text-2xl tracking-wide">Dashboard de performance</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Receita, clientes, ticket médio, taxa de ocupação e no-show — com filtros por dia, semana, mês,
            trimestre e semestre, e comparativo com o período anterior. Chega na próxima etapa.
          </p>
        </div>
      </div>
    </div>
  );
}
