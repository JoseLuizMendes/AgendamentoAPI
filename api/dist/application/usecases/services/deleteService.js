import { NotFoundError } from "../../errors.js";
export async function deleteService(repos, id) {
    const existing = await repos.services.getById(id);
    if (!existing) {
        throw new NotFoundError("Serviço não encontrado");
    }
    await repos.services.delete(id);
}
//# sourceMappingURL=deleteService.js.map