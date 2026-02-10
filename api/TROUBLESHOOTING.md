# 🔧 Troubleshooting - Docs não aparecem na Vercel

## 🧪 Como diagnosticar o problema

Após fazer deploy, teste estas URLs na ordem:

### 1. Health Check (deve retornar 200)
```bash
curl https://seu-app.vercel.app/health/live
```
**Esperado:** `{"status":"ok"}`

### 2. Rotas registradas (deve listar todas as rotas)
```bash
curl https://seu-app.vercel.app/debug/routes
```
**Esperado:** Lista com `/docs`, `/documentation/*`, etc.

### 3. Acessar documentação
```bash
curl -I https://seu-app.vercel.app/docs
```
**Esperado:** Status 200 com HTML do Swagger UI

### 4. Verificar logs da Vercel
1. Acesse o dashboard da Vercel
2. Vá em "Deployments" > Último deploy > "Functions"
3. Clique em `api/index.js`
4. Procure por:
   - `✓ Fastify app initialized` (se aparecer, o app iniciou)
   - `Registering Swagger plugin...` (se aparecer, o swagger está sendo registrado)
   - `✓ Swagger UI registered at /docs` (se aparecer, o swagger completou)

---

## 🐛 Possíveis problemas e soluções

### Problema 1: 404 em /docs
**Sintoma:** GET /docs retorna 404

**Possível causa:** Swagger UI não está registrando

**Solução:**
1. Verifique se `ENABLE_SWAGGER=true` nas env vars da Vercel
   - ⚠️ **ATENÇÃO:** A partir desta versão, `ENABLE_SWAGGER` não é mais necessário!
   - O Swagger sempre está habilitado
2. Se os logs não mostram "✓ Swagger UI registered at /docs", há erro no plugin

### Problema 2: 500 Internal Server Error
**Sintoma:** Erro ao acessar qualquer rota

**Possível causa:** App não inicializou ou falta env var

**Solução:**
1. Verifique `DATABASE_URL` na Vercel
2. Verifique logs: procure por "Failed to initialize app"

### Problema 3: 401 ao acessar /docs
**Sintoma:** Requires authentication

**Possível causa:** Auth plugin não está liberando /docs

**Solução:**
1. Verifique os logs: deve aparecer que o path foi detectado
2. O código atual já libera `/docs`, `/docs/*` e `/documentation/*`

### Problema 4: Assets do Swagger não carregam (CSS/JS)
**Sintoma:** Página branca ou sem estilo

**Possível causa:** CSP bloqueando assets ou paths incorretos

**Solução:**
1. Verifique no console do browser se há erros de CSP
2. Os assets são servidos em `/documentation/static/*`
3. Se necessário, adicione `staticCSP: false` no swaggerUi config

---

## 🔍 Checklist de Environment Variables na Vercel

Variáveis **obrigatórias**:
- ✅ `DATABASE_URL` (PostgreSQL connection string)
- ✅ `API_KEY` (mínimo 16 caracteres)

Variáveis opcionais (já têm defaults):
- `NODE_ENV=production` (obrigatório para enforce da API key)
- `API_KEY_ENFORCE=true` (default: true em production)
- `PUBLIC_HEALTH=true` (default: true)
- ~~`ENABLE_SWAGGER=true`~~ (não é mais necessário!)

---

## 🚀 Após resolver

Quando confirmar que `/docs` funciona em produção:

1. **Remover rota de debug:**
   - Apague `/debug/routes` em `src/app.ts`
   - Remova a liberação de `isDebug` em `src/plugins/auth.ts`

2. **Remover este arquivo:**
   ```bash
   git rm api/TROUBLESHOOTING.md
   ```

---

## 📞 Se nada funcionar

Possível incompatibilidade `@fastify/swagger-ui` + Vercel Serverless.

**Alternativa:** Usar docs estático (Swagger UI via CDN):
1. Gerar `openapi.json` e servir estaticamente
2. HTML estático com Swagger UI apontando para o JSON
3. Desabilitar `@fastify/swagger-ui`
