"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

type MeResponse = { tenant: { slug: string } };

/**
 * Rota legada: redireciona para o workspace da tenant (/{slug}).
 * Sessão via cookie httpOnly — se /auth/me falhar (401 ou sem cookie), vai para o login.
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    apiRequest<MeResponse>("/auth/me")
      .then((me) => router.replace(`/${me.tenant.slug}`))
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      Redirecionando…
    </div>
  );
}
