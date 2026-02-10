import type { Repositories, Service } from "../../ports/index.js";
export declare function createService(repos: Pick<Repositories, "services">, input: {
    name: string;
    priceInCents: number;
    durationInMinutes: number;
}): Promise<Service>;
//# sourceMappingURL=createService.d.ts.map