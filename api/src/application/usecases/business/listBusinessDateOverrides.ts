import type { BusinessDateOverride, Repositories } from "../../ports/index.js";

export async function listBusinessDateOverrides(
  repos: Pick<Repositories, "businessDateOverrides">
): Promise<BusinessDateOverride[]> {
  return repos.businessDateOverrides.list();
}
