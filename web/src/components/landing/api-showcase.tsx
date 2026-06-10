"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";

const examples = [
  {
    label: "Disponibilidade",
    code: `GET /availability?serviceId=1&date=2026-06-15

[
  { "start": "2026-06-15T12:00:00Z" },
  { "start": "2026-06-15T12:30:00Z" },
  { "start": "2026-06-15T13:30:00Z" }
]`,
  },
  {
    label: "Agendar",
    code: `POST /appointments

{
  "customerName": "Maria",
  "customerPhone": "11999999999",
  "serviceId": 1,
  "startTime": "2026-06-15T12:00:00Z"
}`,
  },
  {
    label: "Resposta",
    code: `201 Created

{
  "id": 42,
  "status": "SCHEDULED",
  "startTime": "2026-06-15T12:00:00Z",
  "endTime": "2026-06-15T12:30:00Z"
}`,
  },
];

const benefits = [
  { title: "OpenAPI / Swagger", description: "Documentação gerada automaticamente." },
  { title: "Multi-tenant", description: "Cada estabelecimento isolado por padrão." },
  { title: "JWT", description: "Autenticação segura por token." },
  { title: "Webhooks (em breve)", description: "Notifique seus sistemas a cada evento." },
];

export function ApiShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(examples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setIsVisible(true), { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-foreground/10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid items-start gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Conteúdo */}
          <div className={`transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
              <span className="h-px w-8 bg-foreground/30" />
              Para integrar
            </span>
            <h2 className="mb-8 font-display text-4xl tracking-wide lg:text-6xl">
              Tem API.
              <br />
              <span className="text-muted-foreground">Conecte o que quiser.</span>
            </h2>
            <p className="mb-12 text-xl leading-relaxed text-muted-foreground">
              Tudo que o painel faz, a API também faz. Construída em Fastify, documentada via
              Swagger e pronta pra plugar no seu site, app ou automação.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {benefits.map((b, i) => (
                <div
                  key={b.title}
                  className={`transition-all duration-500 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                  style={{ transitionDelay: `${i * 50 + 200}ms` }}
                >
                  <h3 className="mb-1 font-medium">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco de código */}
          <div className={`transition-all delay-200 duration-700 lg:sticky lg:top-32 ${isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}`}>
            <div className="overflow-hidden rounded-lg border border-foreground/10">
              <div className="flex items-center border-b border-foreground/10">
                {examples.map((ex, idx) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`relative px-6 py-4 font-mono text-sm transition-colors ${activeTab === idx ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {ex.label}
                    {activeTab === idx && <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
                  </button>
                ))}
                <div className="flex-1" />
                <button type="button" onClick={handleCopy} className="px-4 py-4 text-muted-foreground transition-colors hover:text-foreground" aria-label="Copiar">
                  {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </button>
              </div>
              <div className="min-h-[240px] bg-foreground/[0.02] p-8 font-mono text-sm">
                <pre className="text-foreground/80">
                  {examples[activeTab].code.split("\n").map((line, li) => (
                    <div key={`${activeTab}-${li}`} className="reveal-line leading-loose" style={{ animationDelay: `${li * 70}ms` }}>
                      <span className="inline-flex flex-wrap">
                        {line.split("").map((ch, ci) => (
                          <span key={`${activeTab}-${li}-${ci}`} className="reveal-char" style={{ animationDelay: `${li * 70 + ci * 12}ms` }}>
                            {ch === " " ? " " : ch}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
