import { Type } from "@sinclair/typebox";
import { createRepositories } from "../infra/prisma/repositories.js";
import { listBusinessHours } from "../application/usecases/business/listBusinessHours.js";
import { replaceBusinessBreaks } from "../application/usecases/business/replaceBusinessBreaks.js";
import { updateBusinessHours } from "../application/usecases/business/updateBusinessHours.js";
const TimeString = Type.String({ pattern: "^\\d{2}:\\d{2}$" });
const BusinessHoursItem = Type.Object({
    dayOfWeek: Type.Integer({ minimum: 0, maximum: 6 }),
    openTime: TimeString,
    closeTime: TimeString,
    isOff: Type.Boolean(),
});
const BreakItem = Type.Object({
    startTime: TimeString,
    endTime: TimeString,
});
const DayOfWeekParams = Type.Object({
    dayOfWeek: Type.Integer({ minimum: 0, maximum: 6 }),
});
export const businessHoursRoutes = async (app) => {
    app.get("/business-hours", {
        schema: {
            tags: ["business"],
            description: "Lista as janelas de atendimento por dia da semana",
        },
    }, async () => {
        const repos = createRepositories(app.prisma);
        return listBusinessHours(repos);
    });
    // Upsert em lote das janelas por dia da semana
    app.put("/business-hours", {
        schema: {
            tags: ["business"],
            body: Type.Array(BusinessHoursItem, { minItems: 1, maxItems: 7 }),
            description: "Atualiza as janelas de atendimento por dia da semana",
        },
    }, async (req) => {
        const body = req.body;
        const repos = createRepositories(app.prisma);
        await updateBusinessHours(repos, body);
        return listBusinessHours(repos);
    });
    // Substitui os intervalos de pausa (breaks) de um dia
    app.put("/business-hours/:dayOfWeek/breaks", {
        schema: {
            tags: ["business"],
            params: DayOfWeekParams,
            body: Type.Array(BreakItem, { minItems: 1 }),
            description: "Atualiza os intervalos de pausa de um dia",
        },
    }, async (req) => {
        const params = req.params;
        const body = req.body;
        const repos = createRepositories(app.prisma);
        return replaceBusinessBreaks(repos, {
            dayOfWeek: params.dayOfWeek,
            breaks: body.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
        });
    });
};
//# sourceMappingURL=businessHours.js.map