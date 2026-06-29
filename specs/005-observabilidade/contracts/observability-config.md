# Contract — Configuração & Scrub de Observabilidade

Não há endpoint novo. Os "contratos" desta feature são (a) as variáveis de ambiente e (b) a função de
scrub (`beforeSend`) que sanitiza o evento antes do envio.

## A. Variáveis de ambiente

### API
```
SENTRY_DSN=                       # vazio = desligado (no-op)
SENTRY_ENVIRONMENT=production      # default: NODE_ENV
SENTRY_RELEASE=<git-sha>           # opcional; correlaciona com o deploy
SENTRY_TRACES_SAMPLE_RATE=0.1      # 0..1; default dev 1.0 / prod 0.1
```
- `config.sentry` = `null` sem DSN; senão `{ dsn, environment, release, tracesSampleRate }`.
- Validação zod em `config.ts` (número 0..1; DSN string mínima).

### Web (Next)
```
NEXT_PUBLIC_SENTRY_DSN=            # vazio = no-op
NEXT_PUBLIC_APP_VERSION=<git-sha>  # release (já existente)
SENTRY_AUTH_TOKEN=                 # só no CI (secret), opcional — sourcemaps
```

## B. Contrato do scrub (`beforeSend`)

**Entrada**: evento Sentry (com possível `request` contendo headers/cookies/data).
**Saída**: o mesmo evento com campos sensíveis substituídos por `[Filtered]` (ou removidos).

Regras (testáveis — `tests/unit/scrub.test.ts`, TDD):
1. `event.request.headers.authorization` → removido/`[Filtered]`.
2. `event.request.headers.cookie` e `set-cookie` → removidos/`[Filtered]`.
3. `event.request.cookies` → removido.
4. Corpo (`event.request.data`) de rotas de auth (`/auth/login`, `/auth/signup`, `/auth/reset-password`)
   com campo `password` → `password: "[Filtered]"`.
5. Evento sem `request` ou sem os campos → passa inalterado (idempotente, sem erro).

**Retornar `null`** em `beforeSend` descarta o evento (não usado por padrão; reservado para casos
futuros de supressão).

## C. Comportamento esperado por ambiente
| Ambiente | DSN | Resultado |
|---|---|---|
| dev/local | ausente | init no-op; **zero** envio |
| produção | presente | erros + transações amostradas, **saneados**, com `release`/`environment` |
| produção | Sentry fora do ar | app **inalterada** (envio best-effort/async falha em silêncio) |
