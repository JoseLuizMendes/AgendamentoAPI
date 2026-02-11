import { z } from "zod";

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
export const AppointmentCreateSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(6).max(30),
  serviceId: z.number().int().positive(),
  startTime: z.string().datetime(),
});

export const AppointmentUpdateSchema = z.object({
  status: z.enum(["SCHEDULED", "CANCELED"]).optional(),
  startTime: z.string().datetime().optional(),
});

export const AppointmentParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const AppointmentQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
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

// Response schemas
export const ErrorResponseSchema = z.object({
  message: z.string(),
});

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
