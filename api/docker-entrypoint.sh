#!/bin/sh
set -e

echo "==> Aplicando migrations (prisma migrate deploy)"
node_modules/.bin/prisma migrate deploy

echo "==> Iniciando servidor (node --import ./dist/instrument.js dist/server.js)"
# --import garante que o Sentry/OTel instrumente antes de fastify/pg (ESM). No-op sem SENTRY_DSN.
exec node --import ./dist/instrument.js dist/server.js
