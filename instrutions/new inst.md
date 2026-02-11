{
  "project": "Fastify Scheduling API",
  "goal": "Servidor serverless (Vercel / Edge) com documentação interativa (tests incluídos), CRUD completo para agendamento e gerenciamento de serviços, usuários e horários.",
  "architecture": {
    "framework": "Fastify (serverless friendly)",
    "db": "PostgreSQL com Prisma ORM",
    "validation": "Zod",
    "deploy": "Vercel (Edge Functions / Serverless)",
    "api_style": "REST (padrão) com possibilidade de GraphQL opcional posteriormente",
    "docs": "Swagger / OpenAPI + playground de testes",
    "nextjs_integration": "O Next.js vai consumir a API publicamente (fetch) ou via hooks"
  },
  "folders": {
    "src": {
      "plugins": "fastify plugins configs",
      "routes": "route definition (by domain)",
      "schemas": "zod schemas & types",
      "services": "logic to access Prisma & other logic",
      "utils": "generic helpers (errors, dates)",
      "middlewares": "auth, error handling & versioning",
      "docs": "openapi config & transformations"
    },
    "prisma": {
      "schema.prisma": "DB layout",
      "migrations": "migrations scripts"
    },
    "tests": "api tests (playground / automated)"
  },
  "core_concepts": {
    "user_roles": [
      "business_owner (barbeiro, dentista, médico, etc)",
      "customer"
    ],
    "permissions": {
      "business_owner": "manage services, business_hours, overrides, appointments",
      "customer": "book, cancel, view own appointments"
    },
    "scheduling_rules": [
      "respect business hours",
      "apply breaks",
      "apply overrides (holiday / special hours)",
      "no double bookings"
    ]
  },
  "routes": {
    "users": {
      "GET /users/:id": "get user",
      "POST /users": "create user",
      "PUT /users/:id": "update user",
      "DELETE /users/:id": "delete user"
    },
    "services": {
      "GET /services": "all services",
      "POST /services": "create service",
      "PUT /services/:id": "update",
      "DELETE /services/:id": "delete"
    },
    "appointments": {
      "GET /appointments": "filter by user or service",
      "GET /appointments/:id": "details",
      "POST /appointments": "schedule new",
      "PATCH /appointments/:id": "update (status, time)",
      "DELETE /appointments/:id": "cancel"
    },
    "business_hours": {
      "GET /hours": "all business hours",
      "POST /hours": "create",
      "PUT /hours/:id": "update",
      "DELETE /hours/:id": "delete"
    },
    "overrides": {
      "GET /overrides": "all",
      "POST": "create override",
      "PUT /:id": "update",
      "DELETE /:id": "remove"
    }
  },
  "validation": {
    "use": "Zod + Fastify Zod resolver",
    "benefits": "typesafe requests + auto types for frontend",
    "schemas": [
      "UserSchema",
      "ServiceSchema",
      "AppointmentSchema",
      "BusinessHoursSchema",
      "OverrideSchema"
    ]
  },
  "plugins": {
    "core": [
      "fastify-cors",
      "fastify-swagger",
      "fastify-oas",
      "fastify-helmet",
      "fastify-compress",
      "fastify-env",
      "fastify-zod" 
    ],
    "optional": [
      "fastify-jwt", 
      "fastify-rate-limit",
      "fastify-sensible",
      "fastify-auth"
    ],
    "db": [
      "fastify-prisma-client"
    ]
  },
  "docs": {
    "swagger": {
      "enable": true,
      "uiPath": "/docs",
      "exposeRoute": true,
      "autoSchemas": "from Zod -> OpenAPI"
    },
    "testing_in_docs": "Yes (via Fastify playground with examples and debug tests)"
  },
  "errors": {
    "handling": "centralized error handler (fastify-sensible)",
    "responses": "standard error shapes"
  },
  "nextjs_integration": {
    "fetching": "useSWR / React Query",
    "auth": "JWT or cookie based",
    "hooks": "custom hooks for API calls"
  },
  "why_rest": {
    "simple": "clear endpoints, frontend friendly",
    "stable": "easy to cache & test",
    "GraphQL_later": "if needs complex queries / aggregations"
  }
}
