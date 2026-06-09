#!/bin/sh
set -e

echo "==> Aplicando migrations (prisma migrate deploy)"
node_modules/.bin/prisma migrate deploy

echo "==> Iniciando servidor (node dist/server.js)"
exec node dist/server.js
