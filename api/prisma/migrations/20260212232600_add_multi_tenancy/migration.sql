-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'STAFF', 'CUSTOMER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- AlterTable User - Add new columns
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "role" "Role" DEFAULT 'CUSTOMER';
ALTER TABLE "User" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- For existing users, create a default tenant and assign them to it
INSERT INTO "Tenant" ("name", "slug", "updatedAt")
SELECT 'Default Tenant', 'default-tenant', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" WHERE "slug" = 'default-tenant');

UPDATE "User" 
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'default-tenant' LIMIT 1),
    "passwordHash" = '$2a$10$defaulthashforexistingusers',
    "role" = 'OWNER'
WHERE "tenantId" IS NULL;

-- Now make columns non-nullable
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;

-- Drop old unique constraint on email, add new composite one
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_email_tenantId_key" ON "User"("email", "tenantId");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "User_email_idx" ON "User"("email");

-- Add FK constraint
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Service
ALTER TABLE "Service" ADD COLUMN "tenantId" INTEGER;

-- Assign existing services to default tenant
UPDATE "Service" 
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'default-tenant' LIMIT 1)
WHERE "tenantId" IS NULL;

ALTER TABLE "Service" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "Service_tenantId_idx" ON "Service"("tenantId");
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN "userId" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN "tenantId" INTEGER;

-- Assign existing appointments to default tenant
UPDATE "Appointment" 
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'default-tenant' LIMIT 1)
WHERE "tenantId" IS NULL;

ALTER TABLE "Appointment" ALTER COLUMN "tenantId" SET NOT NULL;

-- Drop old indexes
DROP INDEX IF EXISTS "Appointment_serviceId_idx";
DROP INDEX IF EXISTS "Appointment_startTime_endTime_idx";

-- Create new indexes
CREATE INDEX "Appointment_tenantId_serviceId_idx" ON "Appointment"("tenantId", "serviceId");
CREATE INDEX "Appointment_tenantId_startTime_endTime_idx" ON "Appointment"("tenantId", "startTime", "endTime");
CREATE INDEX "Appointment_tenantId_userId_idx" ON "Appointment"("tenantId", "userId");
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");

-- Add FK constraints
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable BusinessHours
ALTER TABLE "BusinessHours" ADD COLUMN "tenantId" INTEGER;

-- Assign existing business hours to default tenant
UPDATE "BusinessHours" 
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'default-tenant' LIMIT 1)
WHERE "tenantId" IS NULL;

ALTER TABLE "BusinessHours" ALTER COLUMN "tenantId" SET NOT NULL;

-- Drop old unique constraint, add new one
ALTER TABLE "BusinessHours" DROP CONSTRAINT IF EXISTS "BusinessHours_dayOfWeek_key";
CREATE UNIQUE INDEX "BusinessHours_tenantId_dayOfWeek_key" ON "BusinessHours"("tenantId", "dayOfWeek");
CREATE INDEX "BusinessHours_tenantId_idx" ON "BusinessHours"("tenantId");

-- Add FK constraint
ALTER TABLE "BusinessHours" ADD CONSTRAINT "BusinessHours_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable BusinessDateOverride
ALTER TABLE "BusinessDateOverride" ADD COLUMN "tenantId" INTEGER;

-- Assign existing overrides to default tenant
UPDATE "BusinessDateOverride" 
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'default-tenant' LIMIT 1)
WHERE "tenantId" IS NULL;

ALTER TABLE "BusinessDateOverride" ALTER COLUMN "tenantId" SET NOT NULL;

-- Drop old unique constraint, add new one
ALTER TABLE "BusinessDateOverride" DROP CONSTRAINT IF EXISTS "BusinessDateOverride_date_key";
CREATE UNIQUE INDEX "BusinessDateOverride_tenantId_date_key" ON "BusinessDateOverride"("tenantId", "date");
CREATE INDEX "BusinessDateOverride_tenantId_idx" ON "BusinessDateOverride"("tenantId");

-- Add FK constraint
ALTER TABLE "BusinessDateOverride" ADD CONSTRAINT "BusinessDateOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
