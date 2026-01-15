-- CreateTable
CREATE TABLE "BusinessDateOverride" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isOff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessDateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDateOverride_date_key" ON "BusinessDateOverride"("date");
