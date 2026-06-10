"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarDays,
  Clock,
  LogOut,
  Phone,
  Plus,
  RefreshCw,
  Tag,
  TrendingUp,
} from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Eyebrow } from "@/components/brand/eyebrow";
import { GridLines } from "@/components/brand/grid-lines";

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

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Agendado", cls: "border-foreground/20 text-foreground" },
  CONFIRMED: {
    label: "Confirmado",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  COMPLETED: { label: "Concluído", cls: "border-foreground/15 bg-foreground/5 text-muted-foreground" },
  NO_SHOW: {
    label: "Não compareceu",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  CANCELED: { label: "Cancelado", cls: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" },
};

/** Próximos status possíveis a partir do atual (espelha o backend). */
const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  SCHEDULED: [
    { value: "CONFIRMED", label: "Confirmar" },
    { value: "COMPLETED", label: "Concluir" },
    { value: "CANCELED", label: "Cancelar" },
  ],
  CONFIRMED: [
    { value: "COMPLETED", label: "Concluir" },
    { value: "NO_SHOW", label: "Faltou" },
    { value: "CANCELED", label: "Cancelar" },
  ],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELED: [],
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Agendamentos futuros que ainda contam (não cancelados / sem falta). */
function countUpcoming(list: Appointment[]): number {
  const now = Date.now();
  return list.filter(
    (a) => +new Date(a.startTime) >= now && a.status !== "CANCELED" && a.status !== "NO_SHOW",
  ).length;
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, cls: "border-foreground/20 text-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function EmptyState({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <div className="border-border flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <Icon className="text-muted-foreground size-6" />
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-card/60 relative overflow-hidden rounded-xl border p-5 backdrop-blur">
      <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="font-display mt-3 text-4xl leading-none tracking-wide">{value}</div>
    </div>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = String(params.tenant ?? "");

  // Gate de auth pós-montagem: o token só existe no client (localStorage), então
  // a primeira renderização precisa bater com o servidor (ambos sem token) para
  // não disparar hydration mismatch. Lemos o token dentro do effect.
  const [authChecked, setAuthChecked] = useState(false);

  const [me, setMe] = useState<MeResponse | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePriceReais, setServicePriceReais] = useState("");
  const [serviceDuration, setServiceDuration] = useState<number>(30);
  const [savingService, setSavingService] = useState(false);

  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [isOff, setIsOff] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [appointmentServiceId, setAppointmentServiceId] = useState<number>(0);
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);

  function handleError(err: unknown, fallback = "Erro inesperado") {
    if (err instanceof ApiError && err.status === 401) {
      router.replace("/login");
      return;
    }
    toast.error(err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback);
  }

  async function loadMe() {
    try {
      const res = await apiRequest<MeResponse>("/auth/me");
      setMe(res);
      // O slug na URL deve corresponder ao tenant do token.
      if (res.tenant.slug !== tenantSlug) router.replace(`/${res.tenant.slug}`);
    } catch (err) {
      handleError(err);
    }
  }

  async function loadServices() {
    try {
      const res = await apiRequest<Service[]>("/services");
      setServices(res);
      if (res.length > 0 && appointmentServiceId === 0) setAppointmentServiceId(res[0].id);
    } catch (err) {
      handleError(err);
    }
  }

  async function createService() {
    const priceInCents = Math.round(Number(servicePriceReais.replace(",", ".")) * 100);
    if (!serviceName.trim()) return toast.error("Informe o nome do serviço");
    if (!Number.isFinite(priceInCents) || priceInCents < 0) return toast.error("Preço inválido");

    setSavingService(true);
    try {
      await apiRequest<Service>("/services", {
        method: "POST",
        body: { name: serviceName.trim(), priceInCents, durationInMinutes: serviceDuration },
      });
      toast.success("Serviço criado");
      setServiceName("");
      setServicePriceReais("");
      setServiceDuration(30);
      await loadServices();
    } catch (err) {
      handleError(err);
    } finally {
      setSavingService(false);
    }
  }

  async function loadHours() {
    try {
      setHours(await apiRequest<BusinessHours[]>("/hours"));
    } catch (err) {
      handleError(err);
    }
  }

  async function createHours() {
    setSavingHours(true);
    try {
      await apiRequest<BusinessHours>("/hours", {
        method: "POST",
        body: { dayOfWeek, openTime, closeTime, isOff: isOff || undefined },
      });
      toast.success(`Horário de ${DAYS[dayOfWeek]} salvo`);
      await loadHours();
    } catch (err) {
      handleError(err);
    } finally {
      setSavingHours(false);
    }
  }

  async function loadAppointments() {
    try {
      const res = await apiRequest<Appointment[]>("/appointments");
      setAppointments(res);
      setUpcomingCount(countUpcoming(res));
    } catch (err) {
      handleError(err);
    }
  }

  async function createAppointment() {
    if (!customerName.trim()) return toast.error("Informe o cliente");
    if (!appointmentServiceId) return toast.error("Selecione um serviço");
    if (!startTimeLocal) return toast.error("Informe o início");

    setSavingAppointment(true);
    try {
      const startIso = new Date(startTimeLocal).toISOString();
      await apiRequest<Appointment>("/appointments", {
        method: "POST",
        body: { customerName: customerName.trim(), customerPhone, serviceId: appointmentServiceId, startTime: startIso },
      });
      toast.success("Agendamento criado");
      setCustomerName("");
      setCustomerPhone("");
      setStartTimeLocal("");
      await loadAppointments();
    } catch (err) {
      handleError(err);
    } finally {
      setSavingAppointment(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      await apiRequest<Appointment>(`/appointments/${id}`, { method: "PATCH", body: { status } });
      toast.success("Status atualizado");
      await loadAppointments();
    } catch (err) {
      handleError(err);
    }
  }

  function logout() {
    clearToken();
    router.push("/login");
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
    void loadMe();
    void loadServices();
    void loadHours();
    void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime)),
    [appointments],
  );

  const openDays = useMemo(() => hours.filter((h) => !h.isOff).length, [hours]);

  if (!authChecked) return null;

  return (
    <div className="bg-background min-h-svh">
      {/* ---- Header ---- */}
      <header className="border-border bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <CalendarClock className="size-5 shrink-0" />
            <span className="font-display truncate text-2xl leading-none">{me?.tenant.name ?? "Workspace"}</span>
            <Badge variant="secondary" className="ml-1 hidden font-mono text-xs sm:inline-flex">
              /{tenantSlug}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {me ? (
              <span className="text-muted-foreground hidden text-sm md:inline">
                {me.email} · <span className="font-mono text-xs uppercase">{me.role}</span>
              </span>
            ) : null}
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      {/* ---- Faixa-herói + KPIs ---- */}
      <section className="border-border relative overflow-hidden border-b">
        <GridLines className="opacity-[0.4]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <Eyebrow className="mb-5">Painel do estabelecimento</Eyebrow>
          <h1 className="font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.9] tracking-wide">
            {me?.tenant.name ?? "Carregando…"}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-lg">
            Gerencie agendamentos, serviços e horários de funcionamento — tudo em um só lugar.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={CalendarDays} label="Agendamentos" value={appointments.length} />
            <Kpi icon={TrendingUp} label="Próximos" value={upcomingCount} />
            <Kpi icon={Tag} label="Serviços" value={services.length} />
            <Kpi icon={Clock} label="Dias abertos" value={openDays} />
          </div>
        </div>
      </section>

      {/* ---- Conteúdo ---- */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="appointments">
              <CalendarDays className="size-4" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="services">
              <Tag className="size-4" /> Serviços
            </TabsTrigger>
            <TabsTrigger value="hours">
              <Clock className="size-4" /> Horários
            </TabsTrigger>
          </TabsList>

          {/* ===== Agenda ===== */}
          <TabsContent value="appointments">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">Novo agendamento</CardTitle>
                  <CardDescription>Reserve um horário para um cliente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cust-name">Cliente</Label>
                    <Input id="cust-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cust-phone">Telefone</Label>
                    <Input id="cust-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appt-svc">Serviço</Label>
                    <NativeSelect
                      id="appt-svc"
                      value={appointmentServiceId}
                      onChange={(e) => setAppointmentServiceId(Number(e.target.value))}
                      disabled={services.length === 0}
                    >
                      {services.length === 0 ? (
                        <option value={0}>Cadastre um serviço primeiro</option>
                      ) : (
                        services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {formatBRL(s.priceInCents)} · {s.durationInMinutes}min
                          </option>
                        ))
                      )}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appt-start">Início</Label>
                    <Input id="appt-start" type="datetime-local" value={startTimeLocal} onChange={(e) => setStartTimeLocal(e.target.value)} />
                  </div>
                  <Button onClick={createAppointment} disabled={savingAppointment || services.length === 0} className="w-full">
                    <Plus className="size-4" /> {savingAppointment ? "Agendando..." : "Agendar"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-display flex items-center gap-2 text-xl tracking-wide">
                      Agenda
                      <Badge variant="secondary">{appointments.length}</Badge>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadAppointments}>
                      <RefreshCw className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedAppointments.length === 0 ? (
                    <EmptyState icon={CalendarDays}>Nenhum agendamento ainda.</EmptyState>
                  ) : (
                    sortedAppointments.map((a) => {
                      const svc = a.service ?? serviceById.get(a.serviceId);
                      const transitions = NEXT_STATUS[a.status] ?? [];
                      return (
                        <div key={a.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{a.customerName}</p>
                              <p className="text-muted-foreground mt-0.5 text-sm">{svc?.name ?? "Serviço removido"}</p>
                            </div>
                            <StatusPill status={a.status} />
                          </div>
                          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarClock className="size-3.5" />
                              {new Date(a.startTime).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {a.customerPhone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="size-3.5" />
                                {a.customerPhone}
                              </span>
                            ) : null}
                          </div>
                          {transitions.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                              {transitions.map((t) => (
                                <Button
                                  key={t.value}
                                  variant={t.value === "CANCELED" || t.value === "NO_SHOW" ? "ghost" : "outline"}
                                  size="sm"
                                  onClick={() => updateStatus(a.id, t.value)}
                                >
                                  {t.label}
                                </Button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== Serviços ===== */}
          <TabsContent value="services">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">Novo serviço</CardTitle>
                  <CardDescription>Procedimento com preço e duração.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="svc-name">Nome</Label>
                    <Input id="svc-name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Ex: Limpeza de pele" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="svc-price">Preço</Label>
                      <div className="border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex h-9 items-center rounded-md border bg-transparent pl-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                        <span className="text-muted-foreground select-none text-sm">R$</span>
                        <input
                          id="svc-price"
                          inputMode="decimal"
                          value={servicePriceReais}
                          onChange={(e) => setServicePriceReais(e.target.value)}
                          placeholder="0,00"
                          className="placeholder:text-muted-foreground h-full w-full bg-transparent px-2 text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="svc-dur">Duração (min)</Label>
                      <Input id="svc-dur" type="number" min={1} value={serviceDuration} onChange={(e) => setServiceDuration(Number(e.target.value))} />
                    </div>
                  </div>
                  <Button onClick={createService} disabled={savingService} className="w-full">
                    <Plus className="size-4" /> {savingService ? "Criando..." : "Criar serviço"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-display flex items-center gap-2 text-xl tracking-wide">
                      Serviços
                      <Badge variant="secondary">{services.length}</Badge>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadServices}>
                      <RefreshCw className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {services.length === 0 ? (
                    <EmptyState icon={Tag}>Nenhum serviço cadastrado.</EmptyState>
                  ) : (
                    services.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1.5 text-xs">
                            <Clock className="size-3.5" />
                            {s.durationInMinutes} min
                          </p>
                        </div>
                        <span className="font-display shrink-0 text-2xl tracking-wide">{formatBRL(s.priceInCents)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== Horários ===== */}
          <TabsContent value="hours">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="font-display text-xl tracking-wide">Horário de funcionamento</CardTitle>
                  <CardDescription>Defina abertura e fechamento por dia.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dow">Dia da semana</Label>
                    <NativeSelect id="dow" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                      {DAYS.map((d, i) => (
                        <option key={i} value={i}>
                          {d}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="open">Abre</Label>
                      <Input id="open" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} disabled={isOff} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="close">Fecha</Label>
                      <Input id="close" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} disabled={isOff} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isOff} onChange={(e) => setIsOff(e.target.checked)} className="accent-primary size-4" />
                    Fechado neste dia
                  </label>
                  <Button onClick={createHours} disabled={savingHours} className="w-full">
                    <Plus className="size-4" /> {savingHours ? "Salvando..." : "Salvar horário"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-display flex items-center gap-2 text-xl tracking-wide">
                      Semana
                      <Badge variant="secondary">{hours.length}</Badge>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadHours}>
                      <RefreshCw className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hours.length === 0 ? (
                    <EmptyState icon={Clock}>Nenhum horário configurado.</EmptyState>
                  ) : (
                    DAYS.map((dayName, idx) => {
                      const h = hours.find((x) => x.dayOfWeek === idx);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                            h ? "" : "opacity-50"
                          }`}
                        >
                          <span className="font-medium">{dayName}</span>
                          <span className="text-muted-foreground font-mono">
                            {!h ? "—" : h.isOff ? "Fechado" : `${h.openTime} – ${h.closeTime}`}
                          </span>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
