{
  "project": {
    "name": "Scheduler-Fastify-Pro",
    "stack": {
      "runtime": "Node.js 24+ LTS",
      "framework": "Fastify",
      "orm": "Prisma",
      "database": "PostgreSQL",
      "messaging": "BullMQ / Redis",
      "package manager": "pnpm"
    },
    "features": [
      "Configuração de agenda dinâmica pelo proprietário (dias on/off e intervalos)",
      "Catálogo de serviços com durações customizáveis",
      "Cálculo em tempo real de slots disponíveis para agendamento",
      "Sistema de reserva de horários com prevenção de conflitos",
      "Envio automatizado de notificações via WhatsApp"
    ],
    "non_functional_requirements": [
      "Escalabilidade: Arquitetura baseada em plugins e mensageria assíncrona",
      "Performance: Serialização JSON acelerada e baixa latência de resposta",
      "Concorrência: Controle de acesso simultâneo via Optimistic Locking",
      "Qualidade: Cobertura de testes unitários",
      "Segurança: Validação rigorosa de inputs via TypeBox"
    ]
  }
}