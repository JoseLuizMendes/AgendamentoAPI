---
nicho: "web/src/app/[tenant]/servicos"
escopo: "Rota de Serviços"
---

# .../servicos/

> Complementa `../CLAUDE.md` ([tenant]) e a raiz.

- `page.tsx`: página fina — monta o **bento** (espelha Horários, largura total/32px). Os cards
  vivem em `@/components/tenant/servicos/*` (lista, resumo, editor criar/editar, destaques,
  distribuição). Estado de seleção (`selectedId`) compartilhado lista↔editor mora aqui.
- CRUD completo via os cards: `POST`/`PUT`/`DELETE /services` (`useMutation` + `reloadServices`).
- Preço sempre em **centavos** na API (`priceInCents`); a UI converte reais ↔ cents.
- Recarregar a lista = `reloadServices()` (invalida a query de services).
