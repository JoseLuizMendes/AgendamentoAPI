import { NotFoundError } from "../../errors.js";
import type { Repositories } from "../../ports/index.js";

export async function deleteService(repos: Pick<Repositories, "services">, id: number): Promise<void> {
  const existing = await repos.services.getById(id);
  if (!existing) {
    throw new NotFoundError("Serviço não encontrado");
  }

  await repos.services.delete(id);
}
