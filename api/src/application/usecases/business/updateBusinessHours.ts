import type { BusinessHours, Repositories } from "../../ports/index.js";

export async function updateBusinessHours(
  repos: Pick<Repositories, "businessHours">,
  items: Array<Pick<BusinessHours, "dayOfWeek" | "openTime" | "closeTime" | "isOff">>
): Promise<void> {
  await repos.businessHours.upsertMany(items);
}
