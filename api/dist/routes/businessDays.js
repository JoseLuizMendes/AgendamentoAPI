import { Type } from "@sinclair/typebox";
import { ErrorResponse } from "../schemas/http.js";
import { assertIsoDate, parseTimeToMinutes, toDayOfWeekUtc } from "../lib/time.js";
const TimeString = Type.String({ pattern: "^\\d{2}:\\d{2}$" });
const DateParams = Type.Object({
    date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
});
const BusinessDayOverrideBody = Type.Object({
    isOff: Type.Boolean(),
    openTime: Type.Optional(TimeString),
    closeTime: Type.Optional(TimeString),
});
const BusinessDayOverrideResponse = Type.Object({
    id: Type.Integer(),
    date: Type.String(),
    openTime: Type.Union([TimeString, Type.Null()]),
    closeTime: Type.Union([TimeString, Type.Null()]),
    isOff: Type.Boolean(),
    createdAt: Type.String(),
    updatedAt: Type.String(),
});
export const businessDaysRoutes = async (app) => {
    app.get("/business-days", {
        schema: {
            tags: ["business"],
            description: "Lista exceções de funcionamento por data (YYYY-MM-DD)",
            response: {
                200: Type.Array(BusinessDayOverrideResponse),
            },
        },
    }, async () => {
        return app.prisma.businessDateOverride.findMany({ orderBy: { date: "asc" } });
    });
    app.put("/business-days/:date", {
        schema: {
            tags: ["business"],
            description: "Define exceção de funcionamento (abrir/fechar) para uma data específica",
            params: DateParams,
            body: BusinessDayOverrideBody,
            response: {
                200: BusinessDayOverrideResponse,
                400: ErrorResponse,
            },
        },
    }, async (req, reply) => {
        const params = req.params;
        const body = req.body;
        try {
            assertIsoDate(params.date);
        }
        catch (e) {
            return reply.status(400).send({ message: e.message });
        }
        const hasOpen = typeof body.openTime === "string";
        const hasClose = typeof body.closeTime === "string";
        if (hasOpen !== hasClose) {
            return reply.status(400).send({ message: "Informe openTime e closeTime juntos" });
        }
        if (hasOpen && hasClose) {
            const openMinutes = parseTimeToMinutes(body.openTime);
            const closeMinutes = parseTimeToMinutes(body.closeTime);
            if (closeMinutes <= openMinutes) {
                return reply.status(400).send({ message: "closeTime deve ser maior que openTime" });
            }
        }
        // Se está tentando "abrir" (isOff=false) sem horários, exige que exista configuração padrão do dia da semana.
        if (!body.isOff && !hasOpen && !hasClose) {
            const dayOfWeek = toDayOfWeekUtc(params.date);
            const base = await app.prisma.businessHours.findUnique({ where: { dayOfWeek } });
            if (!base) {
                return reply.status(400).send({
                    message: "Para ativar sem horários, configure primeiro /business-hours para o dia da semana correspondente",
                });
            }
        }
        const override = await app.prisma.businessDateOverride.upsert({
            where: { date: params.date },
            create: {
                date: params.date,
                isOff: body.isOff,
                openTime: body.openTime ?? null,
                closeTime: body.closeTime ?? null,
            },
            update: {
                isOff: body.isOff,
                openTime: body.openTime ?? null,
                closeTime: body.closeTime ?? null,
            },
        });
        return override;
    });
    app.delete("/business-days/:date", {
        schema: {
            tags: ["business"],
            description: "Remove a exceção de funcionamento de uma data",
            params: DateParams,
            response: {
                204: Type.Null(),
                404: ErrorResponse,
            },
        },
    }, async (req, reply) => {
        const params = req.params;
        try {
            assertIsoDate(params.date);
        }
        catch (e) {
            return reply.status(404).send({ message: "Override não encontrado para essa data" });
        }
        const existing = await app.prisma.businessDateOverride.findUnique({ where: { date: params.date } });
        if (!existing) {
            return reply.status(404).send({ message: "Override não encontrado para essa data" });
        }
        await app.prisma.businessDateOverride.delete({ where: { date: params.date } });
        return reply.status(204).send(null);
    });
};
//# sourceMappingURL=businessDays.js.map