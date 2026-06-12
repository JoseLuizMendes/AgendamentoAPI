import { z } from "zod";

// Auth schemas
export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  name: z.string().optional(),
  tenantName: z.string().min(1, "Nome do tenant é obrigatório"),
  tenantSlug: z.string().min(1, "Slug do tenant é obrigatório").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
});

// User schemas
export const UserCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
});

export const UserParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Service schemas
export const ServiceCreateSchema = z.object({
  name: z.string().min(1).max(200),
  priceInCents: z.number().int().min(0),
  durationInMinutes: z.number().int().min(1).max(24 * 60),
});

export const ServiceUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  priceInCents: z.number().int().min(0).optional(),
  durationInMinutes: z.number().int().min(1).max(24 * 60).optional(),
});

export const ServiceParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Appointment schemas
export const AppointmentStatusEnum = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELED",
]);

export const AppointmentCreateSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(6).max(30),
  customerEmail: z.string().email().optional(),
  notes: z.string().max(2000).optional(),
  serviceId: z.number().int().positive(),
  startTime: z.string().datetime(),
  // Duração livre (opcional): fim custom; ausente => derivado da duração do serviço.
  endTime: z.string().datetime().optional(),
});

export const AppointmentUpdateSchema = z.object({
  status: AppointmentStatusEnum.optional(),
  startTime: z.string().datetime().optional(),
  // Redimensionar/reagendar com duração livre.
  endTime: z.string().datetime().optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerPhone: z.string().min(6).max(30).optional(),
  customerEmail: z.string().email().optional(),
  notes: z.string().max(2000).optional(),
});

export const AppointmentParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const AppointmentQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive().optional(),
  status: AppointmentStatusEnum.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Availability schema
export const AvailabilityQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Business Hours schemas
export const BusinessHoursCreateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isOff: z.boolean().optional(),
});

export const BusinessHoursUpdateSchema = z.object({
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isOff: z.boolean().optional(),
});

export const BusinessHoursParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Override schemas
export const OverrideCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isOff: z.boolean().optional(),
});

export const OverrideUpdateSchema = z.object({
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isOff: z.boolean().optional(),
});

export const OverrideParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Business Break schemas
export const BreakCreateSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const BreakParamsSchema = z.object({
  hoursId: z.coerce.number().int().positive(),
  breakId: z.coerce.number().int().positive(),
});

export const HoursIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Tenant settings schemas
export const SettingsUpdateSchema = z.object({
  allowCustomerBooking: z.boolean().optional(),
  timezone: z.string().min(1).optional(),
  slotIntervalMinutes: z.number().int().min(5).max(240).optional(),
  minLeadTimeMinutes: z.number().int().min(0).max(60 * 24 * 30).optional(),
  maxAdvanceDays: z.number().int().min(1).max(730).optional(),
});

// Public (self-booking) schemas
export const PublicParamsSchema = z.object({
  slug: z.string().min(1),
});

export const PublicAvailabilityQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const PublicAppointmentCreateSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(6).max(30),
  customerEmail: z.string().email().optional(),
  notes: z.string().max(2000).optional(),
  serviceId: z.number().int().positive(),
  startTime: z.string().datetime(),
});

// Response schemas
export const ErrorResponseSchema = z.object({
  message: z.string(),
});

export const ServiceResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  priceInCents: z.number(),
  durationInMinutes: z.number(),
  tenantId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ServiceListResponseSchema = z.array(ServiceResponseSchema);

export const AppointmentResponseSchema = z.object({
  id: z.number(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().nullable(),
  notes: z.string().nullable(),
  serviceId: z.number(),
  userId: z.number().nullable(),
  tenantId: z.number(),
  startTime: z.date(),
  endTime: z.date(),
  status: AppointmentStatusEnum,
  version: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  service: ServiceResponseSchema.optional(),
});

export const AppointmentListResponseSchema = z.array(AppointmentResponseSchema);

export const SlotResponseSchema = z.array(
  z.object({
    startTime: z.string(),
    endTime: z.string(),
  })
);

export const SettingsResponseSchema = z.object({
  allowCustomerBooking: z.boolean(),
  timezone: z.string(),
  slotIntervalMinutes: z.number(),
  minLeadTimeMinutes: z.number(),
  maxAdvanceDays: z.number(),
});

// Reports / Dashboard
export const ReportQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

const ReportScalarsSchema = z.object({
  revenueRealizedInCents: z.number(),
  revenueExpectedInCents: z.number(),
  appointmentsTotal: z.number(),
  completed: z.number(),
  canceled: z.number(),
  noShow: z.number(),
  clients: z.number(),
  newClients: z.number(),
  ticketMedioInCents: z.number(),
  occupancyRate: z.number(),
  noShowRate: z.number(),
  cancelRate: z.number(),
  byStatus: z.record(z.string(), z.number()),
});

export const ReportSummaryResponseSchema = z.object({
  range: z.object({ from: z.string(), to: z.string(), granularity: z.string() }),
  current: ReportScalarsSchema,
  previous: ReportScalarsSchema,
  series: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      revenueInCents: z.number(),
      appointments: z.number(),
    }),
  ),
  topServices: z.array(
    z.object({
      serviceId: z.number(),
      name: z.string(),
      count: z.number(),
      revenueInCents: z.number(),
    }),
  ),
  byWeekday: z.array(z.number()),
  byHour: z.array(z.number()),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type ServiceCreate = z.infer<typeof ServiceCreateSchema>;
export type ServiceUpdate = z.infer<typeof ServiceUpdateSchema>;
export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;
export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;
export type BusinessHoursCreate = z.infer<typeof BusinessHoursCreateSchema>;
export type BusinessHoursUpdate = z.infer<typeof BusinessHoursUpdateSchema>;
export type OverrideCreate = z.infer<typeof OverrideCreateSchema>;
export type OverrideUpdate = z.infer<typeof OverrideUpdateSchema>;
