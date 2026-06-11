import { Users } from "lucide-react";

import { Eyebrow } from "@/components/brand/eyebrow";

export default function ClientesPage() {
  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <Eyebrow className="mb-4">Base de clientes</Eyebrow>
      <div className="border-border flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-24 text-center">
        <Users className="text-muted-foreground size-8" />
        <div>
          <p className="font-display text-2xl tracking-wide">Clientes</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Lista de clientes a partir dos agendamentos — nº de visitas, última visita e total gasto, com busca e
            ordenação. Chega na próxima etapa.
          </p>
        </div>
      </div>
    </div>
  );
}
