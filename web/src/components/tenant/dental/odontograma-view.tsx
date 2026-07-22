"use client";

import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { OdontogramEntry, Patient } from "@/components/tenant/types";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMANENT_LOWER, PERMANENT_UPPER, PROCEDURE_LABEL, findPatientByPhone } from "./dental";

/**
 * Odontograma **consolidado** do paciente (read-only): resolve o paciente pelo telefone e
 * mostra o último procedimento por dente (GET /patients/:id/odontogram). Só é renderizado em DENTAL.
 */
export function PatientOdontogram({ phone }: { phone: string }) {
  const patientsQuery = useQuery({
    queryKey: ["patients", "search", phone],
    queryFn: () => apiRequest<Patient[]>(`/patients?search=${encodeURIComponent(phone)}`),
  });
  const patient = patientsQuery.data ? findPatientByPhone(patientsQuery.data, phone) : undefined;

  const odontogramQuery = useQuery({
    queryKey: ["patient", patient?.id, "odontogram"],
    queryFn: () => apiRequest<OdontogramEntry[]>(`/patients/${patient!.id}/odontogram`),
    enabled: patient !== undefined,
  });

  if (patientsQuery.isPending) return <Skeleton className="h-32 w-full" />;
  if (!patient) return <p className="text-muted-foreground text-sm">Sem ficha de paciente para este telefone.</p>;
  if (odontogramQuery.isPending) return <Skeleton className="h-32 w-full" />;
  if (odontogramQuery.isError) return <p className="text-destructive text-sm">Não foi possível carregar o odontograma.</p>;

  return <OdontogramaView entries={odontogramQuery.data ?? []} />;
}

/** Renderização pura, read-only, do odontograma a partir das entradas consolidadas. */
export function OdontogramaView({ entries }: { entries: OdontogramEntry[] }) {
  const byTooth = new Map(entries.map((e) => [e.toothFdi, e]));
  const sorted = [...entries].sort((a, b) => a.toothFdi - b.toothFdi);

  return (
    <div className="space-y-3">
      <div
        className="space-y-1.5 overflow-x-auto py-1"
        role="group"
        aria-label="Odontograma consolidado (notação FDI)"
      >
        <ReadRow teeth={PERMANENT_UPPER} byTooth={byTooth} />
        <ReadRow teeth={PERMANENT_LOWER} byTooth={byTooth} />
      </div>

      {sorted.length > 0 ? (
        <ul className="space-y-1">
          {sorted.map((e) => (
            <li key={e.toothFdi} className="text-sm">
              <span className="font-mono">{e.toothFdi}</span>
              <span className="text-muted-foreground"> · {PROCEDURE_LABEL[e.procedure]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum procedimento registrado ainda.</p>
      )}
    </div>
  );
}

function ReadRow({ teeth, byTooth }: { teeth: readonly number[]; byTooth: Map<number, OdontogramEntry> }) {
  return (
    <div className="flex justify-center gap-0.5">
      {teeth.map((fdi, i) => {
        const entry = byTooth.get(fdi);
        const marked = entry !== undefined;
        return (
          <span
            key={fdi}
            title={marked ? `${fdi} · ${PROCEDURE_LABEL[entry.procedure]}` : `Dente ${fdi}`}
            aria-label={marked ? `Dente ${fdi}: ${PROCEDURE_LABEL[entry.procedure]}` : `Dente ${fdi} sem registro`}
            className={cn(
              "flex h-8 w-5 shrink-0 items-center justify-center rounded-md border font-mono text-[9px]",
              i === 8 ? "ml-2" : "",
              marked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {fdi}
          </span>
        );
      })}
    </div>
  );
}
