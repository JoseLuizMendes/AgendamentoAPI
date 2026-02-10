import { NotFoundError } from "../../core/errors.js";
export async function listServices(repo) {
    return repo.list();
}
export async function getService(repo, id) {
    const service = await repo.getById(id);
    if (!service) {
        throw new NotFoundError("Serviço não encontrado");
    }
    return service;
}
export async function createService(repo, input) {
    return repo.create(input);
}
export async function updateService(repo, id, input) {
    // valida existência para devolver 404 consistente
    const existing = await repo.getById(id);
    if (!existing) {
        throw new NotFoundError("Serviço não encontrado");
    }
    return repo.update(id, input);
}
export async function deleteService(repo, id) {
    const existing = await repo.getById(id);
    if (!existing) {
        throw new NotFoundError("Serviço não encontrado");
    }
    await repo.delete(id);
}
//# sourceMappingURL=services.js.map