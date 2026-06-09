-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';

-- DropIndex
DROP INDEX "BusinessDateOverride_date_key";

-- DropIndex
DROP INDEX "BusinessHours_dayOfWeek_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "allowCustomerBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxAdvanceDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "minLeadTimeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
