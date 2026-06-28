"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { apiRequest, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";

function VerifyInner() {
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function confirm() {
    setStatus("loading");
    try {
      await apiRequest<{ message: string }>("/auth/verify-email", {
        method: "POST",
        body: { token },
      });
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  if (!token) {
    return (
      <>
        <Eyebrow className="mb-5">Link inválido</Eyebrow>
        <h1 className="font-display text-4xl tracking-wide">Link inválido</h1>
        <p className="text-muted-foreground mt-2">O link de verificação está incompleto.</p>
      </>
    );
  }

  if (status === "ok") {
    return (
      <>
        <Eyebrow className="mb-5">Tudo certo</Eyebrow>
        <h1 className="font-display text-4xl tracking-wide">Email confirmado</h1>
        <p className="text-muted-foreground mt-2">Seu email foi verificado com sucesso.</p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/login">Ir para o login</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Eyebrow className="mb-5">Verificação</Eyebrow>
      <h1 className="font-display text-4xl tracking-wide">Confirmar email</h1>
      <p className="text-muted-foreground mt-2">Clique abaixo para confirmar o seu endereço de email.</p>
      {status === "error" && <p className="text-destructive mt-3 text-sm">{message}</p>}
      <Button
        onClick={confirm}
        size="lg"
        className="mt-6 h-12 w-full rounded-full text-base"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Confirmando..." : "Confirmar email"}
      </Button>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell
      headline={
        <>
          Confirme
          <br />
          seu email.
        </>
      }
    >
      <Suspense fallback={null}>
        <VerifyInner />
      </Suspense>
    </AuthShell>
  );
}
