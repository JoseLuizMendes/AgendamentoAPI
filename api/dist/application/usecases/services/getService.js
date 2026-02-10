import { NotFoundError } from "../../errors.js";
export async function getService(repos, id) {
    const service = await repos.services.getById(id);
    if (!service) {
        throw new NotFoundError("Serviço não encontrado");
    }
    return service;
}
//# sourceMappingURL=getService.js.map