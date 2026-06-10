"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="relative overflow-hidden border-t border-foreground/10 py-32 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-6 text-center lg:px-12">
        <h2 className="mx-auto max-w-4xl font-display text-[clamp(2.5rem,8vw,6rem)] leading-[0.95] tracking-wide">
          Sua agenda organizada hoje.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:text-xl">
          Crie sua conta grátis em segundos. Sem cartão de crédito.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="group h-14 rounded-full px-8 text-base">
            <Link href="/signup">
              Criar conta grátis
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-foreground/20 px-8 text-base">
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
