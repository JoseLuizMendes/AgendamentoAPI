import type { CreateServiceInput, ServiceRepository, UpdateServiceInput } from "../ports/serviceRepository.js";
import { NotFoundError } from "../../core/errors.js";

export async function listServices(repo: ServiceRepository) {
  return repo.list();
}

export async function getService(repo: ServiceRepository, id: number) {
  const service = await repo.getById(id);
  if (!service) {
    throw new NotFoundError("Serviço não encontrado");
  }
  return service;
}

export async function createService(repo: ServiceRepository, input: CreateServiceInput) {
  return repo.create(input);
}

export async function updateService(repo: ServiceRepository, id: number, input: UpdateServiceInput) {
  // valida existência para devolver 404 consistente
  const existing = await repo.getById(id);
  if (!existing) {
    throw new NotFoundError("Serviço não encontrado");
  }
  return repo.update(id, input);
}

export async function deleteService(repo: ServiceRepository, id: number) {
  const existing = await repo.getById(id);
  if (!existing) {
    throw new NotFoundError("Serviço não encontrado");
  }
  await repo.delete(id);
}
