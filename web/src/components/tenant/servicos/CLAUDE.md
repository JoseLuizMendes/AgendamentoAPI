---
nicho: "web/src/components/tenant/servicos"
escopo: "Componentes da página de Serviços (bento)"
---

# web/src/components/tenant/servicos/

> Complementa `../CLAUDE.md` (tenant) e a raiz.

## Escopo

Cards da página de Serviços, num grid **bento** espelhando Horários:
`service-list-card` (lista selecionável + excluir + miniatura + **paginação de 5**),
`service-summary-card` (KPIs + gráfico por faixa de duração que **ocupa o vão** via `flex-1`),
`service-editor-card` (criar/editar — nome/descrição/imagem/preço/duração — POST/PUT),
`service-highlights-card` (extremos de preço/duração **+ Valor total + Tempo total**),
`service-distribution-card` (gráfico por faixa de preço).
Lógica pura em `services-stats.ts` + `.test.ts` (`summarizeServices`, `serviceHighlights`,
`priceBuckets`, `durationBuckets`).

## Diretrizes

- **Dados via `useTenant().services`** + `reloadServices()` — sem `useEffect` de fetch.
- **CRUD via `useMutation` + `apiRequest`**: `POST /services` (criar), `PUT /services/:id`
  (editar — OWNER), `DELETE /services/:id` (excluir — OWNER). Erros via `ApiError` + toast
  (a API pode recusar excluir serviço com agendamentos vinculados — só mostrar o erro).
- **Seleção:** o `page.tsx` guarda `selectedId`; a lista seleciona, o editor é remontado por
  `key` (id + valores) para reiniciar o estado — **sem efeito de sync**.
- **Reuso:** `StatRow`/`EmptyState`/`formatBRL` de `../shared`; `paginate` de `@/lib/paginate`;
  `CountBars` de `../dashboard/charts` (primitivo de gráfico — `currentColor` + tokens);
  `Bento`, `Card*`, `Button`, `Input`, `Label`, `AlertDialog` de `@/components/ui/*`.
- **Preço em centavos** na API (`priceInCents`); a UI converte reais ↔ cents.
- **Imagem via Cloudinary — fluxo ASSINADO** (alinhado ao canon `web → api`): `@/lib/cloudinary`
  `uploadServiceImage` pede a assinatura à nossa API (`GET /uploads/signature`) e só então
  envia o arquivo direto ao Cloudinary; a `secure_url` é salva em `Service.imageUrl`.
  **As credenciais (api_secret) ficam só no backend** (`api/src/config.ts` ← `api/.env`:
  `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET/UPLOAD_FOLDER`). A assinatura é gerada em
  `api/src/services/cloudinary.ts` (SHA-1, sem SDK; testada). Preview/lista usam `<img>` (com
  `eslint-disable` do `no-img-element`, pois é URL remota sem `next/image` configurado).
- **Upload acontece no SAVE, não ao escolher** o arquivo: ao escolher só há preview local
  (`URL.createObjectURL`); o upload roda dentro da `mutationFn` → **1 upload por serviço salvo**,
  sem assets órfãos quando o dono re-escolhe o arquivo.
- **Só tokens** (sem hex).

## Decisões pendentes

- **Limpeza de imagem órfã (2026-06-23):** trocar/remover a imagem de um serviço **não apaga**
  o asset antigo no Cloudinary (a UI só troca a URL). ⚠️ **PENDENTE — avaliar** um endpoint de
  delete no backend (Cloudinary Admin API) para apagar o asset anterior ao substituir/excluir.

## Backlog UX — resolvido (2026-06-25)

1. **Paginação a partir de >5** ✅ `service-list-card.tsx` `PAGE_SIZE = 5`.
2. **Vão no meio do Resumo** ✅ o gráfico de duração fica num container `flex flex-1 flex-col
   justify-center` (sem `mt-auto`) → ocupa/centraliza no espaço livre; base alinha com a coluna
   direita via `flex-1` (ver `page.tsx`).
3. **+2 badges em Destaques** ✅ `Valor total` (soma dos preços) e `Tempo total` (soma das
   durações), via `summarizeServices` (`totalPriceInCents`/`totalDurationMin`) + `StatRow`.

## Referências
- `../CLAUDE.md` (tenant) · `../horarios/` (mesmo padrão de bento) · `@/lib/cloudinary` · raiz
