// Tipos compartilhados do workspace da tenant (espelham as respostas da API).

export type MeResponse = {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  tenantId: number;
  tenant: { id: number; name: string; slug: string; businessType: "GENERIC" | "DENTAL" };
};

export type Service = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceInCents: number;
  durationInMinutes: number;
  tenantId: number;
};

export type BusinessBreak = {
  id: number;
  businessHoursId: number;
  startTime: string;
  endTime: string;
  label?: string | null;
};

export type BusinessHours = {
  id: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOff: boolean;
  tenantId: number;
  breaks: BusinessBreak[];
};

/** Exceção de data (feriado / horário especial). Espelha GET /overrides. */
export type BusinessDateOverride = {
  id: number;
  date: string; // YYYY-MM-DD
  openTime?: string | null;
  closeTime?: string | null;
  isOff: boolean;
  tenantId: number;
};

// Espelha GET /settings.
export type TenantSettings = {
  allowCustomerBooking: boolean;
  timezone: string;
  slotIntervalMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  /** Min após o início p/ entrar em "aguardando definição". */
  statusPromptAfterStartMin: number;
  /** Min após o fim p/ virar "passado" sem resolução. */
  overdueAfterEndMin: number;
};

export type Appointment = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  notes?: string | null;
  serviceId: number;
  tenantId: number;
  userId?: number | null;
  startTime: string;
  endTime: string;
  status: string;
  service?: Service;
  // Charting odontológico (presente no GET /appointments/:id de tenant DENTAL).
  teeth?: Tooth[];
};

// ── Odontológico (vertical DENTAL) — espelha as respostas da API ────────────────────────────
export type DentalProcedure =
  | "AVALIACAO"
  | "PROFILAXIA"
  | "RESTAURACAO"
  | "ENDODONTIA"
  | "EXTRACAO"
  | "COROA"
  | "PROTESE"
  | "IMPLANTE"
  | "CLAREAMENTO"
  | "RASPAGEM"
  | "SELANTE"
  | "FLUOR"
  | "RADIOGRAFIA"
  | "OUTRO";

/** Dente tratado numa consulta (GET /appointments/:id → teeth[]). */
export type Tooth = {
  id: number;
  appointmentId: number;
  toothFdi: number;
  procedure: DentalProcedure;
  note: string | null;
  createdAt: string;
};

/** Entrada do odontograma consolidado (GET /patients/:id/odontogram). */
export type OdontogramEntry = {
  toothFdi: number;
  procedure: DentalProcedure;
  note: string | null;
  lastTreatedAt: string;
};

/** Paciente (GET /patients, /patients/:id). */
export type Patient = {
  id: number;
  tenantId: number;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientDetail = Patient & { appointments: Appointment[] };
