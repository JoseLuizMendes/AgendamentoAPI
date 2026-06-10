import Link from "next/link";
import { CalendarClock } from "lucide-react";

const cols = [
  {
    title: "Produto",
    links: [
      { label: "Recursos", href: "#recursos" },
      { label: "Como funciona", href: "#como-funciona" },
      { label: "Preços", href: "#precos" },
    ],
  },
  {
    title: "Conta",
    links: [
      { label: "Entrar", href: "/login" },
      { label: "Criar conta", href: "/signup" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-foreground/10 py-16">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5" />
              <span className="font-display text-2xl leading-none">Agendamento</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Plataforma de agendamento multi-tenant para qualquer nicho.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-foreground/70 transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-foreground/10 pt-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Agendamento. Todos os direitos reservados.</span>
          <span className="font-mono text-xs">Feito para qualquer nicho.</span>
        </div>
      </div>
    </footer>
  );
}
