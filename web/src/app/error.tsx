"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/report-error";

/**
 * Error Boundary das rotas (App Router). Renderiza dentro do root layout, então só
 * precisa do conteúdo do fallback (sem <html>/<body>). Evita a "tela branca" quando
 * um componente quebra no render e oferece `reset()` para tentar de novo.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({ message: error.message, stack: error.stack, kind: "render" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Algo deu errado</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Encontramos um problema ao carregar esta parte do app. Você pode tentar de novo —
          o resto do app continua funcionando.
        </p>
      </div>
      <Button onClick={() => reset()}>Tentar de novo</Button>
    </div>
  );
}
