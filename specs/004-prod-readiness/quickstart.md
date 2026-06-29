# Quickstart / Validação — 004 Prod-Readiness

Roteiro para provar que cada fase entrega o resultado esperado (mapeia os Success Criteria do spec).
Pré-requisitos: stack instalada (`pnpm -C api install`, `pnpm -C web install`); para o teste de borda,
um ambiente Docker com domínios apontados (ou `localhost` com hosts fake).

## US1 — Zero CVEs (SC-001/002/003)
```bash
# API
pnpm -C api audit --audit-level=critical        # esperado: 0 crítico runtime
pnpm -C api exec tsc -p tsconfig.json --noEmit   # verde
pnpm -C api test && pnpm -C api test:integration # verde
# Web
pnpm -C web audit                                # esperado: sem 'next' high
pnpm -C web exec tsc --noEmit && pnpm -C web build && pnpm -C web test
```
**Esperado**: nenhum advisory crítico runtime; nenhum CVE `high` de `next`; suíte 100% verde.

## US2 — App inteiro na VPS (SC-004/005)
```bash
# Build das imagens e subida
docker compose build
docker compose up -d
docker compose ps            # web, api, caddy 'healthy'/'running'; redis ausente
# Borda
curl -I https://app.<dominio>      # 200, HTTPS válido (Web)
curl -I https://api.<dominio>/health/live   # 200 (API)
```
**Esperado**: Web responde por HTTPS no seu domínio; API no dela; login ponta a ponta funciona
(cookie aceito entre `app.` e `api.` — CORS/credenciais corretos).

## US3 — Superfície endurecida (SC-005/006/007/008)
```bash
# Token NÃO no corpo; cookie presente
curl -i -X POST https://api.<dominio>/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"...","tenantSlug":"salao"}'
#   -> corpo SEM "token"; header Set-Cookie: token=...; HttpOnly

# Swagger fora de produção
curl -I https://api.<dominio>/documentation   # esperado: 404 (ou 401 se atrás de auth)

# Headers de segurança do Web
curl -I https://app.<dominio>
#   -> Strict-Transport-Security, X-Frame-Options: DENY, X-Content-Type-Options: nosniff,
#      Referrer-Policy, Permissions-Policy; SEM X-Powered-By

# Gate de rota (sem cookie -> redireciona)
curl -I https://app.<dominio>/salao/agenda    # esperado: 307/302 -> /login
```
**Esperado**: corpo de login sem `token`; doc interativa indisponível em prod; 5 headers presentes e
`X-Powered-By` ausente; rota de workspace redireciona visitante sem sessão.

## US4 — Repo/operação (SC-009/010)
```bash
# Lockfile único
git ls-files | grep -E 'package-lock.json'    # esperado: vazio
ls api/.env.example                            # existe
ls .gitignore                                  # existe na raiz
# CI: introduzir uma dep crítica fake -> pipeline falha no gate de audit (validação manual no PR)
```
**Esperado**: só `pnpm-lock.yaml`; exemplos de env presentes; CI falha diante de crítico.

## US5 — Polimento
- CSP da API endurecida (sem `unsafe-inline`/unpkg/jsdelivr) — validar no header `Content-Security-Policy`
  de uma resposta da API e que nada quebrou (Swagger já saiu de prod).
- `app/dashboard` legado migrado/removido — `grep -r "useEffect" web/src/app/dashboard` vazio ou rota some.
- Limpeza de tokens: rodar o script e confirmar remoção de `AuthToken`/`IdempotencyKey` expirados.

## Comando de verificação consolidado (gate de PR)
```bash
pnpm -C api exec tsc -p tsconfig.json --noEmit && pnpm -C api test && pnpm -C api test:integration \
  && pnpm -C web exec tsc --noEmit && pnpm -C web lint && pnpm -C web build && pnpm -C web test \
  && pnpm -C api audit --audit-level=critical
```
