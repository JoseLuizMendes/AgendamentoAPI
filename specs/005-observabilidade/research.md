# Research — 005 Observabilidade

Decisões: Decisão · Justificativa · Alternativas. Fontes: Context7 (Sentry docs — Next/Node setup,
`sendDefaultPii`, `tracesSampleRate`, beforeSend), constituição, decisões do dev.

## 1. Fornecedor: Sentry SaaS (erros + tracing)
**Decisão**: usar **Sentry (SaaS)**; **não** auto-hospedar Loki/Prometheus/Tempo/Grafana.
**Justificativa**: visibilidade de erro/perf de alto sinal com esforço/peso mínimos na VPS única (1 dev,
MVP). Mesmo princípio que removeu o Redis: nada de serviço pesado ocioso. SDKs first-class p/ Next e Node.
**Alternativas**: stack Grafana self-host (peso de ops/memória — rejeitado nesta fase); Grafana Cloud
managed (possível p/ logs/métricas no futuro, fora de escopo).

## 2. SDKs e versões
**Decisão**: API `@sentry/node`; Web `@sentry/nextjs`. Versão = última major estável compatível com Node
22 e Next 16.2.x — **fixar exatamente no impl via Context7/npm** (C7). `@sentry/node` v8+ é **construído
sobre OpenTelemetry** → satisfaz a portabilidade (FR-012) sem instrumentar OTel "na mão".
**Alternativas**: `@sentry/opentelemetry` puro + exporter — mais setup, menos integração pronta com
Fastify; `fastify-sentry` de terceiros — fora do canon e menos mantido que o SDK oficial.

## 3. API (Fastify) — onde instrumentar
**Decisão**: `src/instrument.ts` com `Sentry.init(...)`, **importado como 1ª linha de `server.ts`**
(antes de `buildApp`), para a auto-instrumentação OTel envolver tudo. Em `app.ts`,
`Sentry.setupFastifyErrorHandler(app)` quando habilitado. Gate: init só roda se `config.sentry` (DSN
presente).
**Justificativa**: ordem de import é requisito do SDK (instrumentação precede o app). `instrument.ts`
isolado mantém a borda separada da regra (Layered).
**Alternativas**: init dentro de `app.ts` — tarde demais p/ auto-instrumentar libs já importadas.

## 4. Web (Next 16) — onde instrumentar
**Decisão**: `@sentry/nextjs` com `instrumentation.ts` (`register()` server/edge + `onRequestError`),
`instrumentation-client.ts` (client init) e `withSentryConfig` envolvendo `next.config.ts`. Gate por
`NEXT_PUBLIC_SENTRY_DSN` (vazio → no-op). Integra com as Error Boundaries já existentes
(`app/error.tsx`/`global-error.tsx`) via `captureException`.
**Alternativas**: só client SDK — perderia erros de SSR/route handlers.

## 5. Scrub de dados sensíveis
**Decisão**: `sendDefaultPii: false` (default — **não** envia cookies/headers/IP) **+** `beforeSend`
(util puro `observability/scrub.ts`) que remove/ofusca `request.cookies`, headers `Authorization`/`Cookie`
e o corpo de rotas de auth (senha). Aplicado na API e no Web.
**Justificativa**: defesa em profundidade; a doc do Sentry confirma que esconder **chaves** de header/
cookie exige `beforeSend` (não há opção nativa). Mantém consistência com o redact de logs (não o contorna).
**Alternativas**: confiar só no default — não cobre PII em mensagens/corpo; rejeitado.

## 6. Gate por DSN (dev seguro)
**Decisão**: sem `SENTRY_DSN` (API) / `NEXT_PUBLIC_SENTRY_DSN` (Web), o `init` **não** é chamado (ou é
no-op) → **zero** envio em dev/local. Validado por config (API) e por guarda no instrumentation (Web).
**Justificativa**: cumpre FR-005/SC-005; evita poluir o painel com dados de dev.

## 7. Release & environment
**Decisão**: `release` = SHA do commit (API: `SENTRY_RELEASE` no `deploy.yml`; Web:
`NEXT_PUBLIC_APP_VERSION`/SHA no build). `environment` = `NODE_ENV`.
**Justificativa**: correlaciona erro ↔ deploy; já temos tag `:sha` nas imagens e `NEXT_PUBLIC_APP_VERSION`.

## 8. Tracing (amostragem)
**Decisão**: `tracesSampleRate` por env — default **dev 1.0 / prod 0.1** (ajustável por
`SENTRY_TRACES_SAMPLE_RATE`). Auto-instrumentação OTel do `@sentry/node` cobre rotas + consultas (driver
pg/Prisma). No Web, navegação/render via `@sentry/nextjs`.
**Justificativa**: equilibra sinal e custo/volume (fica no plano gratuito enquanto o tráfego é pequeno).

## 9. Resiliência (telemetria não derruba a app)
**Decisão**: envio é assíncrono/best-effort do próprio SDK; nenhuma chamada de captura é `await`-ada em
caminho crítico. Falha de rede ao Sentry não propaga erro à requisição.
**Justificativa**: cumpre FR-011/SC-007.

## 10. Logs & uptime
**Decisão**: **logs** seguem no pino (sem mudança; sem coletor self-host). **Uptime**: monitor externo
gratuito (UptimeRobot/Better Stack) batendo em `api.<dominio>/health/live` e `app.<dominio>/`, com
notificação — documentado no `DEPLOY.md` (config, não código).
**Alternativas**: shipper de logs p/ Grafana Cloud — futuro, fora de escopo.

## 11. Sourcemaps do Web (opcional)
**Decisão**: upload de sourcemaps no CI via `withSentryConfig` + `SENTRY_AUTH_TOKEN` (secret) — **opcional/
não bloqueante**; sem o token, o build segue (stack trace minificado, ainda útil).
**Justificativa**: stack trace legível é desejável mas não pode travar o deploy nem exigir segredo já.

## 12. Exceção de stack (C6)
**Decisão**: registrar `@sentry/node` + `@sentry/nextjs` como **exceção aprovada** em
`.specify/memory/constitution.md` (§Exceções) e `CLAUDE.md` raiz (data + justificativa).
