import type { FastifyPluginAsync } from "fastify";
import { Type, type Static } from "@sinclair/typebox";

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

type BusinessHoursItemT = Static<typeof BusinessHoursItem>;
type DayOfWeekParamsT = Static<typeof DayOfWeekParams>;
type BreakItemT = Static<typeof BreakItem>;

export const businessHoursRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/business-hours",
    {
      schema: {
        tags: ["business"],
      },
    },
    async () => {
      return app.prisma.businessHours.findMany({
        orderBy: { dayOfWeek: "asc" },
        include: { breaks: true },
      });
    }
  );

  // Upsert em lote das janelas por dia da semana
  app.put(
    "/business-hours",
    {
      schema: {
        tags: ["business"],
        body: Type.Array(BusinessHoursItem, { minItems: 1, maxItems: 7 }),
      },
    },
    async (req) => {
      const body = req.body as BusinessHoursItemT[];
      await app.prisma.$transaction(
        body.map((item) =>
          app.prisma.businessHours.upsert({
            where: { dayOfWeek: item.dayOfWeek },
            create: item,
            update: item,
          })
        )
      );

      return app.prisma.businessHours.findMany({
        orderBy: { dayOfWeek: "asc" },
        include: { breaks: true },
      });
    }
  );

  // Substitui os intervalos de pausa (breaks) de um dia
  app.put(
    "/business-hours/:dayOfWeek/breaks",
    {
      schema: {
        tags: ["business"],
        params: DayOfWeekParams,
        body: Type.Array(BreakItem),
      },
    },
    async (req, reply) => {
      const params = req.params as DayOfWeekParamsT;
      const body = req.body as BreakItemT[];
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
    }
  );
};
