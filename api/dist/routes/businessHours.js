import { Type } from "@sinclair/typebox";
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
        return app.prisma.businessHours.findMany({
            orderBy: { dayOfWeek: "asc" },
            include: { breaks: true },
        });
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
        await app.prisma.$transaction(body.map((item) => app.prisma.businessHours.upsert({
            where: { dayOfWeek: item.dayOfWeek },
            create: item,
            update: item,
        })));
        return app.prisma.businessHours.findMany({
            orderBy: { dayOfWeek: "asc" },
            include: { breaks: true },
        });
    });
    // Substitui os intervalos de pausa (breaks) de um dia
    app.put("/business-hours/:dayOfWeek/breaks", {
        schema: {
            tags: ["business"],
            params: DayOfWeekParams,
            body: Type.Array(BreakItem, { minItems: 1 }),
            description: "Atualiza os intervalos de pausa de um dia",
        },
    }, async (req, reply) => {
        const params = req.params;
        const body = req.body;
        const bh = await app.prisma.businessHours.findUnique({
            where: { dayOfWeek: params.dayOfWeek },
        });
        if (!bh) {
            return reply.status(404).send({ message: "BusinessHours não configurado para esse dia" });
        }
        await app.prisma.$transaction([
            app.prisma.businessBreak.deleteMany({ where: { businessHoursId: bh.id } }),
            app.prisma.businessBreak.createMany({
                data: body.map((b) => ({
                    businessHoursId: bh.id,
                    startTime: b.startTime,
                    endTime: b.endTime,
                })),
            }),
        ]);
        return app.prisma.businessHours.findUnique({
            where: { dayOfWeek: params.dayOfWeek },
            include: { breaks: true },
        });
    });
};
//# sourceMappingURL=businessHours.js.map