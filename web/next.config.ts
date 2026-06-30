import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Headers de segurança aplicados a todas as respostas (confirmados via doc atual do Next 16).
const securityHeaders = [
  // Força HTTPS por 2 anos (inclui subdomínios). Só tem efeito sob HTTPS (Caddy em prod).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Anti-clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Sem sniffing de MIME.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Vaza o mínimo de referer cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desliga APIs sensíveis do navegador que o app não usa.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

// `output: standalone` (+ tracingRoot) é para deploy em CONTÊINER (Docker na VPS): gera
// `.next/standalone` com server.js mínimo (ver web/Dockerfile). Na **Vercel** isso QUEBRA o build
// (ela usa o próprio output/adapter), então essas opções só valem FORA da Vercel. Detecção via a
// env `VERCEL` (que a Vercel injeta no build). Assim os dois alvos funcionam sem migração agora.
const isVercel = Boolean(process.env.VERCEL);
const containerOutput: NextConfig = isVercel
  ? {}
  : { output: "standalone", outputFileTracingRoot: import.meta.dirname };

const nextConfig: NextConfig = {
  ...containerOutput,
  // Não revelar a tecnologia no header `X-Powered-By`.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Proxy reverso opcional para a API externa (ex.: API no Render, web no Vercel). Com isto o
  // navegador só fala com o domínio do web → o cookie de sessão fica **first-party** (funciona em
  // Safari/iPhone, sem bloqueio de cookie de terceiros e sem precisar de domínio próprio pago).
  // Habilita setando API_PROXY_TARGET (ex.: https://agendamento-api.onrender.com) no host do web e
  // apontando NEXT_PUBLIC_API_URL para "/be". Sem a env, não há proxy (dev local chama a API direto).
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    if (!target) return [];
    return [{ source: "/be/:path*", destination: `${target.replace(/\/$/, "")}/:path*` }];
  },
};

// Envolve o config com o Sentry (injeta a instrumentação; upload de sourcemaps só com
// SENTRY_AUTH_TOKEN no CI — sem o token, o build segue sem upload).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});
