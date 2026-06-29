# Deploy — Docker + VPS + Neon + CI/CD

Arquitetura de produção:

```
GitHub (push main) ─> Actions: CI (testes) ─> Deploy (build imagem ─> GHCR ─> SSH na VPS)

VPS (Ubuntu + Docker):
  [Caddy :80/:443] ──> [api :3000 (Fastify)] ──> Neon (Postgres gerenciado)
                            └─> [redis] (pronto p/ worker futuro)
```

- **Banco**: Neon. Use uma **branch separada** para testes (CI/local) e a branch principal para produção.
- **Deploy**: automático por push na `main` (após o CI passar).

---

## 1. Pré-requisitos (uma vez)

### 1.1 Neon
- **Produção** (obrigatório): anote, da branch principal —
  - `DATABASE_URL` (connection string — pode ser a *pooled*)
  - `DIRECT_DATABASE_URL` (a *Direct connection*, sem pooler — usada nas migrations)
  - Essas vão no **`.env` da VPS** (passo 1.4).
- **Branch `test`** (opcional): **não é usada pela CI** — a CI sobe um Postgres descartável
  no próprio runner. A branch `test` serve apenas se você quiser rodar os testes/manuais
  contra um Neon real:
  ```bash
  DATABASE_URL="<pooled da branch test>?schema=public" \
    DIRECT_DATABASE_URL="<direct da branch test>" \
    JWT_SECRET="qualquer-coisa-com-32-mais-caracteres" \
    pnpm test:integration
  ```
  > ⚠️ Os testes apagam todas as tabelas (`deleteMany`) — aponte **só** para a branch `test`,
  > nunca para produção.

### 1.2 VPS (ex.: Hetzner, DigitalOcean, Contabo — Ubuntu 22.04+)
```bash
# Instalar Docker + plugin compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # relogar depois

# Estrutura do app
mkdir -p ~/agendamento && cd ~/agendamento
# Copie para cá: docker-compose.yml, Caddyfile e crie o .env (ver passo 1.4)
```

### 1.3 DNS
Aponte um subdomínio (ex.: `api.seudominio.com`) para o IP da VPS (registro A).

### 1.4 `.env` na VPS
Crie `~/agendamento/.env` a partir de [.env.example](.env.example) com os valores reais de
produção (DATABASE_URL/DIRECT_DATABASE_URL da Neon, `JWT_SECRET` forte, `DOMAIN`, `CORS_ORIGIN`,
`API_IMAGE=ghcr.io/<owner>/<repo>:latest`).

Gerar um JWT_SECRET forte:
```bash
openssl rand -base64 48
```

### 1.5 GitHub Secrets (repo → Settings → Secrets and variables → Actions)
- `VPS_HOST` — IP/host da VPS
- `VPS_USER` — usuário SSH
- `VPS_SSH_KEY` — chave privada SSH (par com a pública instalada na VPS)

> A imagem é publicada no **GHCR** usando o `GITHUB_TOKEN` automático (não precisa de secret).
> Garanta que o pacote GHCR seja acessível pela VPS (público, ou `docker login ghcr.io` na VPS).

---

## 2. Primeiro deploy

1. Faça o push na `main`. O workflow **CI** roda typecheck + testes (Postgres efêmero).
2. Ao passar, o **Deploy** builda a imagem, publica no GHCR e faz `docker compose pull && up -d` na VPS.
3. O `docker-entrypoint.sh` aplica as migrations (`prisma migrate deploy`) antes de subir o servidor.
4. Verifique:
   ```bash
   curl https://api.seudominio.com/health/live      # {"status":"ok"}
   # Swagger: https://api.seudominio.com/documentation
   ```

Para subir manualmente na VPS (sem esperar o CD):
```bash
cd ~/agendamento && docker compose pull && docker compose up -d
```

---

## 3. Hardening (recomendado)

```bash
# Firewall: libere apenas SSH + HTTP + HTTPS
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable

# SSH só por chave (em /etc/ssh/sshd_config):
#   PasswordAuthentication no
#   PermitRootLogin no
sudo systemctl restart ssh

# (opcional) fail2ban contra brute-force de SSH
sudo apt-get install -y fail2ban
```

- `NODE_ENV=production` (ativa cookies `secure`; só funciona atrás do HTTPS do Caddy).
- `CORS_ORIGIN` restrito ao domínio do front.
- `JWT_SECRET` forte e **único por ambiente** (o app recusa subir em produção com segredo < 32 chars).
- A API não expõe porta ao host — só o Caddy (80/443) a alcança pela rede interna.

---

## 4. Testes locais (sem tocar no Neon)

```bash
# Sobe Postgres + Redis locais
docker compose -f docker-compose.dev.yml up -d

# Roda a suíte de integração contra o Postgres local
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/agendamento?schema=public" \
  JWT_SECRET="dev-secret-com-32-mais-caracteres-aqui-ok" \
  pnpm test:integration
```

---

## 5. Operação

```bash
docker compose logs -f api          # logs da API
docker compose ps                   # status/health dos serviços
docker compose restart api          # reinicia a API
docker compose pull && docker compose up -d   # atualiza para a última imagem
```

---

## 6. Backup & Rollback de migrations

O `docker-entrypoint.sh` roda `prisma migrate deploy` antes de subir o servidor. Para uma migração
nunca deixar o banco num estado ruim sem volta:

### Antes do deploy (backup)
- **Neon (recomendado):** crie um **branch/snapshot** da branch de produção antes do deploy. O
  branch é instantâneo e serve como ponto de restauração:
  - Console Neon → Branches → "Create branch" a partir de `production` (ou snapshot/Point-in-Time).
- **Alternativa (dump):** `pg_dump "$DIRECT_DATABASE_URL" > backup-$(date +%F).sql` numa máquina com
  acesso ao banco.

### Se a migração falhar no deploy
1. O contêiner da API **não sobe** (o entrypoint aborta no `migrate deploy` com `set -e`); o Caddy
   segue servindo a versão anterior se ela ainda estiver no ar (`restart: unless-stopped`).
2. Diagnóstico: `docker compose logs api` → ver o erro do `migrate deploy`.
3. **Migração parcial/`failed`:** marcar como revertida e restaurar:
   ```bash
   # Dentro do container/host com o CLI do Prisma e DIRECT_DATABASE_URL:
   npx prisma migrate resolve --rolled-back <nome_da_migration>
   ```
   e **restaurar o branch/snapshot Neon** criado no passo de backup (ou `psql < backup-*.sql`).
4. Repinar a imagem na tag anterior e subir de novo:
   ```bash
   # No .env da VPS, fixe API_IMAGE/WEB_IMAGE na tag :sha da versão estável anterior, então:
   docker compose pull && docker compose up -d
   ```

### Boas práticas
- **Migrations aditivas** (colunas com default; ver `prisma/CLAUDE.md`) raramente exigem rollback.
- Mudanças destrutivas (drop de coluna) em **duas fases**: deploy 1 para de usar a coluna; deploy 2
  a remove — assim o rollback do deploy 2 não perde dados.
- Imagens são tagueadas por `:sha` (ver `deploy.yml`) — sempre há uma tag estável para voltar.

---

## 7. Observabilidade (Sentry) & Uptime externo

### Sentry (erros + tracing) — spec 005
- **Desligado por padrão**: sem DSN, a captura é no-op (dev/local não envia nada).
- **API** (`.env` da VPS): `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`, `SENTRY_RELEASE=<sha>`
  (use o SHA da imagem em deploy), `SENTRY_TRACES_SAMPLE_RATE=0.1`.
- **Web** (build-time, no CI): repo **Variables** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`,
  `SENTRY_PROJECT`; repo **Secret** `SENTRY_AUTH_TOKEN` (opcional — habilita upload de sourcemaps p/
  stack trace legível; sem ele, o build segue). `NEXT_PUBLIC_APP_VERSION` já recebe o `github.sha`.
- Os eventos passam por **scrub** (`beforeSend`) + `sendDefaultPii:false` — cookie/Authorization/senha
  nunca saem. Falha de envio é best-effort (não derruba a app).

### Uptime externo (rede de segurança quando a VPS inteira cai)
A captura interna do Sentry não reporta "o host inteiro caiu". Configure um monitor **externo**
gratuito (ex.: **UptimeRobot**, **Better Stack**) com checagem HTTP a cada 1–5 min:
- `https://api.<dominio>/health/live` → espera `200 {"status":"ok"}`.
- `https://app.<dominio>/` → espera `200`.
- Notificação por email/Telegram/Slack quando cair. Os health checks distinguem "host no ar mas app
  degradada" (5xx/timeout no `/health/live`) de "tudo fora" (sem resposta).
