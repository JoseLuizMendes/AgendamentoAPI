# Research — 004 Prod-Readiness & Hardening

Decisões técnicas que resolvem as incógnitas do plano. Formato: Decisão · Justificativa · Alternativas.
Fontes: auditoria de 2026-06-29 (`pnpm audit` parseado), Context7 (Next 16.2.9), constitution/CLAUDE.

## 1. Versões-alvo das dependências (US1)

**Decisão**:
- `fastify` → **≥ 5.8.5** (linha 5.x, dentro do canon). Resolve advisories `high`/`moderate` de runtime.
- `@fastify/jwt` → última **10.x** que resolva `fast-jwt` **≥ 6.2.4** (CVE crítico no caminho de verificação
  de JWT). Se o range transitivo não subir sozinho, fixar via `pnpm.overrides: { "fast-jwt": ">=6.2.4" }`.
- `@fastify/swagger-ui` / `@fastify/static` → última compatível com Fastify 5.8 (resolve `@fastify/static`
  moderate). Como o Swagger sai de produção (US3), o risco residual já cai.
- `next` → **16.2.9** (≥16.2.6 corrige os 8 CVEs `high`, incl. bypass de middleware/proxy; 16.2.9 é o
  patch mais novo da 16.2.x — confirmado via Context7). `eslint-config-next` casado na mesma versão.
- `postcss` → **≥ 8.5.10** (override se vier transitivo).

**Justificativa**: são exatamente as versões corrigidas reportadas pelo `pnpm audit`; mantêm a stack
congelada (mesma major). Context7 confirmou que 16.2.9 existe e que `output:'standalone'`/`headers()` são
suportados nessa versão. `fast-jwt` é runtime no caminho de auth → prioridade máxima.

**Alternativas**: subir para Fastify 6 / Next 17 — **rejeitado** (troca de major = fora do escopo e do
canon C6). Ignorar transitivos dev (vite/rollup/vitest/hono/effect) — **aceito**: são toolchain de teste,
risco real baixo; serão arrastados pelos bumps normais, sem virar bloqueador.

## 2. Estratégia de transitivos teimosos

**Decisão**: usar `pnpm.overrides` no `package.json` só quando o bump direto não propagar a correção
(candidatos: `fast-jwt`, `ajv`, `fast-uri`, `postcss`). Re-rodar `pnpm audit` até **0 crítico runtime**.

**Justificativa**: override é o mecanismo do pnpm para forçar versão segura sem trocar a dep direta.
**Alternativas**: `pnpm dedupe` apenas — pode não bastar; `resolutions` (yarn) — fora do canon.

## 3. Dockerização do Web (`output:'standalone'`)

**Decisão**: `next.config.ts` com `output:'standalone'`; `web/Dockerfile` multi-stage (build → runtime
enxuto com `.next/standalone` + `.next/static` + `public`), usuário não-root, `EXPOSE 3000`,
`CMD ["node","server.js"]`. `.dockerignore` para `node_modules`/`.next`/`.git`.

**Justificativa**: padrão oficial Next para deploy self-hosted (confirmado Context7); imagem mínima; espelha
o Dockerfile da API (non-root, multi-stage). **Alternativas**: `next start` com node_modules completo —
imagem maior; servir estático pelo Caddy — desnecessário (Caddy só faz proxy reverso aqui).

## 4. Borda Caddy — 2 domínios

**Decisão**: dois site-blocks no `Caddyfile`: `{$API_DOMAIN} -> reverse_proxy api:3000` e
`{$WEB_DOMAIN} -> reverse_proxy web:3000`, ambos com HTTPS automático. Variáveis `API_DOMAIN`/`WEB_DOMAIN`
no `.env` da VPS. Nenhum serviço expõe porta ao host (só o Caddy em 80/443).

**Justificativa**: Caddy já está no projeto; HTTPS/Let's Encrypt automático por domínio. **Alternativas**:
subdomínio único + path routing — pior para CORS/cookies; Nginx — fora do canon de infra atual.

## 5. Sessão: token fora do body + JWT curto + sem Redis

**Decisão**: (a) remover o campo `token` das respostas de `/auth/login` e `/auth/signup` (o Web só usa o
cookie httpOnly — confirmado na auditoria). (b) `JWT_EXPIRES_IN` default **"2d"** e `maxAge` do cookie =
2 dias. (c) **Sem denylist/Redis** nesta fase.

**Justificativa**: devolver o token no corpo anula o httpOnly (XSS leria a resposta). Janela de 2 dias
reduz o impacto de um token vazado sem exigir infraestrutura de revogação. **Alternativas**: refresh token
+ denylist por `jti` (Redis) — adiada (decisão do dev: sem Redis); sessão de servidor stateful — troca de
modelo, fora de escopo.

## 6. Swagger fora de produção

**Decisão**: registrar `@fastify/swagger` + `swagger-ui` apenas quando `!config.isProduction`. Em produção
a doc interativa não existe (404). Ajustar a allowlist de `onRequest` (auth plugin) e do rate-limit para
não referenciar `/docs`/`/documentation` em prod.

**Justificativa**: a doc expõe toda a superfície da API; não há motivo de mantê-la pública em prod.
**Alternativas**: basic-auth no `/docs` — mais código e um segredo a mais; manter pública — rejeitado.

## 7. Headers de segurança do Web

**Decisão** (`next.config.ts` `headers()` em `source: '/(.*)'`, confirmado Context7):
`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`.
`poweredByHeader: false`.

**Justificativa**: conjunto padrão de proteções de navegador; a API já tem Helmet, o Web não tinha nada.
**Alternativas**: CSP completa no Web agora — adiada (precisa inventariar inline/ECharts/Tailwind; risco de
quebra) → fica como item futuro/observado.

## 8. Gate de rota no Web (proxy/middleware otimista)

**Decisão**: `web/src/proxy.ts` (Next 16 — confirmar nome exato `proxy.ts` vs `middleware.ts` na
implementação via C7) que redireciona para `/login` quando **não há cookie de sessão** em `/[tenant]/*`.
Verificação **otimista**: só presença do cookie — **não** valida o JWT (o Web não tem `JWT_SECRET`; a
autorização real continua na API).

**Justificativa**: defense-in-depth + UX (sem flash de tela protegida). Padrão oficial do Next (Context7).
**Alternativas**: validar o JWT no edge — exigiria compartilhar o segredo com o Web (rejeitado); só
client-side — mantém o flash de tela.

## 9. CSRF

**Decisão**: manter `SameSite` configurável; avaliar `strict` para o domínio do workspace. Com cookie
`SameSite` + CORS allowlist + `credentials`, o vetor CSRF clássico já é mitigado; **decisão final**: usar
`SameSite=lax` (default) com CORS estrito é suficiente para o MVP; registrar token anti-CSRF como item
futuro caso surja rota sensível a GET-state-changing (não há hoje — todas as mutações são POST/PUT/DELETE
com JSON + `Content-Type` que dispara preflight).

**Justificativa**: sem rota de escrita por GET e com preflight obrigatório (JSON), o risco residual é baixo.
**Alternativas**: token anti-CSRF já agora — custo sem ganho proporcional no estado atual.

## 10. Higiene de repo/infra

**Decisão**: remover `package-lock.json` (raiz + `api/`); criar `.gitignore` na raiz e `api/.env.example`
(espelhando as chaves de `config.ts`, sem valores). Remover o serviço `redis` do `docker-compose.yml`
(não referenciado pelo código) + `depends_on`. CI: `pnpm audit --audit-level=critical` **bloqueante** após
zerar os atuais. `DEPLOY.md`: seção de backup (snapshot/branch Neon antes do deploy) e rollback
(`prisma migrate resolve`/restaurar branch) para falha de migração.

**Justificativa**: alinhar ao canon pnpm; reduzir superfície/recursos; onboarding; rede de proteção.
**Alternativas**: manter Redis "para o futuro" — consome memória sem uso; reintroduzir quando houver
fila/escala/denylist (registrado).

## 11. Limpeza de tokens efêmeros (sem migration)

**Decisão**: `AuthToken` e `IdempotencyKey` já têm `createdAt`/`expiresAt`; a limpeza é um **DELETE por
data** (script/cron SQL no host ou tarefa agendada simples), **sem mudança de schema**.

**Justificativa**: evita crescimento de tabela sem alterar o modelo. **Alternativas**: TTL nativo —
Postgres não tem; partição — exagero para o volume atual (YAGNI).
