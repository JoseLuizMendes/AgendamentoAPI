import type { PrismaClient } from "@prisma/client";
import { NotFoundError, AppError } from "../utils/errors.js";

/** Resolve um tenant pelo slug (uso público, sem auth). */
export async function getTenantBySlug(prisma: PrismaClient, slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new NotFoundError("Estabelecimento não encontrado");
  }
  return tenant;
}

/** Lista pública de serviços de um tenant (por slug). */
export async function listPublicServices(prisma: PrismaClient, slug: string) {
  const tenant = await getTenantBySlug(prisma, slug);
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, priceInCents: true, durationInMinutes: true },
    orderBy: { name: "asc" },
  });
  return services;
}

/** Garante que o tenant permite auto-agendamento; lança 403 caso contrário. */
export async function assertBookingAllowed(prisma: PrismaClient, slug: string) {
  const tenant = await getTenantBySlug(prisma, slug);
  if (!tenant.allowCustomerBooking) {
    throw new AppError("Este estabelecimento não permite auto-agendamento online", 403);
  }
  return tenant;
}
