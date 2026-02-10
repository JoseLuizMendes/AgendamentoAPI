import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../../core/errors.js";
import type { CreateServiceInput, ServiceRepository, UpdateServiceInput } from "../../../application/ports/serviceRepository.js";

export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list() {
    return this.prisma.service.findMany({ orderBy: { id: "asc" } });
  }

  async getById(id: number) {
    return this.prisma.service.findUnique({ where: { id } });
  }

  async create(input: CreateServiceInput) {
    return this.prisma.service.create({ data: input });
  }

  async update(id: number, input: UpdateServiceInput) {
    try {
      return await this.prisma.service.update({ where: { id }, data: input });
    } catch {
      // Deixa o handler global tratar P2025 também, mas isso melhora o caso mais comum
      throw new NotFoundError("Serviço não encontrado");
    }
  }

  async delete(id: number) {
    try {
      await this.prisma.service.delete({ where: { id } });
    } catch {
      throw new NotFoundError("Serviço não encontrado");
    }
  }
}
