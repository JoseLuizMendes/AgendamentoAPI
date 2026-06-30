# Quickstart / Validação — 005 Observabilidade

Mapeia os Success Criteria. Pré-requisitos: conta Sentry (projeto p/ API e projeto p/ Web), DSNs em mãos.

## Verificação automatizada (local — sem enviar nada)
```bash
# Scrub (TDD) e gate por DSN
pnpm -C api test           # inclui scrub.test.ts + config (sentry desligado sem DSN)
pnpm -C api exec tsc -p tsconfig.json --noEmit
pnpm -C web exec tsc --noEmit && pnpm -C web lint && pnpm -C web build
```
**Esperado**: scrub remove cookie/Authorization/senha; sem `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` o init é
no-op; tudo verde.

## US1 — Erros visíveis (SC-001/002)
1. Em staging/prod (com DSN), provocar um erro controlado:
   - API: rota temporária que lança, ou forçar um 500 conhecido.
   - Web: botão/efeito que lança no client + um erro de route handler (server).
2. Conferir no painel Sentry: evento com **stack trace**, **rota/contexto**, **release (SHA)** e
   **ambiente**; eventos repetidos **agrupados**; alerta básico configurado notifica.

## US3 — Scrub (SC-004/005)
1. Provocar erro numa requisição autenticada (cookie de sessão presente) a uma rota de auth.
2. Inspecionar o evento: **não** deve conter `Cookie`, `Authorization` nem `password` (aparecem como
   `[Filtered]` ou ausentes).
3. Rodar a app **sem DSN** e repetir o erro → **nenhum** evento no painel (zero envio).

## US2 — Tracing (SC-003)
1. Gerar tráfego em staging/prod.
2. No painel: transações amostradas (taxa configurada) com duração total e **spans** de consulta ao
   banco; identificar a rota/operação mais lenta.
3. Ajustar `SENTRY_TRACES_SAMPLE_RATE` por env e confirmar mudança de volume (sem mudar código).

## US4 — Uptime externo (SC-006)
1. Configurar o monitor gratuito (UptimeRobot/Better Stack) apontando para
   `https://api.<dominio>/health/live` e `https://app.<dominio>/`.
2. Simular indisponibilidade de um domínio → o monitor detecta e **notifica** em poucos minutos.

## Resiliência (SC-007)
- Com DSN inválido/rede bloqueada ao Sentry, a app **continua respondendo** normalmente (envio
  best-effort não trava requisição).
