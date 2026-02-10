# Agendamento API

API REST para gerenciamento de agendamentos construída com Fastify v5 + Prisma + PostgreSQL.

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

# API Key (obrigatório em produção)
API_KEY=seu-token-seguro-minimo-16-chars

# Opcional
NODE_ENV=production
API_KEY_ENFORCE=true
PUBLIC_HEALTH=true
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW=1 minute
```

### Acesso

- **Documentação**: `https://seu-app.vercel.app/docs`
- **API**: `https://seu-app.vercel.app/services`
  - Requer header: `x-api-key: seu-token` ou `Authorization: Bearer seu-token`
- **Health check**: `https://seu-app.vercel.app/health/live` (público)

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

- ✅ Helmet (security headers)
- ✅ Rate limiting (120 req/min default)
- ✅ API key authentication
- ✅ Validação de entrada (AJV/TypeBox)
- ✅ Error handling global

## 📖 Endpoints

Ver documentação completa em `/docs` após deploy.

### Principais recursos:

- `GET /services` - Lista serviços
- `POST /services` - Cria serviço
- `GET /slots` - Lista horários disponíveis
- `POST /appointments` - Cria agendamento
- `GET /health/live` - Health check

## 🏗️ Arquitetura

Seguindo Clean Architecture:

- **Application**: Use cases e interfaces de negócio
- **Infra**: Implementações concretas (repos Prisma)
- **Interfaces**: Adapters HTTP (routes)
- **Core**: Entidades de domínio

## 📝 Notas

- O Swagger UI está sempre habilitado em `/docs`
- A autenticação é obrigatória em produção (exceto `/health/*` e `/docs`)
- Use `x-api-key` header (recomendado) ou `Authorization: Bearer`
