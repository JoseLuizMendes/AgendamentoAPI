"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
 * Gate de auth + carga de /auth/me + /services + /hours + /settings via React Query.
 * O token só existe no client → `enabled` parte de um init lazy (sem ler localStorage no
 * render), e o gate mostra um loader determinístico até `me` estar pronto (sem hydration
 * mismatch). Recarregar = invalidar a query (sem useEffect de fetch).
 */
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.tenant ?? "");
  const queryClient = useQueryClient();

  const [hasToken] = useState(() => typeof window !== "undefined" && Boolean(getToken()));

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiRequest<MeResponse>("/auth/me"),
    enabled: hasToken,
    retry: false,
  });
  const me = meQuery.data;
  const slugOk = me?.tenant.slug === slug;

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => apiRequest<Service[]>("/services"),
    enabled: slugOk,
  });
  const hoursQuery = useQuery({
    queryKey: ["hours"],
    queryFn: () => apiRequest<BusinessHours[]>("/hours"),
    enabled: slugOk,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiRequest<TenantSettings>("/settings"),
    enabled: slugOk,
  });

  // Redirects imperativos (navegação — não é fetch nem setState).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasToken) {
      router.replace("/login");
      return;
    }
    if (meQuery.isError && meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      router.replace("/login");
      return;
    }
    if (me && me.tenant.slug !== slug) router.replace(`/${me.tenant.slug}`);
  }, [hasToken, me, meQuery.isError, meQuery.error, slug, router]);

  const reloadServices = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["services"] }),
    [queryClient],
  );
  const reloadHours = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["hours"] }),
    [queryClient],
  );
  const reloadSettings = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
    [queryClient],
  );

  if (!me || me.tenant.slug !== slug) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <span className="text-muted-foreground font-mono text-sm">Carregando…</span>
      </div>
    );
  }

  return (
    <TenantContext.Provider
      value={{
        me,
        slug,
        services: servicesQuery.data ?? [],
        hours: hoursQuery.data ?? [],
        settings: settingsQuery.data ?? DEFAULT_SETTINGS,
        reloadServices,
        reloadHours,
        reloadSettings,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}
