import type { BusinessHours, Repositories } from "../../ports/index.js";
export declare function updateBusinessHours(repos: Pick<Repositories, "businessHours">, items: Array<Pick<BusinessHours, "dayOfWeek" | "openTime" | "closeTime" | "isOff">>): Promise<void>;
//# sourceMappingURL=updateBusinessHours.d.ts.map