import type { Repositories, Service } from "../../ports/index.js";
export declare function updateService(repos: Pick<Repositories, "services">, args: {
    id: number;
    name: string;
    priceInCents: number;
    durationInMinutes: number;
}): Promise<Service>;
//# sourceMappingURL=updateService.d.ts.map