-- CreateEnum
CREATE TYPE "DentalProcedure" AS ENUM ('AVALIACAO', 'PROFILAXIA', 'RESTAURACAO', 'ENDODONTIA', 'EXTRACAO', 'COROA', 'PROTESE', 'IMPLANTE', 'CLAREAMENTO', 'RASPAGEM', 'SELANTE', 'FLUOR', 'RADIOGRAFIA', 'OUTRO');

-- CreateTable
CREATE TABLE "AppointmentTooth" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "toothFdi" INTEGER NOT NULL,
    "procedure" "DentalProcedure" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentTooth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentTooth_appointmentId_toothFdi_key" ON "AppointmentTooth"("appointmentId", "toothFdi");

-- CreateIndex
CREATE INDEX "AppointmentTooth_appointmentId_idx" ON "AppointmentTooth"("appointmentId");

-- AddForeignKey
ALTER TABLE "AppointmentTooth" ADD CONSTRAINT "AppointmentTooth_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
