# Agendamento API

API REST multi-tenant para gerenciamento de agendamentos construída com Fastify v5 + Prisma + PostgreSQL.

## 🎯 Features

- ✅ **Multi-Tenancy**: Row-level tenant isolation
- ✅ **JWT Authentication**: Secure token-based auth with httpOnly cookies
- ✅ **Role-Based Access Control**: OWNER, STAFF, CUSTOMER roles
- ✅ **Appointment Management**: Create, reschedule, cancel; status lifecycle (CONFIRMED/COMPLETED/NO_SHOW)
- ✅ **Availability**: Real-time free-slot calculation por serviço/data, com fuso do tenant
- ✅ **Service Management**: Define services with pricing and duration
- ✅ **Business Hours + Breaks**: Operating hours per day e intervalos (almoço)
- ✅ **Date Overrides**: Handle holidays and special dates
- ✅ **Tenant Settings**: Modo de agendamento, fuso horário, granularidade de slots
- ✅ **Self-Booking**: Cliente final agenda sozinho via `/public/:slug` (configurável)
- ✅ **OpenAPI/Swagger**: Auto-generated API documentation
- ✅ **Type Safety**: Full TypeScript + Zod validation (request e response)

📖 **[Multi-Tenancy Guide](MULTI_TENANCY.md)** - Complete documentation on authentication, roles, and tenant isolation.

## 🚀 Deploy (Docker + VPS)

A API roda em container Docker numa VPS, atrás do Caddy (HTTPS automático), com banco no Neon.
Deploy automático por push na `main` via GitHub Actions (build → GHCR → SSH na VPS).

📖 **Guia completo de deploy e hardening: [DEPLOY.md](DEPLOY.md)**

### Variáveis de ambiente

Veja **[.env.example](.env.example)** para a lista completa. As obrigatórias:

```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
DIRECT_DATABASE_URL=postgresql://user:password@host/db?sslmode=require   # migrations
JWT_SECRET=string-aleatoria-de-32-mais-caracteres                        # obrigatório em produção
NODE_ENV=production
CORS_ORIGIN=https://app.seudominio.com
DOMAIN=api.seudominio.com
```

### Build e execução local da imagem

```bash
docker build -t agendamento-api ./api
docker run --env-file ./api/.env -p 3000:3000 agendamento-api
```

### Acesso

- **Documentação**: `https://api.seudominio.com/documentation`
- **Health check** (público): `https://api.seudominio.com/health/live`
- **Auth**: `POST /auth/signup`, `POST /auth/login` (JWT em cookie ou `Authorization: Bearer`)

## 📦 Estrutura do Projeto

```
api/
├── Dockerfile                # Imagem de produção (multi-stage)
├── docker-compose.yml        # Produção (api + redis + caddy)
├── docker-compose.dev.yml    # Local (postgres + redis para testes)
├── Caddyfile                 # Reverse proxy + HTTPS automático
├── src/
│   ├── app.ts                # Montagem do Fastify (plugins, error handler, rotas)
│   ├── server.ts             # Entrypoint (listen)
│   ├── config.ts             # Configuração validada do ambiente (Zod)
│   ├── plugins/              # Plugins Fastify: auth, prisma, swagger
│   ├── routes/               # Camada HTTP (controllers)
│   ├── services/             # Regra de negócio (recebe `prisma` injetado)
│   ├── schemas/              # Schemas Zod (request + response) — fonte única de verdade
│   └── utils/                # Helpers: errors, guards, time, slots
├── prisma/
│   ├── schema.prisma         # Schema do banco
│   └── migrations/           # Migrations versionadas
├── tests/                    # unit/ + integration/ (Vitest)
├── vercel.json               # Configuração Vercel (legado)
└── package.json
```

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
pnpm install

# Subir Postgres local (Docker)
docker run --name agendamento-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agendamento \
  -p 5432:5432 \
  -d postgres:16

# Criar .env a partir do exemplo e ajustar se necessário
cp .env.example .env

# Rodar migrações
pnpm prisma:migrate

# Desenvolvimento
pnpm dev

# Testes
pnpm test:unit

# Build
pnpm build
```

## 🔒 Segurança

- ✅ JWT authentication (httpOnly cookies + Bearer token)
- ✅ Multi-tenant row-level isolation
- ✅ Role-based access control (RBAC)
- ✅ Helmet (security headers)
- ✅ Rate limiting (120 req/min default)
- ✅ Password hashing (bcrypt)
- ✅ Validação de entrada (Zod)
- ✅ Error handling global

## 📖 Endpoints

Ver documentação completa em `/documentation` após deploy.

### Principais recursos:

**Auth (público)**
- `POST /auth/signup` - Cria tenant e usuário owner
- `POST /auth/login` - Login (obtém JWT)
- `POST /auth/logout` - Logout
- `GET /auth/me` - Info do usuário autenticado

**Services (autenticado)**
- `GET /services` - Lista serviços
- `GET /services/:id` - Detalhe do serviço
- `POST /services` - Cria serviço (OWNER/STAFF)
- `PUT /services/:id` - Atualiza serviço (OWNER)
- `DELETE /services/:id` - Deleta serviço (OWNER)

**Appointments (autenticado)**
- `GET /availability?serviceId=&date=YYYY-MM-DD` - Horários disponíveis (slots livres)
- `GET /appointments?from=&to=&status=&serviceId=` - Lista/agenda por data
- `POST /appointments` - Cria agendamento
- `PATCH /appointments/:id` - Atualiza (status, reagendamento, dados)
- `DELETE /appointments/:id` - Cancela/remove agendamento

> Status do agendamento: `SCHEDULED` → `CONFIRMED` → `COMPLETED`/`NO_SHOW`, ou `CANCELED`.
> Conflito de horário é **tenant-wide** (um profissional por tenant).

**Business Hours (OWNER apenas)**
- `GET /hours` - Lista horários
- `POST /hours` - Cria horários
- `PUT /hours/:id` - Atualiza horários
- `DELETE /hours/:id` - Deleta horários
- `POST /hours/:id/breaks` - Adiciona intervalo (almoço)
- `DELETE /hours/:hoursId/breaks/:breakId` - Remove intervalo

**Settings (configurações do tenant)**
- `GET /settings` - Lê configurações (modo de agendamento, fuso, granularidade)
- `PATCH /settings` - Atualiza configurações (OWNER)

**Public (auto-agendamento — sem auth, requer `allowCustomerBooking`)**
- `GET /public/:slug/services` - Serviços do estabelecimento
- `GET /public/:slug/availability?serviceId=&date=` - Horários disponíveis
- `POST /public/:slug/appointments` - Cliente final marca sozinho

**Users (OWNER apenas)**
- `GET /users` - Lista usuários do tenant
- `POST /users` - Cria usuário
- `PUT /users/:id` - Atualiza usuário
- `DELETE /users/:id` - Deleta usuário

**Health (público)**
- `GET /health/live` - Health check

## 🏗️ Arquitetura

Arquitetura **em camadas, pragmática** (não é Clean Architecture). O fluxo é direto e fácil de
manter por uma pessoa:

- **`routes/`** — camada HTTP (validação via Zod, RBAC via guards, chama os services)
- **`services/`** — regra de negócio; recebe o `PrismaClient` **injetado** como argumento
  (facilita testes), sem camada de repositório intermediária
- **`schemas/`** — Zod como fonte única de verdade: valida request, gera tipos e o OpenAPI,
  e serializa as respostas (schema-driven)
- **`utils/guards.ts`** — `requireAuth` / `requireRole` reutilizáveis (sem checagem duplicada
  de papel nos handlers)
- **`config.ts`** — ambiente validado uma vez na inicialização (falha rápido em produção)

## 📝 Notas

- O Swagger UI está sempre habilitado em `/documentation`
- A autenticação JWT é obrigatória (exceto rotas públicas: `/health/*`, `/docs`, `/auth/*`)
- Cada tenant tem dados completamente isolados
- Use `Authorization: Bearer <token>` header ou cookie `token` para autenticação
- Consulte [MULTI_TENANCY.md](MULTI_TENANCY.md) para detalhes completos
