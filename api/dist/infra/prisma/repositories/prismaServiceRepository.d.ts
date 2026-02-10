import type { PrismaClient } from "@prisma/client";
import type { CreateServiceInput, ServiceRepository, UpdateServiceInput } from "../../../application/ports/serviceRepository.js";
export declare class PrismaServiceRepository implements ServiceRepository {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    list(): Promise<{
        name: string;
        id: number;
        priceInCents: number;
        durationInMinutes: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getById(id: number): Promise<{
        name: string;
        id: number;
        priceInCents: number;
        durationInMinutes: number;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    create(input: CreateServiceInput): Promise<{
        name: string;
        id: number;
        priceInCents: number;
        durationInMinutes: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: number, input: UpdateServiceInput): Promise<{
        name: string;
        id: number;
        priceInCents: number;
        durationInMinutes: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(id: number): Promise<void>;
}
//# sourceMappingURL=prismaServiceRepository.d.ts.map