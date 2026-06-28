"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginResponse = {
  user: { id: number; email: string; name?: string | null; role: string; tenantId: number };
  token: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password, tenantSlug },
      });

      toast.success("Bem-vindo de volta!");
      router.push(`/${tenantSlug}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro inesperado ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline={
        <>
          Bem-vindo
          <br />
          de volta.
        </>
      }
    >
      <Eyebrow className="mb-5">Entrar</Eyebrow>
      <h1 className="font-display text-4xl tracking-wide">Acesse seu painel</h1>
      <p className="text-muted-foreground mt-2">Gerencie a agenda do seu estabelecimento.</p>

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

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" className="group h-12 w-full rounded-full text-base" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
          {!loading && <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Primeiro acesso?{" "}
        <Link href="/signup" className="text-foreground font-medium underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
