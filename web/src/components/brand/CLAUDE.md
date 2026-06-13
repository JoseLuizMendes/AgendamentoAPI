---
nicho: "web/src/components/brand"
escopo: "Primitivos visuais de marca"
---

# web/src/components/brand/

> Complementa `../CLAUDE.md` (components) e a raiz.

## Escopo

Primitivos de identidade reutilizáveis: `eyebrow`, `grid-lines`, `wordmark` e afins (rótulos,
traçados decorativos, marca-texto).

## Diretrizes

- **Apresentação pura** — sem estado de servidor, sem fetch, sem regra de negócio.
- Cores via tokens (`var(--*)`/utilitários Tailwind); tipografia via `font-display`/`font-mono`.
- Respeitar `prefers-reduced-motion` em qualquer animação decorativa.

## Referências
- `../CLAUDE.md` (components) · raiz
