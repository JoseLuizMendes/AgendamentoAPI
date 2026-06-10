"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    number: "01",
    title: "Disponibilidade em tempo real",
    description: "Os horários livres são calculados na hora, respeitando seu funcionamento, intervalos e folgas. O cliente só vê o que realmente dá pra marcar.",
    visual: "slots",
  },
  {
    number: "02",
    title: "Serve qualquer nicho",
    description: "Saúde, beleza, serviços — você define seus serviços com preço e duração. A mesma base atende dentista, barbearia ou estúdio.",
    visual: "niche",
  },
  {
    number: "03",
    title: "Auto-agendamento pelo cliente",
    description: "Ative um link público e deixe o cliente marcar sozinho, 24/7 — ou mantenha o controle só com a sua equipe. Você decide.",
    visual: "booking",
  },
  {
    number: "04",
    title: "Sem duplo-agendamento",
    description: "Trava de concorrência no banco: dois clientes nunca ocupam o mesmo horário, mesmo marcando ao mesmo tempo.",
    visual: "lock",
  },
];

function SlotsVisual() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <rect x="30" y="20" width="140" height="120" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <g clipPath="url(#slotsClip)">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x="40" y={35 + i * 16} width="120" height="10" rx="2" fill="currentColor" opacity="0.15">
            <animate attributeName="opacity" values="0.15;0.8;0.15" dur="2s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
            <animate attributeName="width" values="20;120;20" dur="2s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </g>
      <clipPath id="slotsClip"><rect x="30" y="20" width="140" height="120" rx="4" /></clipPath>
    </svg>
  );
}

function NicheVisual() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <circle cx="100" cy="80" r="12" fill="currentColor">
        <animate attributeName="r" values="12;14;12" dur="2s" repeatCount="indefinite" />
      </circle>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = i * 60 * (Math.PI / 180);
        const r = 50;
        // Arredondado para evitar diferença de serialização de float entre servidor/cliente (hidratação)
        const cx = Number((100 + Math.cos(angle) * r).toFixed(2));
        const cy = Number((80 + Math.sin(angle) * r).toFixed(2));
        return (
          <g key={i}>
            <line x1="100" y1="80" x2={cx} y2={cy} stroke="currentColor" strokeWidth="1" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </line>
            <circle cx={cx} cy={cy} r="6" fill="none" stroke="currentColor" strokeWidth="2">
              <animate attributeName="r" values="6;8;6" dur="2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

function BookingVisual() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <g>
        <rect x="30" y="50" width="50" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="55" cy="35" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      </g>
      <g>
        <rect x="120" y="50" width="50" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="145" cy="35" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      </g>
      <line x1="80" y1="80" x2="120" y2="80" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.5s" repeatCount="indefinite" />
      </line>
      <circle r="4" fill="currentColor">
        <animateMotion dur="1.5s" repeatCount="indefinite"><mpath href="#bookPath" /></animateMotion>
      </circle>
      <path id="bookPath" d="M 80 80 L 120 80" fill="none" />
    </svg>
  );
}

function LockVisual() {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <path d="M 100 20 L 150 40 L 150 90 Q 150 130 100 145 Q 50 130 50 90 L 50 40 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 100 35 L 135 50 L 135 85 Q 135 115 100 128 Q 65 115 65 85 L 65 50 Z" fill="currentColor" opacity="0.1">
        <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
      </path>
      <rect x="85" y="70" width="30" height="25" rx="3" fill="currentColor" />
      <path d="M 90 70 L 90 60 Q 90 50 100 50 Q 110 50 110 60 L 110 70" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Visual({ type }: { type: string }) {
  if (type === "slots") return <SlotsVisual />;
  if (type === "niche") return <NicheVisual />;
  if (type === "booking") return <BookingVisual />;
  return <LockVisual />;
}

function FeatureRow({ feature, index }: { feature: (typeof features)[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setIsVisible(true), { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`group transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="flex flex-col gap-8 border-b border-foreground/10 py-12 lg:flex-row lg:gap-16 lg:py-20">
        <span className="shrink-0 font-mono text-sm text-muted-foreground">{feature.number}</span>
        <div className="grid flex-1 items-center gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 font-display text-3xl tracking-wide transition-transform duration-500 group-hover:translate-x-2 lg:text-4xl">
              {feature.title}
            </h3>
            <p className="text-lg leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="h-40 w-48 text-foreground">
              <Visual type={feature.visual} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Features() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setIsVisible(true), { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="recursos" ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <span className="mb-6 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
            <span className="h-px w-8 bg-foreground/30" />
            Recursos
          </span>
          <h2 className={`font-display text-4xl tracking-wide transition-all duration-700 lg:text-6xl ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            Tudo que sua agenda precisa.
            <br />
            <span className="text-muted-foreground">Nada que atrapalhe.</span>
          </h2>
        </div>
        <div>
          {features.map((f, i) => (
            <FeatureRow key={f.number} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
