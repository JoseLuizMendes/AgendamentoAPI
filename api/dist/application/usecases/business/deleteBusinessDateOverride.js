import { NotFoundError, ValidationError } from "../../errors.js";
import { assertIsoDate } from "../../../lib/time.js";
export async function deleteBusinessDateOverride(repos, date) {
    try {
        assertIsoDate(date);
    }
    catch {
        throw new NotFoundError("Override não encontrado para essa data");
    }
    const existing = await repos.businessDateOverrides.getByDate(date);
    if (!existing) {
        throw new NotFoundError("Override não encontrado para essa data");
    }
    try {
        await repos.businessDateOverrides.deleteByDate(date);
    }
    catch (e) {
        throw new ValidationError("Falha ao remover override");
    }
}
//# sourceMappingURL=deleteBusinessDateOverride.js.map