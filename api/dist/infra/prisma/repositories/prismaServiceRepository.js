import { NotFoundError } from "../../../core/errors.js";
export class PrismaServiceRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list() {
        return this.prisma.service.findMany({ orderBy: { id: "asc" } });
    }
    async getById(id) {
        return this.prisma.service.findUnique({ where: { id } });
    }
    async create(input) {
        return this.prisma.service.create({ data: input });
    }
    async update(id, input) {
        try {
            return await this.prisma.service.update({ where: { id }, data: input });
        }
        catch {
            // Deixa o handler global tratar P2025 também, mas isso melhora o caso mais comum
            throw new NotFoundError("Serviço não encontrado");
        }
    }
    async delete(id) {
        try {
            await this.prisma.service.delete({ where: { id } });
        }
        catch {
            throw new NotFoundError("Serviço não encontrado");
        }
    }
}
//# sourceMappingURL=prismaServiceRepository.js.map