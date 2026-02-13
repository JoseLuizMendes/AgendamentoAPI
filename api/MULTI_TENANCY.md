# Multi-Tenancy Implementation Guide

## Overview

This API implements **row-level multi-tenancy** with JWT-based authentication. Each tenant's data is isolated using a `tenantId` column in all domain tables.

## Architecture

### Tenant Identification
- **Method**: JWT tokens only (no headers or subdomains)
- **JWT Payload**: `{ userId, tenantId, role }`
- **Token Transport**: 
  - Preferred: httpOnly cookie (`token`)
  - Alternative: `Authorization: Bearer <token>` header

### Database Schema
- **Tenant Model**: Central tenant table with unique slug
- **Row-Level Isolation**: All domain entities have `tenantId` foreign key
- **Indexes**: Composite indexes on `(tenantId, frequently_queried_field)` for performance

### Entities with Multi-Tenancy
- `User` - Users belong to a tenant, email unique per tenant
- `Service` - Services scoped to tenant
- `Appointment` - Appointments scoped to tenant
- `BusinessHours` - Business hours per tenant per day of week
- `BusinessDateOverride` - Date overrides per tenant
- `BusinessBreak` - Breaks inherit tenant from parent BusinessHours

## Authentication Flow

### 1. Signup (Create Tenant + Owner)
```bash
POST /auth/signup
{
  "email": "owner@example.com",
  "password": "securepassword",
  "name": "Owner Name",
  "tenantName": "My Business",
  "tenantSlug": "my-business"
}

Response:
{
  "user": { "id": 1, "email": "...", "role": "OWNER", "tenantId": 1 },
  "tenant": { "id": 1, "name": "My Business", "slug": "my-business" },
  "token": "eyJhbGc..."
}
```

### 2. Login (Existing User)
```bash
POST /auth/login
{
  "email": "owner@example.com",
  "password": "securepassword",
  "tenantSlug": "my-business"
}

Response:
{
  "user": { "id": 1, "email": "...", "role": "OWNER" },
  "token": "eyJhbGc..."
}
```

### 3. Using API with Token
```bash
# With Bearer token
curl -H "Authorization: Bearer <token>" https://api.example.com/services

# With cookie (automatically set after login/signup)
curl -b "token=<token>" https://api.example.com/services
```

## Role-Based Access Control (RBAC)

### Roles

#### OWNER
- Full CRUD on all resources (services, appointments, business hours, overrides)
- Can create and manage users within their tenant
- Cannot access other tenants' data

#### STAFF
- Create services
- View all services and appointments in their tenant
- Update/cancel any appointment
- Cannot manage business hours, overrides, or users

#### CUSTOMER
- Create appointments (books for themselves)
- View only their own appointments
- Cancel only their own appointments
- View services and business hours (read-only)
- Cannot manage anything else

### Permission Matrix

| Resource | OWNER | STAFF | CUSTOMER |
|----------|-------|-------|----------|
| Services - Create | ✅ | ✅ | ❌ |
| Services - Read | ✅ | ✅ | ✅ |
| Services - Update | ✅ | ❌ | ❌ |
| Services - Delete | ✅ | ❌ | ❌ |
| Appointments - Create | ✅ | ✅ | ✅ (own only) |
| Appointments - Read | ✅ (all) | ✅ (all) | ✅ (own only) |
| Appointments - Update | ✅ (all) | ✅ (all) | ✅ (own only) |
| Appointments - Delete | ✅ (all) | ✅ (all) | ✅ (own only) |
| Business Hours - Manage | ✅ | ❌ | ❌ |
| Overrides - Manage | ✅ | ❌ | ❌ |
| Users - Manage | ✅ | ❌ | ❌ |
| Own Profile - Update | ✅ | ✅ | ✅ |

## Security Guarantees

### Tenant Isolation
1. **Service Layer**: All service functions require `tenantId` parameter
2. **Database Queries**: All queries filter by `tenantId`
3. **Authorization**: Resource ownership checked before modification
4. **No Cross-Tenant Access**: Impossible to access another tenant's data even with valid token

### Testing
- **Tenant Isolation Tests**: 6 scenarios verifying complete isolation
- **RBAC Tests**: Comprehensive permission tests for all roles
- Located in: `tests/integration/multi-tenancy.test.ts` and `tests/integration/rbac.test.ts`

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key-min-32-chars-for-production

# Optional
NODE_ENV=production
PUBLIC_HEALTH=true
```

## API Endpoints

### Public Routes (No Auth Required)
- `GET /health/live` - Liveness check
- `GET /health/ready` - Readiness check
- `GET /` - API info
- `GET /docs` - Swagger documentation
- `POST /auth/signup` - Create tenant + owner
- `POST /auth/login` - Login

### Protected Routes (Auth Required)
All other endpoints require valid JWT token.

## Migration from Single-Tenant

If you have existing data:

1. **Backup your database**
2. **Run migration**: Creates `Tenant` table and assigns existing data to default tenant
3. **Create owner accounts**: Use signup to create new tenant accounts
4. **Migrate data**: Manually reassign existing records to correct tenants if needed
5. **Update clients**: Add login flow to obtain JWT tokens

## Deployment

### Vercel Configuration
```json
{
  "buildCommand": "npm run vercel-build",
  "installCommand": "npm install",
  "framework": null,
  "outputDirectory": "dist"
}
```

### Environment Variables (Vercel)
- `DATABASE_URL`: PostgreSQL connection string (required)
- `JWT_SECRET`: Secret for JWT signing (required, min 32 chars)
- `NODE_ENV`: `production`

### Database
- Use managed PostgreSQL (Vercel Postgres, Neon, Supabase, etc.)
- Run migrations: `npx prisma migrate deploy`

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Development server
npm run dev

# Build
npm run build

# Tests (requires DATABASE_URL)
npm run test:integration
```

## Troubleshooting

### "Token não fornecido"
- Ensure token is in cookie or Authorization header
- Check token hasn't expired

### "Não autorizado"
- Token is invalid or expired
- Re-authenticate with `/auth/login`

### "Sem permissão"
- User role doesn't have permission for this action
- Check role in JWT payload with `/auth/me`

### "Serviço não encontrado" (but you know it exists)
- Service belongs to different tenant
- Verify you're authenticated with correct tenant

### Cross-tenant data visibility
- This should never happen - indicates a bug
- All queries should filter by tenantId
- Report immediately for security fix

## Future Enhancements

Potential additions:
- [ ] Tenant-level feature flags
- [ ] Usage quotas per tenant
- [ ] Tenant analytics/metrics
- [ ] Multi-factor authentication
- [ ] Password reset flow
- [ ] Email verification
- [ ] Audit logs per tenant
- [ ] Tenant suspension/deletion
- [ ] Custom branding per tenant
