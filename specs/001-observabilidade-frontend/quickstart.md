# Quickstart — Validar a Observabilidade

Guia de validação end-to-end. Detalhes de payload/contrato em [contracts/client-errors.md](./contracts/client-errors.md)
e [data-model.md](./data-model.md).

## Pré-requisitos
- API e web rodando: `pnpm -C api dev` e `pnpm -C web dev`.
- `NEXT_PUBLIC_APP_VERSION` definido no `web` (ex.: short SHA) para ver a versão nos logs.

## 1. Backend — endpoint (automatizado, sem DB)

```bash
pnpm -C api test           # inclui tests/unit/client-errors.test.ts (204 / 400 / 429)
pnpm -C api exec tsc -p tsconfig.json --noEmit
```

**Esperado**: body válido → 204; sem `message` → 400; estourar 30/min → 429. Todos verdes.

Sanidade manual (com a API no ar):
```bash
curl -i -X POST localhost:3000/client-errors \
  -H 'Content-Type: application/json' \
  -d '{"message":"teste manual","kind":"unhandled"}'
# → HTTP/1.1 204; e uma linha "client error" no log do servidor
```

## 2. Frontend — reporter (automatizado)

```bash
pnpm -C web test           # inclui report-error.test.ts (shape do POST + nunca lança)
pnpm -C web exec tsc --noEmit
pnpm -C web lint
```

**Esperado**: `reportClientError` faz `POST /client-errors` com o shape certo e **engole** erro de
rede (não propaga).

## 3. Error Boundary (manual, no navegador)

1. Forçar um erro de render temporário num componente de rota (ex.: `throw new Error("boom")`).
2. Abrir a rota → deve aparecer o **fallback amigável** (não a tela branca) com botão
   "tentar de novo"; clicar deve tentar re-renderizar (`reset()`).
3. Conferir no servidor a linha de log `client error` com `kind: "render"` e o `appVersion`.
4. Repetir disparando um `unhandledrejection` (ex.: `Promise.reject(new Error("x"))`) → log com
   `kind: "rejection"`.
5. Remover o erro forçado.

## Critérios de aceite (do spec)
- **SC-001**: nenhum white-screen em crash de render.
- **SC-002**: 100% dos erros não tratados geram log com `appVersion`.
- **SC-003**: 400 para inválido, 429 para flood — nunca 500 nesses casos.
- **SC-004**: falha no envio do report nunca quebra a app.
