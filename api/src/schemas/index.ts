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
});

export const AppointmentUpdateSchema = z.object({
  status: AppointmentStatusEnum.optional(),
  startTime: z.string().datetime().optional(),
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
