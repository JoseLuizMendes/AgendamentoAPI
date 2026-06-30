import * as Sentry from "@sentry/nextjs";
import { scrubEvent, type ScrubbableEvent } from "@/lib/sentry-scrub";

/**
 * Instrumentação do Sentry no servidor/edge do Next. Gate por DSN: sem `NEXT_PUBLIC_SENTRY_DSN`
 * (ou `SENTRY_DSN`), não inicializa (no-op — dev/local não envia nada). `sendDefaultPii:false` +
 * `beforeSend` (scrub) garantem que cookie/Authorization/senha não saiam.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      scrubEvent(event as unknown as ScrubbableEvent);
      return event;
    },
  });
}

// Captura erros de Server Components / route handlers (App Router).
export const onRequestError = Sentry.captureRequestError;
