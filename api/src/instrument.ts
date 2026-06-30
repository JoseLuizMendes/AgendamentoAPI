// Inicialização do Sentry — DEVE rodar ANTES do app (a auto-instrumentação OTel do @sentry/node
// precisa preceder o import de fastify/pg). Importado como 1ª linha de `server.ts` e via
// `node --import ./dist/instrument.js` em produção (ver docker-entrypoint.sh).
//
// Gate por DSN: sem `config.sentry` (sem SENTRY_DSN), NÃO inicializa → no-op (dev/local não envia nada).
import "dotenv/config";
import * as Sentry from "@sentry/node";
import { config } from "./config.js";
import { scrubEvent, type ScrubbableEvent } from "./observability/scrub.js";

if (config.sentry) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    release: config.sentry.release,
    tracesSampleRate: config.sentry.tracesSampleRate,
    // Não captura cookies/headers/IP por padrão; o beforeSend é defesa adicional (scrub).
    sendDefaultPii: false,
    beforeSend(event) {
      scrubEvent(event as unknown as ScrubbableEvent);
      return event;
    },
  });
}
