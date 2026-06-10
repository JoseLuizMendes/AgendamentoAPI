"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Crie sua conta",
    description: "Cadastre seu estabelecimento em segundos e configure seus serviços, preços e horários de funcionamento.",
  },
  {
    number: "02",
    title: "Receba agendamentos",
    description: "Sua equipe marca pelo painel, ou você ativa o link público e deixa o cliente escolher um horário livre sozinho.",
  },
  {
    number: "03",
    title: "Acompanhe tudo",
    description: "Veja a agenda do dia, confirme presenças, marque concluídos e acompanhe seus dashboards num só lugar.",
  },
];

export function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setIsVisible(true), { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="como-funciona" ref={ref} className="relative border-t border-foreground/10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <span className="mb-6 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
            <span className="h-px w-8 bg-foreground/30" />
            Como funciona
          </span>
          <h2 className="font-display text-4xl tracking-wide lg:text-6xl">
            Do cadastro à agenda cheia
            <br />
            <span className="text-muted-foreground">em três passos.</span>
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="mb-6 font-mono text-sm text-muted-foreground">{step.number}</div>
              <div className="mb-4 h-px w-full bg-foreground/10" />
              <h3 className="mb-3 font-display text-2xl tracking-wide">{step.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
