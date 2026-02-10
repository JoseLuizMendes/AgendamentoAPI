import type { BusinessDateOverride, Repositories } from "../../ports/index.js";
export declare function upsertBusinessDateOverride(repos: Pick<Repositories, "businessDateOverrides" | "businessHours">, input: {
    date: string;
    isOff: boolean;
    openTime?: string;
    closeTime?: string;
}): Promise<BusinessDateOverride>;
//# sourceMappingURL=upsertBusinessDateOverride.d.ts.map