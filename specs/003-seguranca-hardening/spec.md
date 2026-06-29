# Feature Specification: Segurança & Hardening

**Feature Branch**: `feat/horarios-controle-total`

**Created**: 2026-06-28

**Status**: ✅ Concluída (US1, US2 e US3 implementadas e verdes; verificado em 2026-06-29). Itens
marcados *out of scope* aqui (observabilidade, WAF/anti-DDoS na borda) seguem para os specs 004/005.

**Input**: User description: "Segurança & Hardening da API: anti-brute-force (fix do timing oracle + lockout de conta), hardening geral (bodyLimit, Idempotency-Key no booking, pnpm audit no CI) e ciclo de conta por email via Resend (verificação + reset de senha)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Proteção contra invasão de conta (Priority: P1) ✅ implementada

Um atacante tenta adivinhar a senha de uma conta por tentativa-e-erro, ou descobrir quais emails
estão cadastrados. O sistema deve frustrar ambos: limitar tentativas e não revelar a existência do
email pelo comportamento/tempo de resposta.

**Why this priority**: é o vetor de fraude mais direto quando o produto cresce; protege a conta do
dono/staff, que dá acesso a toda a agenda e dados dos clientes.

**Independent Test**: errar a senha repetidas vezes → a conta é bloqueada temporariamente; comparar
o tempo/resposta de login entre um email cadastrado e um inexistente → indistinguíveis.

**Acceptance Scenarios**:

1. **Given** uma conta existente, **When** ocorrem N falhas de senha seguidas, **Then** a conta fica
   bloqueada por uma janela e novas tentativas são recusadas sem checar a senha.
2. **Given** a janela de bloqueio expirou, **When** o usuário tenta com a senha correta, **Then** o
   login funciona e os contadores de falha zeram.
3. **Given** um email não cadastrado, **When** se tenta logar, **Then** a resposta (status e tempo) é
   equivalente à de senha errada num email existente.

---

### User Story 2 - Robustez do servidor contra abuso (Priority: P2) ✅ implementada

O sistema deve resistir a payloads abusivos, a duplicação acidental de operações e a dependências
vulneráveis conhecidas.

**Why this priority**: defesas baratas e amplas que reduzem superfície de abuso e erros caros (ex.:
agendamento duplicado por duplo-clique), sem afetar o fluxo normal.

**Independent Test**: enviar um corpo acima do limite → rejeitado; repetir a criação de um
agendamento com a mesma chave de idempotência → no máximo um agendamento criado.

**Acceptance Scenarios**:

1. **Given** uma requisição com corpo acima do limite, **When** ela chega, **Then** é rejeitada antes
   de qualquer processamento.
2. **Given** duas requisições de criação de agendamento com a mesma chave de idempotência, **When**
   ambas são processadas, **Then** exatamente um agendamento é criado e ambas recebem o mesmo
   resultado.
3. **Given** o pipeline de CI, **When** roda, **Then** vulnerabilidades conhecidas em dependências são
   reportadas.

---

### User Story 3 - Ciclo de conta por email (verificação + reset) (Priority: P3) ✅ implementada

O dono/staff precisa confirmar a posse do email no cadastro e recuperar o acesso caso esqueça a
senha, sem depender de suporte manual.

**Why this priority**: necessidade operacional (recuperação de senha) e anti-fraude (impede cadastro
em massa com emails alheios). Depende de provedor de email externo já contratado.

**Independent Test**: cadastrar → receber email de verificação e confirmar; pedir "esqueci a senha" →
receber link, definir nova senha e logar com ela; o link é de uso único e expira.

**Acceptance Scenarios**:

1. **Given** um novo cadastro, **When** concluído, **Then** um email de verificação é enviado e o
   usuário pode confirmar via link.
2. **Given** um usuário que esqueceu a senha, **When** solicita redefinição com seu email, **Then**
   recebe um link e consegue definir uma nova senha; tentar o mesmo link de novo falha.
3. **Given** um email **não** cadastrado, **When** alguém solicita redefinição, **Then** a resposta é
   idêntica à de um email cadastrado (não revela existência).
4. **Given** um token expirado, **When** usado, **Then** é recusado com mensagem clara.

---

### Edge Cases

- **Lockout-DoS:** um atacante erra a senha da vítima de propósito para trancá-la → o bloqueio é
  **temporário e auto-expira** (não permanente), limitando o dano.
- **Enumeração via 429:** conta bloqueada responde diferente de email inexistente → trade-off aceito
  nesta fase (resistência total à enumeração no login fica fora de escopo).
- **Falha no envio de email:** a operação não vaza dados nem trava; o usuário pode tentar de novo.
- **Token vazado do banco:** o armazenamento não permite reutilizar o token a partir do dump (guardado
  como hash).
- **Concorrência no booking:** duas requisições simultâneas com a mesma chave → no máximo uma criação.
- **Sem provedor de email configurado (ambiente de dev):** o sistema registra o link em log em vez de
  enviar, para permitir testar o fluxo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST bloquear temporariamente uma conta após um número configurável de falhas
  de login consecutivas, liberando-a automaticamente após uma janela configurável.
- **FR-002**: O login MUST se comportar de forma indistinguível (status e tempo) entre email
  cadastrado e não cadastrado (anti-enumeração por timing).
- **FR-003**: O sistema MUST rejeitar corpos de requisição acima de um limite configurado, antes do
  processamento.
- **FR-004**: O sistema MUST garantir idempotência na criação de agendamento quando o cliente fornece
  uma chave de idempotência: requisições repetidas com a mesma chave não criam duplicatas.
- **FR-005**: O pipeline de CI MUST reportar vulnerabilidades conhecidas nas dependências.
- **FR-006**: O sistema MUST enviar um email de verificação ao cadastrar e permitir a confirmação via
  link.
- **FR-007**: Os usuários MUST poder solicitar e concluir a redefinição de senha via token enviado por
  email, com token de **uso único** e **expiração**.
- **FR-008**: Pedidos de verificação/redefinição MUST não revelar se um email está cadastrado.
- **FR-009**: Tokens de verificação/redefinição MUST ser armazenados de forma que o vazamento do banco
  não exponha um token reutilizável.
- **FR-010**: Toda configuração sensível (limiares de lockout, credencial do provedor de email) MUST
  vir de ambiente validado, nunca embutida no código.

### Key Entities *(include if feature involves data)*

- **Conta de usuário**: credenciais e estado de segurança — contagem de falhas de login, instante de
  bloqueio temporário, e status de verificação de email. Escopada por estabelecimento (tenant).
- **Token de email**: representa uma verificação de email ou um pedido de redefinição de senha;
  atributos: valor (armazenado como hash), tipo, validade (expiração) e uso (consumido ou não),
  vinculado a um usuário.
- **Chave de idempotência**: identifica uma operação de criação de agendamento por estabelecimento,
  vinculada ao resultado produzido, para devolver o mesmo resultado em repetições.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após o número configurado de senhas erradas, a conta fica bloqueada pela janela
  configurada; tentativas adicionais são recusadas sem checar a senha.
- **SC-002**: A resposta de login para email inexistente é equivalente (status e custo de
  processamento) à de senha errada num email existente.
- **SC-003**: Criar agendamento repetidas vezes com a mesma chave de idempotência resulta em **no
  máximo 1** agendamento.
- **SC-004**: 100% das requisições com corpo acima do limite são rejeitadas antes do processamento.
- **SC-005**: 100% dos novos cadastros disparam um email (ou, em dev, um link registrado) de
  verificação.
- **SC-006**: Um usuário consegue redefinir a senha por conta própria via email e logar com a nova
  senha; o link funciona **uma única vez** e expira.
- **SC-007**: Solicitar redefinição para email inexistente produz a mesma resposta visível que para um
  email cadastrado.

## Assumptions

- **Provedor de email = Resend**, já contratado pelo dev; o envio é via API HTTP do provedor (sem novo
  pacote de dependência), com a credencial em variável de ambiente. Em ambiente de desenvolvimento sem
  credencial, o sistema registra o link em log em vez de enviar.
- **Decisão de produto (default):** um usuário com email ainda não verificado **pode** logar, exibindo
  um aviso "verifique seu email" — não bloqueia o acesso (menos atrito no início). Pode ser endurecido
  depois via configuração.
- Reaproveita a autenticação existente (sessão por cookie httpOnly + JWT) e o escopo multi-tenant por
  `tenantId`; erros de domínio seguem o padrão do projeto.
- **Fora de escopo**: resistência total à enumeração de usuário no login (lockout responde 429);
  observabilidade/alertas (serão tratados por um serviço externo); WAF/anti-DDoS na borda (configuração
  de infraestrutura, fora do código).
