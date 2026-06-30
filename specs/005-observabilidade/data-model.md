# Data Model — 005 Observabilidade

**Resumo**: **sem mudança de schema/DB.** A telemetria vive no Sentry (SaaS). As "entidades" abaixo são
de configuração e de forma de evento (saneado), documentadas para rastreio.

## Configuração de observabilidade (env validada)

### API (`config.ts` → bloco `sentry`)
| Chave (env) | Tipo | Default | Papel |
|---|---|---|---|
| `SENTRY_DSN` | string opcional | — | Sem valor ⇒ observabilidade **desligada** (no-op). |
| `SENTRY_ENVIRONMENT` | string | `NODE_ENV` | Rótulo de ambiente nos eventos. |
| `SENTRY_RELEASE` | string opcional | — | SHA do deploy (correlaciona erro ↔ versão). |
| `SENTRY_TRACES_SAMPLE_RATE` | número 0..1 | dev `1.0` / prod `0.1` | Fração de transações amostradas. |

`config.sentry` = `null` quando `SENTRY_DSN` ausente; caso contrário `{ dsn, environment, release, tracesSampleRate }`.

### Web (env do Next)
| Chave (env) | Papel |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | DSN do client/SSR; vazio ⇒ no-op. |
| `NEXT_PUBLIC_APP_VERSION` | release (SHA), já existente. |
| `SENTRY_AUTH_TOKEN` (CI, secret, opcional) | upload de sourcemaps no build. |

## Forma do evento enviado (após scrub)
- **Removidos/ofuscados** antes do envio: `request.headers.authorization`, `request.headers.cookie` /
  `set-cookie`, `request.cookies`, e o corpo de rotas de auth (campos de senha) → `[Filtered]`.
- **Mantidos**: tipo de erro, stack trace, método/rota, status, `release`, `environment`, fingerprint de
  agrupamento.
- `sendDefaultPii: false` (não captura IP/cookies por padrão; o `beforeSend` é defesa adicional).

## Invariantes
- **Sem DSN ⇒ zero envio** (dev/local seguro).
- Telemetria **não** altera resposta nem disponibilidade (best-effort/async).
- O **redact de logs** (pino) existente permanece intacto.
- Nenhuma migration; nenhuma coluna nova.
