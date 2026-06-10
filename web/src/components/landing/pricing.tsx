"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    description: "Para começar e organizar a agenda.",
    features: ["1 estabelecimento", "Serviços e horários", "Agendamentos ilimitados", "Disponibilidade em tempo real"],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 49",
    period: "/mês",
    description: "Para quem quer crescer e automatizar.",
    features: ["Tudo do Grátis", "Auto-agendamento público", "Equipe (vários usuários)", "Lembretes (em breve)", "Dashboards"],
    cta: "Assinar Pro",
    highlighted: true,
  },
  {
    name: "Escala",
    price: "Sob consulta",
    period: "",
    description: "Para redes e operações maiores.",
    features: ["Tudo do Pro", "Vários profissionais", "Integrações via API", "Suporte prioritário"],
    cta: "Falar com a gente",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="precos" className="relative border-t border-foreground/10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 text-center">
          <span className="mb-6 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
            <span className="h-px w-8 bg-foreground/30" />
            Preços
          </span>
          <h2 className="font-display text-4xl tracking-wide lg:text-6xl">Simples e transparente</h2>
          <p className="mt-4 text-lg text-muted-foreground">Comece grátis. Faça upgrade quando quiser.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-8 ${plan.highlighted ? "border-foreground bg-foreground/[0.02] shadow-lg" : "border-foreground/10"}`}
            >
              <div className="mb-6">
                <h3 className="font-display text-2xl tracking-wide">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="font-display text-5xl tracking-wide">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant={plan.highlighted ? "default" : "outline"} className="h-12 w-full rounded-full">
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
