import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  // Empacotamento autônomo para deploy em contêiner (Docker na VPS): gera `.next/standalone`
  // com apenas os arquivos necessários + um `server.js` mínimo. Ver web/Dockerfile.
  output: "standalone",
  // Há um pnpm-lock.yaml na raiz do repo; sem isto o Next inferiria o root do monorepo lá em
  // cima e aninharia o standalone em `standalone/web/`. Fixar a raiz de tracing nesta pasta
  // mantém o pacote plano (`standalone/server.js`).
  outputFileTracingRoot: import.meta.dirname,
  // Não revelar a tecnologia no header `X-Powered-By`.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
