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
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password, tenantSlug },
      });

      setToken(res.token);
      router.push(`/${tenantSlug}`);
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
          <CardTitle className="font-display text-2xl tracking-wide">Entrar</CardTitle>
          <CardDescription>Acesse o painel do seu estabelecimento.</CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Slug do estabelecimento</Label>
              <Input
                id="tenantSlug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="ex: minha-clinica"
                autoComplete="organization"
              />
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
                autoComplete="current-password"
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
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Primeiro acesso?{" "}
              <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
