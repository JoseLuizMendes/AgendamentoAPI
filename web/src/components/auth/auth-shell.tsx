import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";
import { Eyebrow } from "@/components/brand/eyebrow";
import { GridLines } from "@/components/brand/grid-lines";

const niches = [
  "Clínicas",
  "Salões",
  "Barbearias",
  "Estúdios",
  "Consultórios",
  "Spas",
  "Petshops",
  "Academias",
];

const points = [
  { k: "01", title: "Disponibilidade em tempo real", desc: "Horários livres calculados na hora, sem planilha." },
  { k: "02", title: "Zero duplo-agendamento", desc: "Trava de conflito que protege a sua agenda." },
  { k: "03", title: "Multi-tenant de verdade", desc: "Cada estabelecimento isolado no seu próprio espaço." },
];

/**
 * Layout de autenticação em duas colunas: painel de marca (escuro, com a
 * mesma linguagem do hero) à esquerda e o formulário à direita. No mobile o
 * painel some e fica só o formulário com a marca no topo.
 */
export function AuthShell({ headline, children }: { headline: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---- Painel de marca (desktop) ---- */}
      <aside className="bg-foreground text-background relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Hachura diagonal */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 40px, currentColor 40px, currentColor 41px)",
          }}
        />
        <GridLines tone="background" className="opacity-30" />

        <div className="relative z-10">
          <Wordmark size="md" />
        </div>

        <div className="relative z-10 max-w-lg">
          <Eyebrow tone="invert" className="mb-6">
            Plataforma de agendamento
          </Eyebrow>
          <h2 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-wide">{headline}</h2>

          <ul className="mt-10 space-y-6">
            {points.map((p) => (
              <li key={p.k} className="flex gap-4">
                <span className="font-display text-background/30 text-2xl leading-none">{p.k}</span>
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-background/60 text-sm">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <div className="text-background/40 mb-3 font-mono text-xs uppercase tracking-widest">
            Para qualquer nicho
          </div>
          <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="marquee flex w-max gap-3">
              {[...niches, ...niches].map((n, i) => (
                <span
                  key={i}
                  className="border-background/20 text-background/70 shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ---- Coluna do formulário ---- */}
      <main className="relative flex min-h-svh flex-col">
        <div className="flex items-center justify-between p-6 lg:px-10">
          <div className="lg:hidden">
            <Wordmark size="sm" />
          </div>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground hidden items-center gap-2 font-mono text-sm transition-colors lg:inline-flex"
          >
            <ArrowLeft className="size-4" /> Voltar ao site
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 lg:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <div className="text-muted-foreground p-6 text-center font-mono text-xs lg:px-10">
          © {new Date().getFullYear()} Agendamento
        </div>
      </main>
    </div>
  );
}
