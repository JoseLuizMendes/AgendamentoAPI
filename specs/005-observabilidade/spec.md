# Feature Specification: Observabilidade de Produção

**Feature Branch**: `feat/horarios-controle-total`

**Created**: 2026-06-29

**Status**: ✅ Implementada (US1–US4) em 2026-06-29 — verificação local verde (API tsc + 102 unit, incl.
scrub + gate por DSN; Web tsc + lint + build; audit 0 crítico). Captura real do Sentry, scrub em voo e
tracing = validação **manual** no painel (precisam de DSN + tráfego). SDKs `@sentry/node`/`@sentry/nextjs`
10.62.0.

**Input**: User description: "Observabilidade de produção para API (Fastify) + Web (Next 16) na VPS:
visibilidade de erros e de performance com o menor peso operacional possível. Decisão: usar Sentry
(SaaS) para erros + tracing, em vez de auto-hospedar o stack Grafana — para não repetir o peso ocioso
que motivou remover o Redis. Logs seguem no pino. Instrumentação OTel-compatível. Scrub de dados
sensíveis. Uptime externo dos domínios."

## Contexto

Após o 004, o app está pronto para rodar inteiro na VPS (API + Web, Docker + Caddy). Hoje, um erro em
produção só aparece se alguém ler `docker compose logs` na hora certa — não há captura, agrupamento,
stack trace nem alerta. Esta feature dá **visibilidade de erros e de performance** em produção com o
**menor peso operacional** na VPS única (decisão do dev: SaaS de erros em vez de stack auto-hospedado).
Não muda o comportamento de produto para o usuário final.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Erros de produção visíveis e acionáveis (Priority: P1)

Como responsável pelo produto, quando ocorre um erro em produção (na API ou no Web), quero ser
notificado e conseguir investigar — com stack trace, contexto da requisição e a versão (release) em que
aconteceu — sem precisar vasculhar logs manualmente.

**Why this priority**: sem captura de erro, falhas em produção passam despercebidas até o usuário
reclamar; é o ganho central de observabilidade e o pré-requisito de qualquer operação confiável.

**Independent Test**: provocar um erro controlado na API e no Web em produção (ou staging) e confirmar
que ele aparece na ferramenta de erros, agrupado, com stack trace, rota/contexto e o identificador da
release (SHA do deploy).

**Acceptance Scenarios**:

1. **Given** a API em produção, **When** uma exceção não tratada ocorre numa rota, **Then** o evento é
   capturado com stack trace, método/rota e a release, e fica visível no painel de erros.
2. **Given** o Web em produção, **When** um erro de render (client) ou de servidor (SSR) ocorre,
   **Then** o evento é capturado e associado à mesma release.
3. **Given** uma sequência de erros idênticos, **When** chegam à ferramenta, **Then** são **agrupados**
   (não geram ruído por evento) e um alerta básico pode notificar o responsável.
4. **Given** um ambiente de desenvolvimento (sem credencial de observabilidade), **When** a app roda,
   **Then** a captura fica **desativada** e nada é enviado para fora.

---

### User Story 2 - Diagnóstico de performance (rotas/queries lentas) (Priority: P2)

Como mantenedor, quero amostras de transações de produção para identificar onde está a lentidão — quais
rotas/consultas da API e quais navegações/renderizações do Web demoram mais.

**Why this priority**: depois de enxergar erros, performance é o próximo eixo; ajuda a priorizar
otimização com dados reais em vez de achismo. Amostragem mantém o custo/volume sob controle.

**Independent Test**: gerar tráfego em produção/staging e confirmar que transações aparecem com duração
e divisão por etapas (ex.: tempo de consulta ao banco numa rota), respeitando a taxa de amostragem
configurada.

**Acceptance Scenarios**:

1. **Given** a taxa de amostragem configurada, **When** requisições chegam à API, **Then** uma fração
   delas vira transação com duração total e das sub-operações (incl. consultas ao banco).
2. **Given** o Web em produção, **When** o usuário navega, **Then** uma fração das navegações/renders é
   amostrada com métricas de carregamento.
3. **Given** a taxa de amostragem ajustada por ambiente, **When** ela muda, **Then** o volume de
   transações enviadas muda de acordo, sem alterar código.

---

### User Story 3 - Eventos sem vazar dados sensíveis + configuração segura (Priority: P2)

Como responsável pela segurança, quero garantir que os eventos enviados para fora **não contenham
segredos nem dados sensíveis** (cookies de sessão, header de autorização, corpo de requisições de auth,
PII desnecessária), e que a credencial da ferramenta venha de ambiente validado.

**Why this priority**: enviar telemetria para um serviço externo cria uma nova superfície de vazamento;
o scrub e a configuração por ambiente são condição para a feature ser segura (consistente com o
hardening do 003/004).

**Independent Test**: provocar um erro numa rota de auth e inspecionar o evento capturado — confirmar
que cookie, `Authorization` e o corpo com senha **não** aparecem; confirmar que sem credencial nada é
enviado.

**Acceptance Scenarios**:

1. **Given** um erro numa requisição autenticada, **When** o evento é montado, **Then** cookie de
   sessão, header `Authorization` e campos de senha são **removidos/ofuscados** antes do envio.
2. **Given** a credencial (DSN) e a taxa de amostragem, **When** a app inicia, **Then** elas vêm de
   **ambiente validado** (não hardcoded); ausência de credencial = captura desligada.
3. **Given** o redact já existente nos logs locais (pino), **When** a observabilidade é adicionada,
   **Then** ela **não** reduz nem contorna esse redact.

---

### User Story 4 - Uptime externo dos domínios (Priority: P3)

Como operador, quero saber se `app.<dominio>` e `api.<dominio>` estão fora do ar mesmo quando o
problema é a própria VPS/host (quando a telemetria interna não conseguiria reportar).

**Why this priority**: captura de erro interna não cobre "o servidor inteiro caiu"; um monitor externo
de uptime é a rede de segurança final, e é barato/leve.

**Independent Test**: derrubar (ou simular indisponibilidade) de um dos domínios e confirmar que o
monitor externo detecta e notifica.

**Acceptance Scenarios**:

1. **Given** um monitor externo configurado para os dois domínios, **When** um deles fica indisponível,
   **Then** o responsável é notificado em poucos minutos.
2. **Given** os endpoints de health já existentes (`/health/live`), **When** o monitor os consulta,
   **Then** distingue "host no ar mas app degradada" de "tudo fora".

---

### Edge Cases

- **Sem credencial (dev/local):** a captura fica desativada e nenhum dado sai da máquina.
- **Indisponibilidade da ferramenta externa:** falha de envio de telemetria **não** pode derrubar nem
  travar a aplicação (best-effort, assíncrono).
- **Pico de erros:** o agrupamento + amostragem evitam inundar a ferramenta (e estourar custo) num
  incidente; deve haver limite/again de envio.
- **Custo/volume:** a amostragem de tracing é configurável por ambiente para manter o uso no plano
  gratuito/baixo enquanto o tráfego é pequeno.
- **PII em mensagens de erro:** mensagens podem conter dados do usuário; o scrub cobre os campos
  conhecidos e o envio de PII é minimizado por padrão.
- **Troca de fornecedor:** a instrumentação deve ser portável (padrão aberto) para permitir trocar o
  destino no futuro sem reinstrumentar tudo.

## Requirements *(mandatory)*

### Functional Requirements

**Erros (US1)**

- **FR-001**: A API MUST capturar exceções não tratadas e enviá-las à ferramenta de erros com stack
  trace, método/rota e identificador de release, em produção.
- **FR-002**: O Web MUST capturar erros de cliente e de servidor e associá-los à mesma release.
- **FR-003**: Eventos idênticos MUST ser agrupados pela ferramenta; um alerta básico MUST poder
  notificar o responsável.
- **FR-004**: A release MUST ser derivada do identificador de deploy já existente (SHA do commit /
  versão da imagem).
- **FR-005**: Sem credencial configurada, a captura MUST ficar desativada (nada é enviado).

**Performance (US2)**

- **FR-006**: A API MUST amostrar transações com duração total e de sub-operações (incluindo consultas
  ao banco), a uma taxa **configurável por ambiente**.
- **FR-007**: O Web MUST amostrar navegações/renderizações com métricas de carregamento, à taxa
  configurável.

**Privacidade & configuração (US3)**

- **FR-008**: Antes do envio, os eventos MUST ter removidos/ofuscados: cookie de sessão, header
  `Authorization` e campos de senha (corpo de auth).
- **FR-009**: Credencial (DSN) e taxas de amostragem MUST vir de ambiente validado; nunca hardcoded.
- **FR-010**: A observabilidade MUST NOT reduzir nem contornar o redact de logs já existente.
- **FR-011**: Falha de envio de telemetria MUST NOT impactar a disponibilidade da aplicação
  (best-effort, assíncrono).
- **FR-012**: A instrumentação SHOULD seguir um padrão aberto/portável para permitir troca de
  fornecedor futura sem reinstrumentar.

**Logs & uptime (US4 + transversal)**

- **FR-013**: Os logs estruturados (atuais) MUST permanecer disponíveis para coleta operacional; esta
  fase **não** auto-hospeda coletor de logs/métricas.
- **FR-014**: Deve existir um monitor **externo** de uptime para `app.<dominio>` e `api.<dominio>`, com
  notificação ao responsável, documentado no deploy.

### Key Entities *(include if feature involves data)*

- **Evento de erro**: ocorrência capturada — stack trace, contexto de requisição (saneado), release,
  ambiente, agrupamento.
- **Transação de performance**: amostra de uma operação (rota/navegação) com duração e sub-operações.
- **Release**: identificador da versão em produção (SHA/tag de imagem) que correlaciona eventos a um
  deploy.
- **Configuração de observabilidade**: credencial (DSN), taxa de amostragem, ambiente, regras de scrub
  — toda em ambiente validado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das exceções não tratadas em produção (API e Web) geram um evento capturado com
  stack trace e release associada.
- **SC-002**: O responsável é notificado de um novo tipo de erro em produção em poucos minutos, sem ler
  logs manualmente.
- **SC-003**: É possível identificar as rotas/operações mais lentas a partir das transações amostradas.
- **SC-004**: Em eventos de requisições autenticadas, **nenhum** cookie de sessão, header de autorização
  ou senha aparece (verificado por inspeção).
- **SC-005**: Em desenvolvimento/sem credencial, **zero** dados são enviados para fora.
- **SC-006**: A indisponibilidade total de um domínio é detectada e notificada por um monitor externo
  em poucos minutos.
- **SC-007**: A adição da observabilidade **não** degrada a latência percebida nem derruba a app quando
  a ferramenta externa está indisponível.

## Assumptions

- **Ferramenta de erros/tracing = Sentry (SaaS)** — decisão do dev, recomendada na auditoria. Registrar
  como **exceção aprovada de stack** (C6) por adicionar dependência (SDK). Self-host do stack Grafana
  (Loki/Prometheus/Tempo) fica **fora de escopo** (peso operacional na VPS única).
- **Logs** seguem com o logger estruturado atual (pino); coleta via `docker compose logs`. Dashboards
  de log/métrica gerenciados (ex.: Grafana Cloud free tier) são um possível passo futuro, fora desta
  fase.
- **Release** reaproveita o SHA do commit (tag `:sha` das imagens / `NEXT_PUBLIC_APP_VERSION`).
- **Uptime externo** usa um serviço gratuito (ex.: monitor de HTTP) apontado aos health checks
  existentes; é configuração/documentação, não código de aplicação.
- Reaproveita a config validada por ambiente (`config.ts` na API; env do Next no Web) e o redact de
  logs já existente.
- O comportamento de produto para o usuário final **não muda**.

## Out of Scope

- Stack de observabilidade **auto-hospedado** na VPS (Loki, Prometheus, Tempo, Grafana).
- APM pesado, profiling contínuo e alerting avançado (só o agrupamento + alerta básico do fornecedor).
- Métricas de negócio/produto e dashboards customizados (são outra frente).
- Session replay / monitoramento de usuário real além do tracing básico.
