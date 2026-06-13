---
nicho: "api/src/schemas"
escopo: "Schemas Zod — contrato de request/response da API"
---

# api/src/schemas/

> Complementa `../CLAUDE.md` (api/src) e a raiz.

## Escopo

`index.ts` — fonte única dos schemas Zod usados pelas rotas (validação de body/params/querystring
e **serialização de response** via `fastify-type-provider-zod`).

## Diretrizes

- **Todo endpoint declara request e response** aqui; rotas importam destes schemas, não criam zod
  inline.
- Tipos derivados via `z.infer` (ex.: `AppointmentCreate`) — não duplicar interfaces à mão.
- Campo novo num modelo ⇒ refletir no schema de response correspondente (senão a serialização
  zod corta o campo).
- Datas de entrada: `z.string().datetime()`; saída: `z.date()` (o serializer converte).
- Enums espelham o Prisma (ex.: `AppointmentStatusEnum`). Manter em sincronia com `schema.prisma`.

## Quality Gate
- [ ] Endpoint novo tem schema de request **e** response
- [ ] Campo novo do modelo aparece no response schema
- [ ] Sem zod inline nas rotas (importa daqui)

## Referências
- `../CLAUDE.md` · `../routes/CLAUDE.md` · raiz
