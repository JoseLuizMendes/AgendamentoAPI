# syntax=docker/dockerfile:1

# ---- Base com pnpm via corepack ----
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- Build: instala deps, gera client Prisma e compila TS ----
FROM base AS build
COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: evita rodar o postinstall (prisma generate) antes do schema existir
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
# `pnpm build` = prisma generate && tsc -p tsconfig.json
RUN pnpm build

# ---- Runtime: imagem enxuta, usuário não-root ----
FROM base AS runtime
ENV NODE_ENV=production
# node_modules inclui o CLI do Prisma (para `migrate deploy` no entrypoint) e o client gerado
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Remove eventual CRLF (Windows) e torna executável
RUN sed -i 's/\r$//' docker-entrypoint.sh \
    && chmod +x docker-entrypoint.sh \
    && useradd --create-home --shell /bin/sh app \
    && chown -R app:app /app
USER app
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
