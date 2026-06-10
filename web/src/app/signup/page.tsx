"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import { AlertCircle, CalendarClock } from "lucide-react";

type SignupResponse = {
  user: { id: number; email: string; name?: string | null; role: string; tenantId: number };
  tenant: { id: number; name: string; slug: string };
  token: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest<SignupResponse>("/auth/signup", {
        method: "POST",
        auth: false,
        body: {
          email,
          password,
          name: name || undefined,
          tenantName,
          tenantSlug,
        },
      });

      setToken(res.token);
      router.push(`/${res.tenant.slug}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 flex items-center gap-2 text-foreground">
        <CalendarClock className="size-6" />
        <span className="font-display text-3xl leading-none">Agendamento</span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wide">Criar conta</CardTitle>
          <CardDescription>
            Cria um novo estabelecimento e o usuário responsável (OWNER).
          </CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nome do estabelecimento</Label>
              <Input
                id="tenantName"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Ex: Clínica Sorriso"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Slug (identificador)</Label>
              <Input
                id="tenantSlug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="ex: clinica-sorriso"
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífen.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Seu nome (opcional)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="mínimo 8 caracteres"
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>

          <CardFooter className="mt-6 flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
