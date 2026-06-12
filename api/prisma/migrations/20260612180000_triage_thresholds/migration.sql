-- AlterTable: limiares de triagem de status (em minutos)
ALTER TABLE "Tenant" ADD COLUMN     "statusPromptAfterStartMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overdueAfterEndMin" INTEGER NOT NULL DEFAULT 60;
