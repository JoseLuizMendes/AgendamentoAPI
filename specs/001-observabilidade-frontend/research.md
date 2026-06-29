# Research — Observabilidade de Frontend (caseira)

Sem `NEEDS CLARIFICATION` pendentes: o design foi resolvido no brainstorming. Este documento
registra as decisões-chave.

## 1. Destino do rastreio de erro

- **Decisão**: endpoint caseiro `POST /client-errors` na própria Fastify, que loga via pino.
- **Rationale**: zero dependência nova (Constituição §III), dados ficam na VPS (privacidade),
  reusa o `redact` já configurado; simples para o nível do projeto.
- **Alternativas**: Sentry (SaaS) e GlitchTip (self-hosted) — ambos dependência nova + exceção C6;
  Sentry envia dados (e possível PII) para nuvem externa. Rejeitados nesta fatia.

## 2. Mecanismo de Error Boundary

- **Decisão**: usar os arquivos nativos do Next App Router — `app/global-error.tsx` (erros do root
  layout, renderiza próprio `<html>/<body>`) e `app/error.tsx` (erros das rotas, com `reset()`).
- **Rationale**: recurso de framework, sem lib nova; cobre crash de render com fallback amigável.
- **Alternativas**: `react-error-boundary` (dependência nova, desnecessária); um boundary de classe
  manual (reinventa o que o Next já oferece). Rejeitados.

## 3. Captura de erros globais (assíncronos)

- **Decisão**: um client component (`ClientErrorListeners`) montado no root `layout.tsx` registra,
  via `useEffect`, `window.addEventListener("error", …)` e `"unhandledrejection"`.
- **Rationale**: Error Boundary só pega erro de render; `onerror`/`unhandledrejection` cobrem o
  resto. `useEffect` aqui é integração com o DOM (permitido — não é fetch de dados).
- **Alternativas**: só os `error.tsx` (cobertura menor, perde erro assíncrono). Rejeitado.

## 4. Transporte do reporter

- **Decisão**: `reportClientError` usa `fetch` cru (não o `apiRequest`), **fire-and-forget**, e
  **engole o próprio erro** (try/catch silencioso); guarda contra loop (não reporta erro do próprio
  reporter).
- **Rationale**: o reporter não pode derrubar a app nem depender de auth/credentials; precisa ser à
  prova de falha mesmo se a rede cair.
- **Alternativas**: usar `apiRequest` (lançaria `ApiError`, acoplaria a auth). Rejeitado.

## 5. Endpoint backend

- **Decisão**: rota fina pública, validada por Zod, **rate limit reforçado** (`max: 30`,
  `1 minute`), responde **204**, loga `req.log.error({ clientError, ip })`; **sem banco**.
- **Rationale**: erros podem ocorrer antes do login (público); rate limit evita flood; pino+redact
  já protege headers; logar é suficiente para visibilidade na VPS.
- **Alternativas**: persistir em tabela `ClientError` (overkill agora; YAGNI). Rejeitado.

## 6. Versão do app (release tracking lite)

- **Decisão**: incluir `appVersion` de `NEXT_PUBLIC_APP_VERSION` (string curta, ex.: short SHA ou
  versão) em cada report.
- **Rationale**: permite saber de qual deploy veio o erro sem dashboards/source maps.
- **Alternativas**: source maps + release tracking completos (escopo de ferramenta dedicada).
  Adiado.
