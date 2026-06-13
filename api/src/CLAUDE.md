---
nicho: "api/src"
escopo: "Código-fonte do backend Fastify"
---

# api/src/

> Complementa `../CLAUDE.md` (api) e a raiz.

## Escopo

Fonte da API. Composição em `app.ts` (`buildApp()` registra plugins + rotas), bootstrap em
`server.ts`, config validada em `config.ts`.

## Mapa das subpastas

| Pasta | Papel | CLAUDE.md |
|---|---|---|
| `routes/` | Apresentação HTTP (rotas finas) | `routes/CLAUDE.md` |
| `services/` | Regra de negócio (sem Fastify) | `services/CLAUDE.md` |
| `schemas/` | Schemas Zod (request/response) | `schemas/CLAUDE.md` |
| `plugins/` | Plugins Fastify (prisma, auth, swagger) | `plugins/CLAUDE.md` |
| `utils/` | Helpers puros (errors, guards, time) | `utils/CLAUDE.md` |

## Diretrizes

- Fluxo de registro novo: criar service → rota → schema → registrar a rota em `app.ts`.
- `config.ts` é a única leitura de `process.env` (zod). Nada de `process.env` espalhado.
- Camadas e regras de dependência: ver a raiz (§Arquitetura) e os CLAUDE.md de `routes/`/`services/`.

## Referências
- `../CLAUDE.md` (api) · raiz · subpastas acima
