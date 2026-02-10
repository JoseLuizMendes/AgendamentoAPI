import { NotFoundError } from "../../errors.js";
import type { Repositories, Service } from "../../ports/index.js";

export async function updateService(
  repos: Pick<Repositories, "services">,
  args: { id: number; name: string; priceInCents: number; durationInMinutes: number }
): Promise<Service> {
  const existing = await repos.services.getById(args.id);
  if (!existing) {
    throw new NotFoundError("Serviço não encontrado");
  }

  return repos.services.update(args.id, {
    name: args.name,
    priceInCents: args.priceInCents,
    durationInMinutes: args.durationInMinutes,
  });
}
