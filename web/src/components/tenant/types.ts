// Tipos compartilhados do workspace da tenant (espelham as respostas da API).

export type MeResponse = {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  tenantId: number;
  tenant: { id: number; name: string; slug: string };
};

export type Service = {
  id: number;
  name: string;
  priceInCents: number;
  durationInMinutes: number;
  tenantId: number;
};

export type BusinessHours = {
  id: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOff: boolean;
  tenantId: number;
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
};
