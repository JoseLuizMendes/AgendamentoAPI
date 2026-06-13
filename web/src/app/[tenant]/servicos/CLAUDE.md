---
nicho: "web/src/app/[tenant]/servicos"
escopo: "Rota de Serviços"
---

# .../servicos/

> Complementa `../CLAUDE.md` ([tenant]) e a raiz.

- `page.tsx`: form de novo serviço (nome, preço em reais → cents, duração) via `useMutation`
  (POST `/services`) + lista (de `useTenant().services`).
- Preço sempre em **centavos** na API (`priceInCents`); a UI converte reais ↔ cents.
- Recarregar a lista = `reloadServices()` (invalida a query de services).
