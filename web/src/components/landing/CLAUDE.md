---
nicho: "web/src/components/landing"
escopo: "Página institucional pública (landing)"
---

# web/src/components/landing/

> Complementa `../CLAUDE.md` (components) e a raiz.

## Escopo

Seções da landing pública (hero, features, esfera animada em canvas, etc.). Sem auth, sem dados de
tenant.

## Diretrizes

- Conteúdo de marketing — **sem fetch de dados de servidor**.
- Animações com `prefers-reduced-motion` respeitado; `useMounted` (de `lib/use-mounted`) para
  disparo de entrada pós-hidratação — **não** `useEffect(() => setState())`.
- Cores via tokens; tipografia `font-display`/`font-mono`.

## Referências
- `../CLAUDE.md` (components) · `../../lib/CLAUDE.md` · raiz
