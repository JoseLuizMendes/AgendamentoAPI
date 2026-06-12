"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiRequest, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { BusinessHours, MeResponse, Service, TenantSettings } from "./types";

const DEFAULT_SETTINGS: TenantSettings = {
  allowCustomerBooking: false,
  timezone: "America/Sao_Paulo",
  slotIntervalMinutes: 15,
  minLeadTimeMinutes: 0,
  maxAdvanceDays: 90,
  statusPromptAfterStartMin: 0,
  overdueAfterEndMin: 60,
};

type TenantContextValue = {
  me: MeResponse;
  slug: string;
  services: Service[];
  hours: BusinessHours[];
  settings: TenantSettings;
  reloadServices: () => Promise<void>;
  reloadHours: () => Promise<void>;
  reloadSettings: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant precisa estar dentro de <TenantProvider>");
  return ctx;
}

/**
 * Faz o gate de auth pós-montagem (o token só existe no client, então a 1ª
 * renderização precisa bater com o servidor → loader determinístico, sem
 * hydration mismatch), carrega /auth/me + /services + /hours e disponibiliza
 * tudo via useTenant(). Só renderiza os filhos quando `me` está pronto.
 */
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.tenant ?? "");

  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [settings, setSettings] = useState<TenantSettings>(DEFAULT_SETTINGS);

  const reloadServices = useCallback(async () => {
    try {
      setServices(await apiRequest<Service[]>("/services"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace("/login");
    }
  }, [router]);

  const reloadHours = useCallback(async () => {
    try {
      setHours(await apiRequest<BusinessHours[]>("/hours"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace("/login");
    }
  }, [router]);

  const reloadSettings = useCallback(async () => {
    try {
      setSettings(await apiRequest<TenantSettings>("/settings"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
    void (async () => {
      try {
        const meRes = await apiRequest<MeResponse>("/auth/me");
        // O slug na URL deve corresponder ao tenant do token.
        if (meRes.tenant.slug !== slug) {
          router.replace(`/${meRes.tenant.slug}`);
          return;
        }
        setMe(meRes);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        return;
      }
      void reloadServices();
      void reloadHours();
      void reloadSettings();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authChecked || !me) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <span className="text-muted-foreground font-mono text-sm">Carregando…</span>
      </div>
    );
  }

  return (
    <TenantContext.Provider
      value={{ me, slug, services, hours, settings, reloadServices, reloadHours, reloadSettings }}
    >
      {children}
    </TenantContext.Provider>
  );
}
