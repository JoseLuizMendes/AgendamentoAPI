# Feature Specification: Observabilidade de Frontend (caseira)

**Feature Branch**: `001-observabilidade-frontend`

**Created**: 2026-06-27

**Status**: Draft

**Input**: Resolver a lacuna #1 do material de referência (observabilidade de front): hoje o app
não tem Error Boundary nem rastreio de erros do navegador. Abordagem **caseira** (sem dependência
nova nem serviço externo): Error Boundary + captura global de erros + endpoint na própria API que
registra via pino. Escopo desta fatia: **somente erros** (Web Vitals fica para depois).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App não dá "tela branca" quando algo quebra (Priority: P1)

Quando um componente da interface lança um erro de renderização, em vez de a tela ficar em branco,
o usuário vê um fallback amigável com a marca e um botão para tentar de novo / recarregar, sem
perder a confiança no produto.

**Why this priority**: É o maior risco de UX em produção — um erro não tratado hoje derruba a tela
inteira. É a proteção mais visível e de maior valor imediato.

**Independent Test**: Forçar um componente a lançar erro (em dev) e confirmar que aparece o fallback
com botão de recuperação, e que o resto do app não é derrubado. Entrega valor sozinha.

**Acceptance Scenarios**:

1. **Given** uma rota do workspace cujo componente lança erro na renderização, **When** a rota é
   aberta, **Then** o usuário vê o fallback amigável (não a tela branca) com ação de "tentar de novo".
2. **Given** um erro no root layout, **When** a página carrega, **Then** o `global-error` renderiza um
   fallback completo (com `<html>/<body>`) e botão de recarregar.

---

### User Story 2 - Erros do navegador ficam visíveis para o dev (Priority: P2)

Erros que acontecem no navegador do usuário (crash de render, `window.onerror`, promessas rejeitadas)
são reportados para a própria API e registrados nos logs do servidor, incluindo a versão do app
(`appVersion`), para o dev saber **o que** quebrou e **em qual deploy**.

**Why this priority**: Sem isso, erro do usuário vira relato vago. Depende do P1 existir (a boundary
é um dos pontos de captura), por isso P2.

**Independent Test**: Disparar um erro no navegador e confirmar uma requisição `POST /client-errors`
com status 204 e a linha correspondente no log do servidor (com `appVersion`, sem dados sensíveis).

**Acceptance Scenarios**:

1. **Given** um erro não tratado no navegador, **When** ele ocorre, **Then** o cliente envia
   `POST /client-errors` (fire-and-forget) e o servidor responde 204 e loga via pino.
2. **Given** o reporter falhar (rede caída), **When** ele tenta enviar, **Then** ele **engole** o
   próprio erro e **não** derruba a aplicação nem entra em loop.

---

### Edge Cases

- **Flood de erros** (uma página quebrando em loop dispara muitos reports): o endpoint tem rate limit
  reforçado (30/min por IP) e responde 429 ao exceder, sem 500.
- **Payload inválido/malicioso**: validação Zod → 400; campos têm tamanho máximo; sem persistência em
  banco (só log).
- **Erro antes do login**: o endpoint é público (não exige auth), pois o crash pode ocorrer em
  qualquer rota.
- **PII**: o cliente envia apenas campos controlados (mensagem/stack/url/userAgent/versão); o `redact`
  do pino protege headers; nenhum dado de formulário é enviado.
- **Loop do próprio reporter**: erros originados dentro do reporter não geram novo report.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE ter Error Boundary no root (`app/global-error.tsx`) e nas rotas
  (`app/error.tsx`), com fallback amigável e ação de recuperação (`reset()`/recarregar).
- **FR-002**: O app DEVE capturar erros globais não tratados do navegador (`window`
  `error` e `unhandledrejection`) via um listener montado uma vez no root.
- **FR-003**: O cliente DEVE reportar erros para `POST /client-errors` de forma **fire-and-forget**,
  e o reporter NUNCA DEVE lançar exceção nem causar loop.
- **FR-004**: Cada report DEVE incluir `appVersion` (de `NEXT_PUBLIC_APP_VERSION`) para rastrear o
  deploy de origem.
- **FR-005**: A API DEVE expor `POST /client-errors` **público**, validado por Zod, respondendo
  **204** em sucesso e **400** em payload inválido; campos com tamanho máximo.
- **FR-006**: O endpoint DEVE ter rate limit reforçado (`max: 30`, janela `1 minute`) e responder
  **429** ao exceder (sem virar 500).
- **FR-007**: O endpoint DEVE registrar o erro via `req.log.error` (pino, com o `redact` já
  existente) e **não** tocar no banco de dados.

### Key Entities

- **ClientErrorReport**: representa um erro do navegador. Atributos: `message` (obrigatório),
  `stack?`, `componentStack?`, `url?`, `userAgent?`, `appVersion?`, `kind?` (`render | unhandled |
  rejection`). Sem identidade persistida (só logado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em um crash de render, **0** ocorrências de tela branca — sempre aparece o fallback.
- **SC-002**: 100% dos erros não tratados do navegador resultam numa linha de log no servidor com
  `appVersion` identificável.
- **SC-003**: O endpoint rejeita payload inválido (400) e flood acima do limite (429), nunca 500
  por esses casos.
- **SC-004**: Falha no envio do report **nunca** quebra a aplicação (reporter à prova de erro).

## Assumptions

- Abordagem **caseira** decidida pelo dev: sem dependência nova nem serviço externo (Sentry/GlitchTip
  ficam fora) — respeita a Stack Congelada (Constituição §III).
- Escopo desta fatia é **somente erros**; Web Vitals (LCP/INP/CLS) ficam para uma fatia futura, no
  mesmo endpoint/padrão.
- Reusa a infra existente: Fastify + pino com `redact` (headers `authorization`/`cookie`), rate limit
  por rota (espelha o booking público), e o transport do web.
- O endpoint não persiste em banco; visibilidade é via logs do servidor na VPS.
- Verificação segue a Constituição: backend testável **sem DB** via `app.inject`; `reportClientError`
  testável no Vitest do web; `error.tsx`/listeners verificados por `tsc`/`lint` + teste manual.
