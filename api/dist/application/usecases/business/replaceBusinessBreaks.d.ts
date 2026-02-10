import type { BusinessHours, Repositories } from "../../ports/index.js";
export declare function replaceBusinessBreaks(repos: Pick<Repositories, "businessHours">, input: {
    dayOfWeek: number;
    breaks: BusinessHours["breaks"];
}): Promise<BusinessHours>;
//# sourceMappingURL=replaceBusinessBreaks.d.ts.map