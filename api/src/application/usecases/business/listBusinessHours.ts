import type { BusinessHours, Repositories } from "../../ports/index.js";

export async function listBusinessHours(repos: Pick<Repositories, "businessHours">): Promise<BusinessHours[]> {
  return repos.businessHours.list();
}
