# Agendamento API

API REST multi-tenant para gerenciamento de agendamentos construída com Fastify v5 + Prisma + PostgreSQL.

## 🎯 Features

- ✅ **Multi-Tenancy**: Row-level tenant isolation
- ✅ **JWT Authentication**: Secure token-based auth with httpOnly cookies
- ✅ **Role-Based Access Control**: OWNER, STAFF, CUSTOMER roles
- ✅ **Appointment Management**: Create, update, cancel appointments
- ✅ **Service Management**: Define services with pricing and duration
- ✅ **Business Hours**: Configure operating hours per day
- ✅ **Date Overrides**: Handle holidays and special dates
- ✅ **OpenAPI/Swagger**: Auto-generated API documentation
- ✅ **Type Safety**: Full TypeScript + Zod validation

📖 **[Multi-Tenancy Guide](MULTI_TENANCY.md)** - Complete documentation on authentication, roles, and tenant isolation.

## 🚀 Deploy na Vercel

### Configuração

1. **Conecte o repositório na Vercel**
   - Importe o projeto do GitHub
   - Root Directory: `api`
   - Framework Preset: Other
   - Build Command: `pnpm vercel-build`
   - Output Directory: (deixe vazio)
   - Install Command: `pnpm install`

2. **Variáveis de ambiente necessárias:**

```env
# Database (obrigatório)
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT Secret (obrigatório em produção)
JWT_SECRET=seu-jwt-secret-minimo-32-chars-para-producao

# Opcional
NODE_ENV=production
PUBLIC_HEALTH=true
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW=1 minute
```

### Acesso

- **Documentação**: `https://seu-app.vercel.app/documentation`
- **Auth**: 
  - Signup: `POST /auth/signup` (create tenant + owner)
  - Login: `POST /auth/login` (get JWT token)
- **API**: Use JWT token em cookie ou `Authorization: Bearer <token>` header
- **Health check**: `https://seu-app.vercel.app/health/live` (público)

### Debug em produção

Se `/docs` não aparecer após deploy:
1. Acesse `https://seu-app.vercel.app/debug/routes` para ver rotas registradas
2. Veja logs da Function no dashboard da Vercel
3. Consulte [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para guia completo

## 📦 Estrutura do Projeto

```
api/
├── api/
│   └── index.js              # Handler serverless Vercel
├── src/
│   ├── app.ts                # Aplicação Fastify
│   ├── server.ts             # Entrada local
│   ├── application/          # Use cases e interfaces
│   ├── infra/                # Implementações (Prisma)
│   ├── interfaces/           # Adapters HTTP
│   ├── plugins/              # Plugins Fastify
│   └── routes/               # Rotas
├── prisma/
│   └── schema.prisma         # Schema do banco
├── vercel.json               # Configuração Vercel
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
- `POST /services` - Cria serviço (OWNER/STAFF)
- `PUT /services/:id` - Atualiza serviço (OWNER)
- `DELETE /services/:id` - Deleta serviço (OWNER)

**Appointments (autenticado)**
- `GET /appointments` - Lista agendamentos
- `POST /appointments` - Cria agendamento
- `PATCH /appointments/:id` - Atualiza agendamento
- `DELETE /appointments/:id` - Cancela agendamento

**Business Hours (OWNER apenas)**
- `GET /hours` - Lista horários
- `POST /hours` - Cria horários
- `PUT /hours/:id` - Atualiza horários
- `DELETE /hours/:id` - Deleta horários

**Users (OWNER apenas)**
- `GET /users` - Lista usuários do tenant
- `POST /users` - Cria usuário
- `PUT /users/:id` - Atualiza usuário
- `DELETE /users/:id` - Deleta usuário

**Health (público)**
- `GET /health/live` - Health check

## 🏗️ Arquitetura

Seguindo Clean Architecture:

- **Application**: Use cases e interfaces de negócio
- **Infra**: Implementações concretas (repos Prisma)
- **Interfaces**: Adapters HTTP (routes)
- **Core**: Entidades de domínio

## 📝 Notas

- O Swagger UI está sempre habilitado em `/documentation`
- A autenticação JWT é obrigatória (exceto rotas públicas: `/health/*`, `/docs`, `/auth/*`)
- Cada tenant tem dados completamente isolados
- Use `Authorization: Bearer <token>` header ou cookie `token` para autenticação
- Consulte [MULTI_TENANCY.md](MULTI_TENANCY.md) para detalhes completos
