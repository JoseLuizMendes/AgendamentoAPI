"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest<void>("/auth/forgot-password", {
        method: "POST",
        body: { email, tenantSlug },
      });
      // Resposta é sempre 204 (anti-enumeração) → mostramos a mesma mensagem neutra.
      setSent(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline={
        <>
          Recuperar
          <br />
          acesso.
        </>
      }
    >
      <Eyebrow className="mb-5">Esqueci a senha</Eyebrow>
      <h1 className="font-display text-4xl tracking-wide">Redefinir senha</h1>

      {sent ? (
        <div className="mt-6 space-y-5">
          <p className="text-muted-foreground">
            Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique
            sua caixa de entrada (e o spam).
          </p>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/login">
              <ArrowLeft className="mr-1 size-4" /> Voltar ao login
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mt-2">Enviaremos um link para o seu e-mail.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Estabelecimento</Label>
              <Input
                id="tenantSlug"
                className="h-11"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="ex: minha-clinica"
                autoComplete="organization"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="email"
                required
              />
            </div>

            <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>

          <p className="text-muted-foreground mt-8 text-center text-sm">
            Lembrou a senha?{" "}
            <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
