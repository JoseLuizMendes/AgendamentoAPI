1. Visão Geral
O Scheduler-Fastify-Pro é uma API de agendamento de ultra-performance desenhada para estabelecimentos de serviço único. O sistema utiliza o ecossistema Fastify para garantir overhead mínimo e tempos de resposta otimizados, focando em escalabilidade e notificações em tempo real através de processamento assíncrono.

2. Objetivos Técnicos
Baixa Latência: Utilizar a serialização JSON nativa do Fastify para respostas ultra-rápidas.

Consistência de Dados: Garantir que dois clientes não ocupem o mesmo slot através de Optimistic Locking implementado via Prisma.

Processamento Assíncrono: Desacoplar o envio de mensagens (WhatsApp) do fluxo principal da API utilizando BullMQ e Redis.

3. Requisitos Funcionais (Backlog do MVP)
Configuração da Agenda (Proprietário):

Definir janelas de funcionamento, intervalos de pausa e dias "Off".

Gerir catálogo de serviços com durações dinâmicas (ex: 30min, 60min).

Fluxo de Agendamento (Cliente):

Consultar slots disponíveis calculados em tempo real com base na duração do serviço.

Realizar reserva com validação de concorrência via Prisma.

Sistema de Notificação:

Disparar eventos de agendamento criado para uma fila de processamento.

Worker dedicado para integração com API de WhatsApp em segundo plano.

4. Requisitos Não Funcionais (RNF)
Performance: Validação de esquemas e serialização acelerada via TypeBox.

Escalabilidade: Arquitetura baseada em plugins e mensageria distribuída (Redis).

Qualidade: Manter o padrão SonarQube Nota A e tipagem estrita com TypeScript.

Observabilidade: Implementação do Fastify Logger e métricas de saúde via Actuator-like endpoints.

5. Modelo de Dados Inicial (Prisma Schema)
User: Perfil do administrador/proprietário.

Service: id, name, price, durationInMinutes.

Appointment: id, customerName, customerPhone, serviceId, startTime, endTime, version (Int - para locking).

BusinessHours: dayOfWeek, openTime, closeTime, isOff.

6. Definição de Pronto (DoD)
Código validado com 100% de cobertura de tipos e SonarQube Nota A.

Endpoints documentados automaticamente via fastify-swagger (OpenAPI 3.0).

Suíte de testes unitários e de integração validando o cálculo de slots e concorrência.