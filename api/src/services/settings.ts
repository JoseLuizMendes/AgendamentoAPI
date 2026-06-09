import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { DateTime } from "luxon";

export type TenantSettings = {
  allowCustomerBooking: boolean;
  timezone: string;
  slotIntervalMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
};

export async function getSettings(prisma: PrismaClient, tenantId: number): Promise<TenantSettings> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new NotFoundError("Tenant não encontrado");
  }
  return {
    allowCustomerBooking: tenant.allowCustomerBooking,
    timezone: tenant.timezone,
    slotIntervalMinutes: tenant.slotIntervalMinutes,
    minLeadTimeMinutes: tenant.minLeadTimeMinutes,
    maxAdvanceDays: tenant.maxAdvanceDays,
  };
}

export async function updateSettings(
  prisma: PrismaClient,
  tenantId: number,
  data: { [K in keyof TenantSettings]?: TenantSettings[K] | undefined }
): Promise<TenantSettings> {
  if (data.timezone !== undefined && !DateTime.local().setZone(data.timezone).isValid) {
    throw new ValidationError(`Fuso horário inválido: ${data.timezone}`);
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(data.allowCustomerBooking !== undefined && { allowCustomerBooking: data.allowCustomerBooking }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.slotIntervalMinutes !== undefined && { slotIntervalMinutes: data.slotIntervalMinutes }),
      ...(data.minLeadTimeMinutes !== undefined && { minLeadTimeMinutes: data.minLeadTimeMinutes }),
      ...(data.maxAdvanceDays !== undefined && { maxAdvanceDays: data.maxAdvanceDays }),
    },
  });

  return {
    allowCustomerBooking: tenant.allowCustomerBooking,
    timezone: tenant.timezone,
    slotIntervalMinutes: tenant.slotIntervalMinutes,
    minLeadTimeMinutes: tenant.minLeadTimeMinutes,
    maxAdvanceDays: tenant.maxAdvanceDays,
  };
}
