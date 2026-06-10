"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";

type MeResponse = { tenant: { slug: string } };

/**
 * Rota legada: redireciona para o workspace da tenant (/{slug}).
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    apiRequest<MeResponse>("/auth/me")
      .then((me) => router.replace(`/${me.tenant.slug}`))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else router.replace("/login");
      });
  }, [router]);

  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      Redirecionando…
    </div>
  );
}
