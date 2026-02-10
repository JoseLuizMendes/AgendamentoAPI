import { NotFoundError, ValidationError } from "../../errors.js";
import type { BusinessDateOverride, Repositories } from "../../ports/index.js";
import { assertIsoDate, parseTimeToMinutes, toDayOfWeekUtc } from "../../../lib/time.js";

export async function upsertBusinessDateOverride(
  repos: Pick<Repositories, "businessDateOverrides" | "businessHours">,
  input: {
    date: string;
    isOff: boolean;
    openTime?: string;
    closeTime?: string;
  }
): Promise<BusinessDateOverride> {
  try {
    assertIsoDate(input.date);
  } catch (e) {
    throw new ValidationError((e as Error).message);
  }

  const hasOpen = typeof input.openTime === "string";
  const hasClose = typeof input.closeTime === "string";
  if (hasOpen !== hasClose) {
    throw new ValidationError("Informe openTime e closeTime juntos");
  }

  if (hasOpen && hasClose) {
    const openMinutes = parseTimeToMinutes(input.openTime!);
    const closeMinutes = parseTimeToMinutes(input.closeTime!);
    if (closeMinutes <= openMinutes) {
      throw new ValidationError("closeTime deve ser maior que openTime");
    }
  }

  if (!input.isOff && !hasOpen && !hasClose) {
    const dayOfWeek = toDayOfWeekUtc(input.date);
    const base = await repos.businessHours.getByDayOfWeek(dayOfWeek);
    if (!base) {
      throw new NotFoundError(
        "Para ativar sem horários, configure primeiro /business-hours para o dia da semana correspondente"
      );
    }
  }

  return repos.businessDateOverrides.upsert({
    date: input.date,
    isOff: input.isOff,
    openTime: input.openTime ?? null,
    closeTime: input.closeTime ?? null,
  });
}
