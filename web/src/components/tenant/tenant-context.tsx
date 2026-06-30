"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest, ApiError } from "@/lib/api";
import type { BusinessDateOverride, BusinessHours, MeResponse, Service, TenantSettings } from "./types";

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
  overrides: BusinessDateOverride[];
  reloadServices: () => Promise<void>;
  reloadHours: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  reloadOverrides: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant precisa estar dentro de <TenantProvider>");
  return ctx;
}

/**
 * Gate de auth + carga de /auth/me + /services + /hours + /settings via React Query.
 * A sessão vive num cookie httpOnly (o JS não lê o token) → o gate sempre consulta
 * `/auth/me`: 401 redireciona para /login. Mostra um loader determinístico até `me`
 * estar pronto (sem hydration mismatch). Recarregar = invalidar a query (sem useEffect de fetch).
 */
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.tenant ?? "");
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiRequest<MeResponse>("/auth/me"),
    retry: false,
  });
  const me = meQuery.data;
  const slugOk = me?.tenant.slug === slug;

  // Checa se o slug é um tenant real (endpoint público) — só quando não é o seu, para distinguir
  // "slug inexistente" (→ 404) de "não logado" (→ login) e "outro tenant" (→ seu painel).
  const needsExistenceCheck = slug.length > 0 && !slugOk;
  const tenantExistsQuery = useQuery({
    queryKey: ["tenant-exists", slug],
    queryFn: async (): Promise<boolean> => {
      try {
        await apiRequest(`/public/${encodeURIComponent(slug)}/services`);
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return false;
        return true; // erro de rede/servidor → não força 404; segue o fluxo normal
      }
    },
    enabled: needsExistenceCheck,
    retry: false,
  });
  const tenantMissing = needsExistenceCheck && tenantExistsQuery.data === false;

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
  const overridesQuery = useQuery({
    queryKey: ["overrides"],
    queryFn: () => apiRequest<BusinessDateOverride[]>("/overrides"),
    enabled: slugOk,
  });

  // Redirects imperativos (navegação — não é fetch nem setState).
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Slug inexistente vira 404 (no render) — não redireciona; aguarda a checagem confirmar
    // que o tenant existe antes de mandar para login/painel.
    if (needsExistenceCheck && tenantExistsQuery.data !== true) return;
    // Sem cookie válido, /auth/me responde 401 → manda para o login.
    if (meQuery.isError && meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      router.replace("/login");
      return;
    }
    if (me && me.tenant.slug !== slug) router.replace(`/${me.tenant.slug}`);
  }, [me, meQuery.isError, meQuery.error, slug, router, needsExistenceCheck, tenantExistsQuery.data]);

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
  const reloadOverrides = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["overrides"] }),
    [queryClient],
  );

  // Slug não corresponde a nenhum tenant real → 404 (em vez de login/redirect ao próprio painel).
  if (tenantMissing) {
    notFound();
  }

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
        overrides: overridesQuery.data ?? [],
        reloadServices,
        reloadHours,
        reloadSettings,
        reloadOverrides,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}
