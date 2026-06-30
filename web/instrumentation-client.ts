import * as Sentry from "@sentry/nextjs";
import { scrubEvent, type ScrubbableEvent } from "@/lib/sentry-scrub";

/**
 * Instrumentação do Sentry no cliente (browser). Gate por DSN público: sem
 * `NEXT_PUBLIC_SENTRY_DSN`, não inicializa (no-op). Scrub via `beforeSend`.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
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

// Tracing de navegação (App Router).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
