import { Prisma } from "@prisma/client";
import { NotFoundError } from "../../application/errors.js";
function mapService(s) {
    return s;
}
function mapAppointment(a) {
    return {
        ...a,
        status: a.status,
    };
}
export function createRepositories(db) {
    return {
        services: {
            async list() {
                const res = await db.service.findMany({ orderBy: { id: "asc" } });
                return res.map(mapService);
            },
            async getById(id) {
                const service = await db.service.findUnique({ where: { id } });
                return service ? mapService(service) : null;
            },
            async create(input) {
                const created = await db.service.create({ data: input });
                return mapService(created);
            },
            async update(id, input) {
                const updated = await db.service.update({ where: { id }, data: input });
                return mapService(updated);
            },
            async delete(id) {
                await db.service.delete({ where: { id } });
            },
        },
        businessHours: {
            async list() {
                const rows = await db.businessHours.findMany({
                    orderBy: { dayOfWeek: "asc" },
                    include: { breaks: true },
                });
                return rows.map((r) => ({
                    dayOfWeek: r.dayOfWeek,
                    openTime: r.openTime,
                    closeTime: r.closeTime,
                    isOff: r.isOff,
                    breaks: r.breaks.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
                }));
            },
            async upsertMany(items) {
                const ops = items.map((item) => db.businessHours.upsert({
                    where: { dayOfWeek: item.dayOfWeek },
                    create: item,
                    update: item,
                }));
                if ("$transaction" in db) {
                    await db.$transaction(ops);
                    return;
                }
                await Promise.all(ops);
            },
            async getByDayOfWeek(dayOfWeek) {
                const r = await db.businessHours.findUnique({ where: { dayOfWeek }, include: { breaks: true } });
                if (!r)
                    return null;
                return {
                    dayOfWeek: r.dayOfWeek,
                    openTime: r.openTime,
                    closeTime: r.closeTime,
                    isOff: r.isOff,
                    breaks: r.breaks.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
                };
            },
            async replaceBreaks(dayOfWeek, breaks) {
                const bh = await db.businessHours.findUnique({ where: { dayOfWeek } });
                if (!bh) {
                    throw new NotFoundError("BusinessHours não configurado para esse dia");
                }
                const txOps = [
                    db.businessBreak.deleteMany({ where: { businessHoursId: bh.id } }),
                    db.businessBreak.createMany({
                        data: breaks.map((b) => ({
                            businessHoursId: bh.id,
                            startTime: b.startTime,
                            endTime: b.endTime,
                        })),
                    }),
                ];
                if ("$transaction" in db) {
                    await db.$transaction(txOps);
                }
                else {
                    // Em TransactionClient não existe $transaction; executa em sequência
                    for (const op of txOps) {
                        await op;
                    }
                }
                const updated = await db.businessHours.findUnique({ where: { dayOfWeek }, include: { breaks: true } });
                if (!updated)
                    throw new Error("BusinessHours não encontrado");
                return {
                    dayOfWeek: updated.dayOfWeek,
                    openTime: updated.openTime,
                    closeTime: updated.closeTime,
                    isOff: updated.isOff,
                    breaks: updated.breaks.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
                };
            },
        },
        businessDateOverrides: {
            async list() {
                return db.businessDateOverride.findMany({ orderBy: { date: "asc" } });
            },
            async getByDate(date) {
                return db.businessDateOverride.findUnique({ where: { date } });
            },
            async upsert(input) {
                return db.businessDateOverride.upsert({
                    where: { date: input.date },
                    create: input,
                    update: input,
                });
            },
            async deleteByDate(date) {
                await db.businessDateOverride.delete({ where: { date } });
            },
        },
        appointments: {
            async listScheduledWithinDate(date) {
                const start = new Date(`${date}T00:00:00.000Z`);
                const end = new Date(`${date}T23:59:59.999Z`);
                return db.appointment.findMany({
                    where: { status: "SCHEDULED", startTime: { gte: start, lt: end } },
                    select: { startTime: true, endTime: true },
                });
            },
            async findScheduledConflict({ startTime, endTime }) {
                return db.appointment.findFirst({
                    where: {
                        status: "SCHEDULED",
                        startTime: { lt: endTime },
                        endTime: { gt: startTime },
                    },
                    select: { id: true },
                });
            },
            async create(input) {
                const created = await db.appointment.create({ data: input });
                return mapAppointment(created);
            },
            async findById(id) {
                const a = await db.appointment.findUnique({ where: { id } });
                return a ? mapAppointment(a) : null;
            },
            async cancelOptimistic({ id, version }) {
                const updated = await db.appointment.updateMany({
                    where: { id, version, status: "SCHEDULED" },
                    data: { status: "CANCELED", version: { increment: 1 } },
                });
                return { updated: updated.count > 0 };
            },
        },
    };
}
export function isRetryableSerializableError(err) {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
}
//# sourceMappingURL=repositories.js.map