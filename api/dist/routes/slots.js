import { Type } from "@sinclair/typebox";
import { ErrorResponse } from "../schemas/http.js";
import { createRepositories } from "../infra/prisma/repositories.js";
import { getAvailableSlots } from "../application/usecases/slots/getAvailableSlots.js";
const SlotsQuery = Type.Object({
    serviceId: Type.Integer({ minimum: 1 }),
    date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
    intervalMinutes: Type.Optional(Type.Integer({ minimum: 1, maximum: 240 })),
});
const SlotResponse = Type.Object({
    startTime: Type.String(),
    endTime: Type.String(),
});
export const slotsRoutes = async (app) => {
    app.get("/slots", {
        schema: {
            tags: ["appointments"],
            description: "Obtém os horários disponíveis para agendamento",
            querystring: SlotsQuery,
            response: {
                200: Type.Array(SlotResponse),
                400: ErrorResponse,
                404: ErrorResponse,
            },
        },
    }, async (req) => {
        const query = req.query;
        const intervalMinutes = query.intervalMinutes ?? Number(process.env["SLOT_INTERVAL_MINUTES"] ?? 15);
        const repos = createRepositories(app.prisma);
        return getAvailableSlots(repos, {
            serviceId: query.serviceId,
            date: query.date,
            intervalMinutes,
        });
    });
};
//# sourceMappingURL=slots.js.map