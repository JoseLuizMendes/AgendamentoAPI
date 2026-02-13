import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">AgendamentoAPI — UI de teste (Next.js)</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Use estas telas para exercitar o fluxo completo: signup → login → criar service/hours/appointments com JWT.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link className="rounded border px-3 py-2" href="/signup">
          Signup
        </Link>
        <Link className="rounded border px-3 py-2" href="/login">
          Login
        </Link>
        <Link className="rounded bg-black px-3 py-2 text-white" href="/dashboard">
          Dashboard
        </Link>
      </div>

      <p className="mt-6 text-xs text-zinc-600">
        API base: <span className="font-mono">{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}</span>
      </p>
    </div>
  );
}
