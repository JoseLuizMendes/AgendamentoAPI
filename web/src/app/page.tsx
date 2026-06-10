import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CalendarClock, ArrowRight } from "lucide-react";

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  return (
    <div className="relative flex min-h-svh flex-col bg-muted/20">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5" />
          <span className="font-display text-2xl leading-none">Agendamento</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Plataforma de agendamento
        </span>
        <h1 className="mt-4 font-display text-6xl leading-[0.95] tracking-wide sm:text-7xl">
          Gerencie a agenda do seu negócio
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Serviços, horários, disponibilidade em tempo real e agendamentos — multi-tenant, para
          qualquer nicho.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Criar conta <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          API base: <span className="font-mono">{apiUrl}</span>
        </p>
      </main>
    </div>
  );
}
