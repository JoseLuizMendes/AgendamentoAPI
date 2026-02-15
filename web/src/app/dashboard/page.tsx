"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type MeResponse = {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  tenantId: number;
  tenant: { id: number; name: string; slug: string };
};

type Service = {
  id: number;
  name: string;
  priceInCents: number;
  durationInMinutes: number;
  tenantId: number;
};

type BusinessHours = {
  id: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOff: boolean;
  tenantId: number;
};

type Appointment = {
  id: number;
  customerName: string;
  customerPhone: string;
  serviceId: number;
  tenantId: number;
  userId?: number | null;
  startTime: string;
  endTime: string;
  status: string;
  service?: Service;
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function DashboardPage() {
  const token = useMemo(() => getToken(), []);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<string>("");

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState<number>(0);
  const [serviceDuration, setServiceDuration] = useState<number>(30);

  // Hours state
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [isOff, setIsOff] = useState(false);

  // Appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [appointmentServiceId, setAppointmentServiceId] = useState<number>(0);
  const [startTimeLocal, setStartTimeLocal] = useState("");

  async function loadMe() {
    setError(null);
    try {
      const res = await apiRequest<MeResponse>("/auth/me");
      setMe(res);
      setRaw(formatJson(res));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erro inesperado");
    }
  }

  async function loadServices() {
    setError(null);
    try {
      const res = await apiRequest<Service[]>("/services");
      setServices(res);
      if (res.length > 0 && appointmentServiceId === 0) setAppointmentServiceId(res[0].id);
      setRaw(formatJson(res));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erro inesperado");
    }
  }

  async function createService() {
    setError(null);
    try {
      const res = await apiRequest<Service>("/services", {
        method: "POST",
        body: {
          name: serviceName,
          priceInCents: servicePrice,
          durationInMinutes: serviceDuration,
        },
      });
      setRaw(formatJson(res));
      setServiceName("");
      await loadServices();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erro inesperado");
    }
  }

  async function loadHours() {
    setError(null);
    try {
      const res = await apiRequest<BusinessHours[]>("/hours");
      setHours(res);
      setRaw(formatJson(res));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erro inesperado");
    }
  }

  async function createHours() {
    setError(null);
    try {
      const res = await apiRequest<BusinessHours>("/hours", {
        method: "POST",
        body: {
          dayOfWeek,
          openTime,
          closeTime,
          isOff: isOff || undefined,
        },
      });
      setRaw(formatJson(res));
      await loadHours();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erro inesperado");
    }
  }

  async function loadAppointments() {
    setError(null);
    try {
      const res = await apiRequest<Appointment[]>("/appointments");
      setAppointments(res);
      setRaw(formatJson(res));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erro inesperado");
    }
  }

  async function createAppointment() {
    setError(null);
    try {
      if (!startTimeLocal) throw new Error("Informe startTime");

      const startIso = new Date(startTimeLocal).toISOString();
      const res = await apiRequest<Appointment>("/appointments", {
        method: "POST",
        body: {
          customerName,
          customerPhone,
          serviceId: appointmentServiceId,
          startTime: startIso,
        },
      });
      setRaw(formatJson(res));
      setCustomerName("");
      setCustomerPhone("");
      await loadAppointments();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  function logout() {
    clearToken();
    setMe(null);
    setServices([]);
    setHours([]);
    setAppointments([]);
    setRaw("");
  }

  useEffect(() => {
    if (!token) return;
    void loadMe();
    void loadServices();
    void loadHours();
    void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between  gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard de teste</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Tudo que você criar usando o JWT fica no seu tenant; agendamentos ficam com `userId` do token.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link className="underline" href="/signup">
            signup
          </Link>
          <Link className="underline" href="/login">
            login
          </Link>
          <button className="underline" onClick={logout}>
            limpar token
          </button>
        </div>
      </div>

      {!token ? (
        <div className="mt-6 rounded border bg-yellow-50 p-4 text-sm">
          Sem JWT no navegador. Faça <Link className="underline" href="/signup">signup</Link> ou{" "}
          <Link className="underline" href="/login">login</Link>.
        </div>
      ) : null}

      {error ? <div className="mt-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}

      <div className="mt-6 grid gap-6 md:grid-cols-2 ">
        <section className="rounded border p-4">
          <h2 className="text-lg font-semibold">Sessão</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={loadMe}>
              /auth/me
            </button>
          </div>
          <div className="mt-3 text-sm text-zinc-700">
            <div><span className="font-medium">User:</span> {me ? `${me.email} (${me.role})` : "-"}</div>
            <div><span className="font-medium">Tenant:</span> {me ? `${me.tenant.slug}` : "-"}</div>
          </div>
        </section>

        <section className="rounded border p-4">
          <h2 className="text-lg font-semibold">Services</h2>
          <div className="mt-3 grid gap-2">
            <input className="rounded border p-2 text-sm" placeholder="name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
            <input className="rounded border p-2 text-sm" type="number" placeholder="priceInCents" value={servicePrice} onChange={(e) => setServicePrice(Number(e.target.value))} />
            <input className="rounded border p-2 text-sm" type="number" placeholder="durationInMinutes" value={serviceDuration} onChange={(e) => setServiceDuration(Number(e.target.value))} />
            <div className="flex gap-2">
              <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={createService}>
                POST /services
              </button>
              <button className="rounded border px-3 py-2 text-sm" onClick={loadServices}>
                GET /services
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-600">Total: {services.length}</div>
        </section>

        <section className="rounded border p-4">
          <h2 className="text-lg font-semibold">Business Hours</h2>
          <div className="mt-3 grid gap-2">
            <input className="rounded border p-2 text-sm" type="number" min={0} max={6} value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} />
            <input className="rounded border p-2 text-sm" value={openTime} onChange={(e) => setOpenTime(e.target.value)} placeholder="openTime (HH:mm)" />
            <input className="rounded border p-2 text-sm" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} placeholder="closeTime (HH:mm)" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isOff} onChange={(e) => setIsOff(e.target.checked)} />
              isOff
            </label>
            <div className="flex gap-2">
              <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={createHours}>
                POST /hours
              </button>
              <button className="rounded border px-3 py-2 text-sm" onClick={loadHours}>
                GET /hours
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-600">Total: {hours.length}</div>
        </section>

        <section className="rounded border p-4">
          <h2 className="text-lg font-semibold">Appointments</h2>
          <div className="mt-3 grid gap-2">
            <input className="rounded border p-2 text-sm" placeholder="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <input className="rounded border p-2 text-sm" placeholder="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            <input className="rounded border p-2 text-sm" type="number" value={appointmentServiceId} onChange={(e) => setAppointmentServiceId(Number(e.target.value))} placeholder="serviceId" />
            <input className="rounded border p-2 text-sm" type="datetime-local" value={startTimeLocal} onChange={(e) => setStartTimeLocal(e.target.value)} />
            <div className="flex gap-2">
              <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={createAppointment}>
                POST /appointments
              </button>
              <button className="rounded border px-3 py-2 text-sm" onClick={loadAppointments}>
                GET /appointments
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-600">Total: {appointments.length}</div>
        </section>
      </div>

      <section className="mt-6 rounded border p-4 ">
        <h2 className="text-lg font-semibold">Última resposta (raw)</h2>
        <pre className="mt-3 max-h-[420px] overflow-auto rounded border bg-black p-3 text-xs">{raw || "(vazio)"}</pre>
      </section>
    </div>
  );
}
