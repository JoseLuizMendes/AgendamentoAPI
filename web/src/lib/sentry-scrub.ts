/**
 * Scrub de dados sensíveis para a telemetria (Sentry `beforeSend`) — espelha o da API
 * (web e api são pacotes separados, sem lib compartilhada). Puro/idempotente.
 */
export interface ScrubbableEvent {
  request?: {
    url?: string;
    headers?: Record<string, unknown>;
    cookies?: unknown;
    data?: unknown;
  };
  [key: string]: unknown;
}

const FILTERED = "[Filtered]";
const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "set-cookie"]);
const SENSITIVE_BODY_KEYS = new Set(["password", "newpassword", "currentpassword", "token"]);

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const req = event.request;
  if (!req) return event;

  if (req.headers && typeof req.headers === "object") {
    for (const key of Object.keys(req.headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) req.headers[key] = FILTERED;
    }
  }

  if (req.cookies !== undefined) req.cookies = FILTERED;

  if (req.data && typeof req.data === "object" && !Array.isArray(req.data)) {
    const data = req.data as Record<string, unknown>;
    for (const key of Object.keys(data)) {
      if (SENSITIVE_BODY_KEYS.has(key.toLowerCase())) data[key] = FILTERED;
    }
  }

  return event;
}
