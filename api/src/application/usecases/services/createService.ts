import type { Repositories, Service } from "../../ports/index.js";

export async function createService(
  repos: Pick<Repositories, "services">,
  input: { name: string; priceInCents: number; durationInMinutes: number }
): Promise<Service> {
  return repos.services.create(input);
}
