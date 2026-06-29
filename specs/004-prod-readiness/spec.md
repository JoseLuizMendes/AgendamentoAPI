# Feature Specification: Prod-Readiness & Hardening Final

**Feature Branch**: `feat/horarios-controle-total`

**Created**: 2026-06-29

**Status**: Draft (derivado da auditoria de prod-readiness de 2026-06-29)

**Input**: User description: "Prod-readiness & hardening final para colocar API + Web inteiros numa
VPS (Docker + Caddy). Atualizar dependências com CVE, fechar superfície de autenticação, dockerizar o
web, pôr o web no CI, higienizar repositório/infra e fazer o polimento final de segurança.
Observabilidade fica no spec 005. Decisões do dev: projeto inteiro na VPS (sem Vercel); sem Redis
agora; specs separados (004 hardening, 005 observabilidade)."

## Contexto

O produto está funcionalmente completo e seguro no essencial (specs 001–003: anti-brute-force,
cookie httpOnly, tokens de reset hasheados, Helmet/CORS/rate-limit, multi-tenancy). Uma auditoria de
prontidão para produção (2026-06-29) identificou um conjunto de **arestas** a fechar antes do go-live
numa VPS: dependências com CVE conhecido, detalhes de exposição da superfície de autenticação,
ausência do web no pipeline de CI/CD e na borda (Caddy), e higiene de repositório/infra. Esta feature
**não** muda o comportamento de produto para o usuário final; ela torna o sistema **seguro e operável
em produção**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zero vulnerabilidades conhecidas em dependências (Priority: P1)

Como responsável pelo produto, preciso garantir que nenhuma dependência em uso em produção tenha
vulnerabilidade conhecida de severidade alta ou crítica, em especial as do caminho de autenticação.

**Why this priority**: vulnerabilidade conhecida em lib de runtime (ex.: a biblioteca que verifica os
JWTs) é o risco mais direto e explorável; é o primeiro filtro de qualquer go-live.

**Independent Test**: rodar a varredura de vulnerabilidades de dependências (API e Web) e confirmar
zero advisories de severidade **crítica** em runtime e a remediação das **altas** de runtime; a suíte
de testes continua verde após as atualizações.

**Acceptance Scenarios**:

1. **Given** a API com a lib de verificação de JWT numa versão vulnerável, **When** as dependências são
   atualizadas, **Then** a varredura não reporta mais o advisory crítico e a autenticação segue
   funcionando (testes de auth verdes).
2. **Given** o Web numa versão do framework com CVEs de severidade alta, **When** é atualizado para a
   versão corrigida, **Then** a varredura não reporta mais esses CVEs e o build do Web passa.
3. **Given** as atualizações aplicadas, **When** a suíte completa (typecheck + unit + integração) roda,
   **Then** permanece 100% verde.

---

### User Story 2 - Aplicação inteira servida pela VPS com HTTPS (Priority: P1)

Como operador, quero servir **tanto a API quanto o Web** pela mesma VPS, cada um no seu domínio, com
HTTPS automático, sem depender de plataforma externa de hospedagem.

**Why this priority**: é o objetivo de deploy declarado pelo dev; sem o Web empacotado e roteado na
borda, não há produto acessível ao usuário final.

**Independent Test**: subir o ambiente de produção (compose) e acessar o domínio do Web por HTTPS e o
domínio da API por HTTPS; o Web carrega e consegue conversar com a API (login funciona ponta a ponta).

**Acceptance Scenarios**:

1. **Given** a stack de produção no ar, **When** acesso `https://app.<dominio>`, **Then** o Web carrega
   por HTTPS válido e estático/SSR funcionam.
2. **Given** o Web carregado, **When** faço login, **Then** a chamada chega à API em `https://api.<dominio>`,
   o cookie de sessão é aceito (CORS/credenciais corretos) e navego autenticado.
3. **Given** um push na branch principal, **When** o CI/CD roda, **Then** ele valida **e** constrói o
   Web (typecheck + lint + build + testes), além da API, antes de publicar.

---

### User Story 3 - Superfície de autenticação e de navegador endurecida (Priority: P2)

Como responsável pela segurança, quero reduzir a superfície de ataque da sessão e do navegador: o
token de sessão não deve trafegar onde o JavaScript possa lê-lo, a documentação interativa da API não
deve ficar exposta em produção, a janela de validade de uma sessão vazada deve ser curta, e o navegador
deve receber as proteções padrão (headers).

**Why this priority**: são endurecimentos de impacto direto na segurança, baratos e sem mudança de
produto; complementam as defesas já existentes (cookie httpOnly, lockout, rate-limit).

**Independent Test**: inspecionar a resposta de login (o token não aparece no corpo, só no cookie
httpOnly); acessar a documentação interativa em produção (indisponível ou protegida); inspecionar os
headers de resposta do Web (HSTS, anti-clickjacking, nosniff, referrer, permissions); confirmar que uma
rota protegida do workspace redireciona um visitante não autenticado já no servidor.

**Acceptance Scenarios**:

1. **Given** um login bem-sucedido, **When** inspeciono o corpo da resposta, **Then** o token de sessão
   **não** está presente no corpo — apenas no cookie httpOnly.
2. **Given** o ambiente de produção, **When** tento acessar a documentação interativa da API, **Then**
   ela está desabilitada ou exige autenticação.
3. **Given** uma sessão emitida, **When** o tempo configurado de validade (curto) expira, **Then** a
   sessão deixa de ser aceita e o usuário precisa autenticar de novo.
4. **Given** uma resposta do Web, **When** inspeciono os cabeçalhos, **Then** estão presentes os headers
   de segurança padrão (transporte estrito, anti-clickjacking, sem sniffing de tipo, política de
   referrer e de permissões) e o cabeçalho que revela a tecnologia está ausente.
5. **Given** um visitante não autenticado, **When** acessa uma rota do workspace, **Then** é
   redirecionado para o login **antes** de a página renderizar (gate no servidor), além da proteção já
   existente na API.

---

### User Story 4 - Repositório e operação de deploy confiáveis (Priority: P3)

Como mantenedor, quero o repositório e a infraestrutura coerentes com o canon e sem pegadinhas
operacionais: um único gerenciador de pacotes, sem serviços ociosos, exemplos de ambiente para
onboarding, e uma rede de proteção contra dependência vulnerável e contra migração que falha no deploy.

**Why this priority**: reduz risco operacional e de manutenção; não é bloqueador de segurança imediato,
mas evita incidentes e retrabalho recorrentes.

**Independent Test**: clonar o repositório do zero e seguir o exemplo de ambiente para subir local; o
projeto usa um único gerenciador de pacotes (sem lockfile concorrente); a infraestrutura de produção
não sobe serviços sem uso; o pipeline barra dependência crítica; existe procedimento documentado para
falha de migração.

**Acceptance Scenarios**:

1. **Given** o repositório, **When** listo os lockfiles, **Then** existe apenas o do gerenciador
   canônico (pnpm) — nenhum lockfile concorrente (npm).
2. **Given** a stack de produção, **When** subo os serviços, **Then** apenas os serviços efetivamente
   usados pelo código sobem (sem serviço provisionado e ocioso).
3. **Given** um novo desenvolvedor, **When** segue o arquivo de exemplo de ambiente, **Then** consegue
   configurar API e Web sem adivinhar variáveis.
4. **Given** uma dependência com vulnerabilidade crítica introduzida, **When** o CI roda, **Then** o
   pipeline falha (gate bloqueante para nível crítico).
5. **Given** uma migração que falha durante o deploy, **When** o operador consulta a documentação,
   **Then** há um procedimento claro de diagnóstico e rollback.

---

### User Story 5 - Polimento final de segurança e modernização (Priority: P3)

Como responsável pela qualidade, quero eliminar os resíduos de menor risco apontados na auditoria, para
fechar o projeto sem débito conhecido.

**Why this priority**: itens de baixo impacto/risco; valor incremental de higiene e consistência com o
canon, feitos por último.

**Independent Test**: revisar cada item residual da auditoria e confirmar que foi tratado ou
conscientemente registrado como backlog aceito.

**Acceptance Scenarios**:

1. **Given** a documentação interativa desabilitada em produção, **When** reviso a política de conteúdo
   de segurança da API, **Then** ela não precisa mais liberar fontes externas/inline antes necessárias
   só para aquela documentação.
2. **Given** a higiene de dados, **When** reviso as tabelas de tokens efêmeros (idempotência e
   verificação/reset), **Then** há uma estratégia de expiração/limpeza que evita crescimento
   indefinido.
3. **Given** o canon de data-fetching (sem busca em efeito de componente), **When** reviso a tela legada
   de dashboard, **Then** ela foi migrada para o padrão canônico ou removida.
4. **Given** o front, **When** reviso unidades de viewport, acessibilidade e animações, **Then** as
   modernizações apontadas (ex.: unidade de viewport dinâmica, foco visível, redução de movimento) estão
   aplicadas onde fazem sentido.

---

### Edge Cases

- **Atualização de dependência que quebra contrato:** uma atualização de segurança pode mudar
  comportamento; o gate é a suíte de testes verde — atualização que quebra teste não é promovida sem
  ajuste.
- **CVE sem correção disponível:** se uma dependência vulnerável ainda não tem versão corrigida, o item
  é registrado como risco aceito com justificativa, não bloqueia indefinidamente o go-live.
- **Encurtar a sessão x atrito do usuário:** sessão muito curta aumenta re-logins; o valor é
  configurável por ambiente e escolhido para equilibrar segurança e conforto (sem mecanismo de refresh
  nesta fase).
- **Gate de rota no servidor x sessão em cookie httpOnly:** o middleware do Web só verifica a presença/
  validade superficial do cookie para redirecionar; a autorização real continua na API (defense-in-depth,
  não substituição).
- **Remoção de serviço ocioso:** remover o serviço sem uso não pode quebrar quem dependa dele; confirma-se
  que o código não o referencia antes de remover, e registra-se a decisão para reintroduzir sob demanda.
- **CSRF com cookie de sessão:** mitigado por SameSite + CORS allowlist; a fase avalia se há rota de
  escrita sensível a CSRF que exija reforço adicional.

## Requirements *(mandatory)*

### Functional Requirements

**Dependências (US1)**

- **FR-001**: O sistema MUST atualizar a biblioteca de verificação de JWT (e o plugin que a inclui) para
  uma versão sem advisory de severidade crítica.
- **FR-002**: O sistema MUST atualizar o framework HTTP da API e seus plugins afetados para versões sem
  advisory de severidade alta em runtime.
- **FR-003**: O sistema MUST atualizar o framework do Web para a versão corrigida que elimina os CVEs de
  severidade alta conhecidos, além das demais dependências de build com advisory.
- **FR-004**: Após as atualizações, a suíte completa de testes (typecheck, unit, integração) MUST
  permanecer verde.

**Deploy na VPS (US2)**

- **FR-005**: O Web MUST ser empacotado para execução autônoma em contêiner e servido pela VPS.
- **FR-006**: A borda (proxy reverso) MUST rotear dois domínios distintos com HTTPS automático — um para
  o Web e outro para a API — sem expor portas internas ao host.
- **FR-007**: A configuração de origem cruzada da API MUST permitir o domínio do Web em produção, e o Web
  MUST apontar para o domínio público da API.
- **FR-008**: O pipeline de CI MUST validar e construir o Web (verificação de tipos, lint, build e
  testes) além da API, antes de publicar uma imagem de produção.

**Superfície de auth e navegador (US3)**

- **FR-009**: As respostas de autenticação (login e cadastro) MUST NOT incluir o token de sessão no
  corpo; a sessão é entregue exclusivamente via cookie httpOnly.
- **FR-010**: A documentação interativa da API MUST estar desabilitada ou protegida por autenticação em
  produção.
- **FR-011**: A validade da sessão MUST ser reduzida para uma janela curta e configurável por ambiente.
- **FR-012**: O Web MUST emitir os cabeçalhos de segurança padrão de navegador (transporte estrito,
  anti-clickjacking, sem sniffing de tipo, política de referrer e de permissões) e MUST NOT revelar o
  cabeçalho identificador da tecnologia.
- **FR-013**: As rotas autenticadas do workspace MUST ter um gate no servidor que redirecione visitantes
  sem sessão para o login, como defesa em profundidade adicional à API.
- **FR-014**: A fase MUST avaliar e, se necessário, reforçar a proteção contra CSRF nas rotas de escrita
  (ex.: política de cookie mais estrita ou token anti-CSRF).

**Repositório e operação (US4)**

- **FR-015**: O repositório MUST conter apenas o lockfile do gerenciador canônico (pnpm); lockfiles
  concorrentes MUST ser removidos.
- **FR-016**: A infraestrutura de produção MUST NOT subir serviços não referenciados pelo código; a
  decisão de reintroduzi-los sob demanda (fila/escala/revogação de sessão) MUST ser registrada.
- **FR-017**: O repositório MUST fornecer exemplos de ambiente para API e Web e um arquivo de exclusões
  na raiz, sem expor segredos reais.
- **FR-018**: O pipeline de CI MUST falhar quando houver vulnerabilidade de severidade crítica em
  dependências (após a remediação inicial).
- **FR-019**: O processo de deploy MUST documentar a estratégia de backup e de rollback para falhas de
  migração de banco.

**Polimento (US5)**

- **FR-020**: Com a documentação interativa fora de produção, a política de conteúdo de segurança da API
  MUST ser endurecida (remoção das liberações antes necessárias só para aquela documentação).
- **FR-021**: As tabelas de tokens efêmeros (idempotência e verificação/reset) MUST ter estratégia de
  expiração/limpeza que evite crescimento indefinido.
- **FR-022**: A tela legada de dashboard MUST ser migrada para o padrão canônico de data-fetching ou
  removida.
- **FR-023**: As modernizações de front apontadas (unidade de viewport dinâmica, foco visível, redução
  de movimento) MUST ser aplicadas onde agregarem valor.

### Key Entities *(include if feature involves data)*

- **Sessão de usuário**: representada por um cookie httpOnly assinado pela API; atributos relevantes
  nesta fase — janela de validade (curta) e ausência de exposição do token fora do cookie.
- **Token efêmero**: tokens de idempotência de agendamento e de verificação/reset de email; atributo
  relevante nesta fase — política de expiração/limpeza.
- **Ambiente de deploy**: domínios (Web e API), origem cruzada permitida, serviços de contêiner em
  execução e variáveis de ambiente exemplificadas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A varredura de vulnerabilidades de dependências reporta **zero** advisories de severidade
  crítica em runtime na API e no Web.
- **SC-002**: 100% dos CVEs de severidade alta conhecidos no framework do Web são eliminados pela
  atualização.
- **SC-003**: A suíte completa de testes permanece **100% verde** após todas as atualizações.
- **SC-004**: Tanto o Web quanto a API são acessíveis publicamente por HTTPS válido, cada um em seu
  domínio, servidos pela mesma VPS.
- **SC-005**: Um login concluído no Web em produção resulta em sessão válida (fluxo ponta a ponta
  funcional) **sem** que o token apareste no corpo de qualquer resposta.
- **SC-006**: A documentação interativa da API é inacessível sem autenticação em produção.
- **SC-007**: As respostas do Web apresentam os cinco cabeçalhos de segurança padrão e não expõem o
  cabeçalho identificador da tecnologia.
- **SC-008**: Um visitante não autenticado é redirecionado ao login ao tentar acessar uma rota do
  workspace, antes da renderização.
- **SC-009**: O CI valida e constrói o Web e a API e falha diante de vulnerabilidade crítica.
- **SC-010**: O repositório possui um único lockfile (pnpm) e exemplos de ambiente completos para API e
  Web.

## Assumptions

- **Hospedagem inteira na VPS** (sem Vercel) — decisão do dev; o Web é dockerizado e roteado pelo mesmo
  proxy reverso (Caddy) da API.
- **Sem Redis nesta fase** — decisão do dev; o serviço será removido da infraestrutura de produção e
  reintroduzido apenas quando houver fila/escala ou revogação instantânea de sessão. Em consequência, a
  redução de risco de sessão vazada é feita por **janela de validade curta**, não por denylist.
- **Provedor de email (Resend) e armazenamento de imagem (Cloudinary)** seguem como nas fases anteriores
  (variáveis de ambiente; sem mudança de provedor).
- **Banco gerenciado (Neon)** e fluxo de migrations por `migrate deploy` no deploy seguem como no spec de
  deploy existente; esta fase adiciona apenas a documentação de backup/rollback.
- **Observabilidade está fora de escopo** e será tratada no spec 005 (a escolha de ferramenta e a
  integração).
- O comportamento de produto para o usuário final **não muda**; esta feature é de prontidão para
  produção e segurança.
- As atualizações de bibliotecas seguem a verificação de documentação atual (Context7) antes de aplicar,
  conforme o canon do projeto.

## Out of Scope

- Observabilidade, alertas e telemetria (→ spec 005).
- WAF/anti-DDoS gerenciado na borda (ex.: Cloudflare) — configuração de infraestrutura externa; pode ser
  avaliado junto ao 005.
- Mecanismo de refresh token / sessões deslizantes e revogação instantânea por denylist (depende de
  Redis, fora desta fase).
- Resistência total à enumeração de usuário no login (trade-off já registrado no spec 003).
- Escala horizontal (múltiplas instâncias da API) e rate-limit distribuído.
