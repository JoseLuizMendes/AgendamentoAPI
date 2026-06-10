"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { AnimatedSphere } from "./animated-sphere";

const words = ["negócio", "consultório", "salão", "estúdio", "escritório"];

const stats = [
  { value: "Tempo real", label: "disponibilidade de horários" },
  { value: "0 conflitos", label: "trava contra duplo-agendamento" },
  { value: "24/7", label: "auto-agendamento pelo cliente" },
  { value: "Multi-nicho", label: "saúde, beleza, serviços" },
];

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => setIsVisible(true), []);
  useEffect(() => {
    const interval = setInterval(() => setWordIndex((p) => (p + 1) % words.length), 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden">
      {/* Esfera animada */}
      <div className="pointer-events-none absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 opacity-40 lg:h-[800px] lg:w-[800px]">
        <AnimatedSphere />
      </div>

      {/* Linhas de grade */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="absolute h-px bg-foreground/10" style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }} />
        ))}
        {[...Array(12)].map((_, i) => (
          <div key={`v-${i}`} className="absolute w-px bg-foreground/10" style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 py-32 lg:px-12 lg:py-40">
        {/* Eyebrow */}
        <div className={`mb-8 transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <span className="inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
            <span className="h-px w-8 bg-foreground/30" />
            Plataforma de agendamento multi-tenant
          </span>
        </div>

        {/* Headline */}
        <div className="mb-12">
          <h1 className={`font-display text-[clamp(3rem,12vw,10rem)] leading-[0.9] tracking-wide transition-all duration-1000 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <span className="block">Gerencie a agenda</span>
            <span className="block">
              do seu{" "}
              <span className="relative inline-block">
                <span key={wordIndex} className="inline-flex">
                  {words[wordIndex].split("").map((char, i) => (
                    <span key={`${wordIndex}-${i}`} className="inline-block animate-char-in" style={{ animationDelay: `${i * 50}ms` }}>
                      {char}
                    </span>
                  ))}
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-foreground/10" />
              </span>
            </span>
          </h1>
        </div>

        {/* Descrição + CTAs */}
        <div className="grid items-end gap-12 lg:grid-cols-2 lg:gap-24">
          <p className={`max-w-xl text-xl leading-relaxed text-muted-foreground transition-all delay-200 duration-700 lg:text-2xl ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            Serviços, horários, disponibilidade em tempo real e agendamentos — tudo num só lugar.
            Pare de gerenciar agenda no caderno e comece a crescer.
          </p>

          <div className={`flex flex-col items-start gap-4 transition-all delay-300 duration-700 sm:flex-row ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <Button asChild size="lg" className="group h-14 rounded-full px-8 text-base">
              <Link href="/signup">
                Criar conta grátis
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-foreground/20 px-8 text-base">
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Marquee de estatísticas */}
      <div className={`absolute bottom-16 left-0 right-0 transition-all delay-500 duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="marquee flex gap-16 whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-16">
              {stats.map((stat) => (
                <div key={`${stat.value}-${i}`} className="flex items-baseline gap-4">
                  <span className="font-display text-4xl lg:text-5xl">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
