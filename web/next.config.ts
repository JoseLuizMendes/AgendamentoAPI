import type { NextConfig } from "next";

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
};

export default nextConfig;
