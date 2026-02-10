import { NotFoundError } from "../../errors.js";
export async function updateService(repos, args) {
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
//# sourceMappingURL=updateService.js.map