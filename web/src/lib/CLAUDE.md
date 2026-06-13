---
nicho: "web/src/lib"
escopo: "Utilitários do frontend (transport, auth, helpers)"
---

# web/src/lib/

> Complementa `../../CLAUDE.md` (web) e a raiz.

## Escopo

`api.ts` (`apiRequest`/`ApiError` — transport HTTP com base `NEXT_PUBLIC_API_URL`), `auth.ts`
(token JWT em `localStorage`, chave `agendamento.jwt`), `utils.ts` (`cn`), `use-mounted.ts`
(hook de hidratação via `useSyncExternalStore`).

## Diretrizes

- **`apiRequest` é o único ponto de fetch.** React Query (queries/mutations) chama `apiRequest`;
  componentes não usam `fetch` direto.
- `use-mounted` substitui o padrão `useEffect(() => setMounted(true))` — usar em vez de efeito de
  mount (evita lint `set-state-in-effect`).
- Helpers puros e tipados (`any` proibido). Nada de JSX/React aqui além de hooks utilitários.

## Referências
- `../../CLAUDE.md` (web) · raiz
