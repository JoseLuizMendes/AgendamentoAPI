import { NotFoundError } from "../../errors.js";
import type { Repositories, Service } from "../../ports/index.js";

export async function getService(repos: Pick<Repositories, "services">, id: number): Promise<Service> {
  const service = await repos.services.getById(id);
  if (!service) {
    throw new NotFoundError("Serviço não encontrado");
  }
  return service;
}
