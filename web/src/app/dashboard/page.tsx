"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

type MeResponse = { tenant: { slug: string } };

/**
 * Rota legada: redireciona para o workspace da tenant (/{slug}).
 * Fetch via React Query (canon — sem useEffect de fetch); a navegação (side-effect) fica no efeito.
 * Sessão via cookie httpOnly — se /auth/me falhar (401 ou sem cookie), vai para o login.
 */
export default function DashboardRedirect() {
  const router = useRouter();
  const { data, isError } = useQuery({
    queryKey: ["auth-me", "dashboard-redirect"],
    queryFn: () => apiRequest<MeResponse>("/auth/me"),
    retry: false,
  });

  useEffect(() => {
    if (data) router.replace(`/${data.tenant.slug}`);
    else if (isError) router.replace("/login");
  }, [data, isError, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
      Redirecionando…
    </div>
  );
}
