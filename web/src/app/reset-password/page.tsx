"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { apiRequest, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: { token, password },
      });
      toast.success("Senha redefinida! Faça login com a nova senha.");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <Eyebrow className="mb-5">Link inválido</Eyebrow>
        <h1 className="font-display text-4xl tracking-wide">Link inválido</h1>
        <p className="text-muted-foreground mt-2">
          O link de redefinição está incompleto ou expirou. Solicite um novo.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/forgot-password">Pedir novo link</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Eyebrow className="mb-5">Nova senha</Eyebrow>
      <h1 className="font-display text-4xl tracking-wide">Defina uma nova senha</h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <PasswordInput
            id="password"
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <PasswordInput
            id="confirm"
            className="h-11"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base" disabled={loading}>
          {loading ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      headline={
        <>
          Nova
          <br />
          senha.
        </>
      }
    >
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
