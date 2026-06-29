# Data Model — Observabilidade de Frontend

> Não há persistência em banco. A única "entidade" é o **payload** do report (validado por Zod no
> backend e montado no frontend). Documentado aqui para alinhar request ↔ schema.

## ClientErrorReport (request body de `POST /client-errors`)

| Campo | Tipo | Obrigatório | Regra / Máx | Origem |
|---|---|---|---|---|
| `message` | string | **sim** | 1..2000 chars | `error.message` / `event.message` / `reason` |
| `stack` | string | não | ≤ 10000 chars | `error.stack` |
| `componentStack` | string | não | ≤ 10000 chars | React `errorInfo.componentStack` (Error Boundary) |
| `url` | string | não | ≤ 2000 chars | `window.location.href` |
| `userAgent` | string | não | ≤ 500 chars | `navigator.userAgent` |
| `appVersion` | string | não | ≤ 100 chars | `NEXT_PUBLIC_APP_VERSION` |
| `kind` | enum | não | `render \| unhandled \| rejection` | classifica a origem |

### Regras de validação
- Campos extras são **ignorados** (sem `passthrough`).
- `message` vazia → **400** (é o único obrigatório).
- Tamanhos máximos evitam abuso/log gigante.
- **Sem PII**: o cliente só envia os campos acima; nenhum dado de formulário/usuário é incluído.

### Ciclo de vida
- Sem identidade persistida. O backend **loga** o report (`req.log.error`) e responde **204**.
- `kind` ajuda a filtrar nos logs (crash de render vs erro global vs promessa rejeitada).
