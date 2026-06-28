"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/**
 * Registra os listeners globais do navegador para erros que a Error Boundary não pega
 * (erros assíncronos / fora do render): `window.onerror` e `unhandledrejection`.
 * É integração com o DOM (não é fetch de dados), então `useEffect` é o lugar certo.
 * Não renderiza nada.
 */
export function ClientErrorListeners() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError({
        message: event.message || "Unknown error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        kind: "unhandled",
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportClientError({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        kind: "rejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
