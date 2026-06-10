"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import { CalendarClock, LogOut, Info } from "lucide-react";

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

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

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
    <div className="min-h-svh bg-muted/20">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5" />
            <span className="font-display text-2xl leading-none">Agendamento</span>
            {me ? (
              <Badge variant="secondary" className="ml-2 font-mono text-xs">
                {me.tenant.slug}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {me ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {me.email} · {me.role}
              </span>
            ) : null}
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {!token ? (
          <Alert>
            <Info className="size-4" />
            <AlertTitle>Sem sessão ativa</AlertTitle>
            <AlertDescription>
              Faça{" "}
              <Link href="/signup" className="font-medium underline underline-offset-4">
                signup
              </Link>{" "}
              ou{" "}
              <Link href="/login" className="font-medium underline underline-offset-4">
                login
              </Link>{" "}
              para usar o painel.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="services" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="session">Sessão</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="hours">Horários</TabsTrigger>
            <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          </TabsList>

          {/* Sessão */}
          <TabsContent value="session">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl tracking-wide">Sessão</CardTitle>
                <CardDescription>Usuário autenticado e estabelecimento atual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="secondary" onClick={loadMe}>
                  Atualizar /auth/me
                </Button>
                <div className="grid gap-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Usuário:</span>{" "}
                    {me ? `${me.email} (${me.role})` : "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estabelecimento:</span>{" "}
                    {me ? `${me.tenant.name} (${me.tenant.slug})` : "-"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Serviços */}
          <TabsContent value="services">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">Novo serviço</CardTitle>
                  <CardDescription>Procedimento com preço e duração.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="svc-name">Nome</Label>
                    <Input id="svc-name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Ex: Limpeza" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="svc-price">Preço (centavos)</Label>
                      <Input id="svc-price" type="number" value={servicePrice} onChange={(e) => setServicePrice(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="svc-dur">Duração (min)</Label>
                      <Input id="svc-dur" type="number" value={serviceDuration} onChange={(e) => setServiceDuration(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createService}>Criar</Button>
                    <Button variant="outline" onClick={loadServices}>Recarregar</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">
                    Serviços <Badge variant="secondary" className="ml-1">{services.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum serviço ainda.</p>
                  ) : (
                    services.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">{formatBRL(s.priceInCents)} · {s.durationInMinutes}min</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Horários */}
          <TabsContent value="hours">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">Horário de funcionamento</CardTitle>
                  <CardDescription>0 = Domingo … 6 = Sábado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dow">Dia da semana</Label>
                    <Input id="dow" type="number" min={0} max={6} value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="open">Abre</Label>
                      <Input id="open" value={openTime} onChange={(e) => setOpenTime(e.target.value)} placeholder="09:00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="close">Fecha</Label>
                      <Input id="close" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} placeholder="18:00" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isOff} onChange={(e) => setIsOff(e.target.checked)} className="size-4 accent-primary" />
                    Fechado neste dia
                  </label>
                  <div className="flex gap-2">
                    <Button onClick={createHours}>Salvar</Button>
                    <Button variant="outline" onClick={loadHours}>Recarregar</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">
                    Horários <Badge variant="secondary" className="ml-1">{hours.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hours.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum horário configurado.</p>
                  ) : (
                    [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                      <div key={h.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <span className="font-medium">{DAYS[h.dayOfWeek] ?? h.dayOfWeek}</span>
                        <span className="text-muted-foreground">
                          {h.isOff ? "Fechado" : `${h.openTime} – ${h.closeTime}`}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Agendamentos */}
          <TabsContent value="appointments">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">Novo agendamento</CardTitle>
                  <CardDescription>Reserva para um cliente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cust-name">Cliente</Label>
                    <Input id="cust-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cust-phone">Telefone</Label>
                    <Input id="cust-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appt-svc">Serviço (id)</Label>
                      <Input id="appt-svc" type="number" value={appointmentServiceId} onChange={(e) => setAppointmentServiceId(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appt-start">Início</Label>
                      <Input id="appt-start" type="datetime-local" value={startTimeLocal} onChange={(e) => setStartTimeLocal(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createAppointment}>Agendar</Button>
                    <Button variant="outline" onClick={loadAppointments}>Recarregar</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">
                    Agendamentos <Badge variant="secondary" className="ml-1">{appointments.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum agendamento.</p>
                  ) : (
                    appointments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <span className="font-medium">{a.customerName}</span>
                        <span className="text-muted-foreground">
                          {new Date(a.startTime).toLocaleString("pt-BR")} · {a.status}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Resposta raw */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-display text-xl tracking-wide">Última resposta (raw)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted p-3 font-mono text-xs">
              {raw || "(vazio)"}
            </pre>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
