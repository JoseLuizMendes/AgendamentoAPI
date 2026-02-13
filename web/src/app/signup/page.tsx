"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";

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
  const [raw, setRaw] = useState<string | null>(null);

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
      setRaw(JSON.stringify(res, null, 2));
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Criar credenciais (signup)</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Cria um novo tenant e um usuário OWNER. O JWT retornado fica salvo no navegador.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input className="mt-1 w-full rounded border p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium">Senha</label>
          <input
            type="password"
            className="mt-1 w-full rounded border p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Nome (opcional)</label>
          <input className="mt-1 w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium">Tenant Name</label>
          <input
            className="mt-1 w-full rounded border p-2"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Tenant Slug</label>
          <input
            className="mt-1 w-full rounded border p-2"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="ex: minha-barbearia"
          />
          <p className="mt-1 text-xs text-zinc-600">A API exige letras minúsculas, números e hífen.</p>
        </div>

        {error ? <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Criando..." : "Criar"}
        </button>
      </form>

      <div className="mt-6 flex gap-4 text-sm">
        <Link className="underline" href="/login">
          Já tenho tenant → login
        </Link>
        <Link className="underline" href="/dashboard">
          Ir pro dashboard
        </Link>
      </div>

      {raw ? (
        <pre className="mt-6 overflow-auto rounded border bg-zinc-50 p-3 text-xs">{raw}</pre>
      ) : null}
    </div>
  );
}
