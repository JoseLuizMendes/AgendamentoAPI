export type ClientErrorKind = "render" | "unhandled" | "rejection";

export interface ClientErrorPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  kind?: ClientErrorKind;
}

// Guarda contra loop: enquanto um report está em voo não reentra (um erro no próprio
// caminho de report não deve disparar outro report).
let inFlight = false;

/**
 * Envia um relatório de erro para `POST /client-errors`, **fire-and-forget**:
 * - nunca lança (rede caída/erro de fetch é engolido) — não pode derrubar a app;
 * - não usa `apiRequest` (que lançaria `ApiError` e acoplaria a auth);
 * - acrescenta `url`, `userAgent` e `appVersion` ao payload.
 */
export async function reportClientError(payload: ClientErrorPayload): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    // Lê `process.env.NEXT_PUBLIC_*` literalmente para o Next inlinar no bundle do cliente.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

    const body = {
      ...payload,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
    };

    await fetch(`${apiUrl}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Permite o envio mesmo se a página estiver sendo descarregada.
      keepalive: true,
    });
  } catch {
    // Silencioso de propósito: observabilidade nunca pode quebrar a app.
  } finally {
    inFlight = false;
  }
}
