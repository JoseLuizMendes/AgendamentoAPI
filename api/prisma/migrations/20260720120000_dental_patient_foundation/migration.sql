-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('GENERIC', 'DENTAL');

-- AlterTable (aditivo: default preserva os tenants existentes)
ALTER TABLE "Tenant" ADD COLUMN "businessType" "BusinessType" NOT NULL DEFAULT 'GENERIC';

-- AlterTable (aditivo: coluna opcional; agendamentos existentes ficam com patientId nulo até o backfill)
ALTER TABLE "Appointment" ADD COLUMN "patientId" INTEGER;

-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patient_tenantId_idx" ON "Patient"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_tenantId_phone_key" ON "Patient"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_patientId_idx" ON "Appointment"("tenantId", "patientId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
