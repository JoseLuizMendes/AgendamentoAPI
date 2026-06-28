-- AlterTable: campos opcionais de descrição e imagem (URL) no serviço.
ALTER TABLE "Service" ADD COLUMN "description" TEXT;
ALTER TABLE "Service" ADD COLUMN "imageUrl" TEXT;
