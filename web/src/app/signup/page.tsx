"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignupResponse = {
  user: { id: number; email: string; name?: string | null; role: string; tenantId: number };
  tenant: { id: number; name: string; slug: string };
  token: string;
};

/** Converte "Clínica Sorriso" em "clinica-sorriso". */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);

  // Enquanto o usuário não editar o slug manualmente, ele acompanha o nome.
  function onTenantNameChange(value: string) {
    setTenantName(value);
    if (!slugEdited) setTenantSlug(slugify(value));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiRequest<SignupResponse>("/auth/signup", {
        method: "POST",
        auth: false,
        body: { email, password, name: name || undefined, tenantName, tenantSlug },
      });

      setToken(res.token);
      toast.success(`Estabelecimento "${res.tenant.name}" criado!`);
      router.push(`/${res.tenant.slug}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro inesperado ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline={
        <>
          Comece
          <br />
          em minutos.
        </>
      }
    >
      <Eyebrow className="mb-5">Criar conta</Eyebrow>
      <h1 className="font-display text-4xl tracking-wide">Crie seu estabelecimento</h1>
      <p className="text-muted-foreground mt-2">Você será o responsável (OWNER) do novo espaço.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="tenantName">Nome do estabelecimento</Label>
          <Input
            id="tenantName"
            className="h-11"
            value={tenantName}
            onChange={(e) => onTenantNameChange(e.target.value)}
            placeholder="Ex: Clínica Sorriso"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenantSlug">Identificador (slug)</Label>
          <div className="border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex h-11 items-center rounded-md border bg-transparent pl-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
            <span className="text-muted-foreground select-none font-mono text-sm">/</span>
            <input
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => {
                setSlugEdited(true);
                setTenantSlug(slugify(e.target.value));
              }}
              placeholder="clinica-sorriso"
              className="placeholder:text-muted-foreground h-full w-full bg-transparent px-2 font-mono text-sm outline-none"
              required
            />
          </div>
          <p className="text-muted-foreground text-xs">É o endereço do seu painel. Só letras minúsculas, números e hífen.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Seu nome <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input
            id="name"
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como você se chama"
            autoComplete="name"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
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
              placeholder="mín. 8 caracteres"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="group h-12 w-full rounded-full text-base" disabled={loading}>
          {loading ? "Criando..." : "Criar conta grátis"}
          {!loading && <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
