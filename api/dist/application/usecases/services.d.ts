import type { CreateServiceInput, ServiceRepository, UpdateServiceInput } from "../ports/serviceRepository.js";
export declare function listServices(repo: ServiceRepository): Promise<import("../ports/serviceRepository.js").Service[]>;
export declare function getService(repo: ServiceRepository, id: number): Promise<import("../ports/serviceRepository.js").Service>;
export declare function createService(repo: ServiceRepository, input: CreateServiceInput): Promise<import("../ports/serviceRepository.js").Service>;
export declare function updateService(repo: ServiceRepository, id: number, input: UpdateServiceInput): Promise<import("../ports/serviceRepository.js").Service>;
export declare function deleteService(repo: ServiceRepository, id: number): Promise<void>;
//# sourceMappingURL=services.d.ts.map