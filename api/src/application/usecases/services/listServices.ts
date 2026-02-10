import type { Repositories, Service } from "../../ports/index.js";

export async function listServices(repos: Pick<Repositories, "services">): Promise<Service[]> {
  return repos.services.list();
}
