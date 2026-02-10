import type { BusinessHours, Repositories } from "../../ports/index.js";

export async function replaceBusinessBreaks(
  repos: Pick<Repositories, "businessHours">,
  input: { dayOfWeek: number; breaks: BusinessHours["breaks"] }
): Promise<BusinessHours> {
  return repos.businessHours.replaceBreaks(input.dayOfWeek, input.breaks);
}
