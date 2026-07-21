# Módulo Odontológico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar, de forma aditiva e opcional-por-vertical, a fundação de **Paciente** (auto-upsert por telefone) e, depois, o **charting de dentes por consulta** (FDI/ISO 3950 + procedimento) ao AgendamentoAPI — sem poluir o núcleo genérico nem mexer na lógica crítica de conflito/optimistic-lock.

**Architecture:** Camadas do projeto (`routes` → `services` → Prisma). Toda mudança é **aditiva** (colunas/tabelas novas com default; migration sem perda de dados). O módulo dental é gated por `Tenant.businessType` (`GENERIC | DENTAL`); `Patient` é genérico (todo nicho ganha). Booking segue **canal-agnóstico** (Paciente por telefone prepara o WhatsApp futuro).

**Tech Stack:** TypeScript 5 (strict), Fastify 5 + `fastify-type-provider-zod`, Prisma 7 + PostgreSQL, Zod, Vitest (unit + integração), pnpm.

## Global Constraints

- **TS `strict`; `any` proibido** sem exceção aprovada.
- **Camadas**: `services/` **não** importam Fastify/`req`/`reply`; recebem `PrismaClient`/`Prisma.TransactionClient` + ids/DTO. `routes/` sem regra de negócio.
- **Multi-tenant**: todo `where` inclui `tenantId`; `tenantId` **nunca** vem do body/query (vem de `requireAuth(req)`).
- **Erros de domínio** via `../utils/errors` (`NotFoundError` 404, `ConflictError` 409, `ValidationError` 400). Nunca `reply.status()` de erro no service.
- **Concorrência**: não alterar `assertNoConflict` + transação `Serializable`; `P2034` → `ConflictError`.
- **Schema muda ⇒ migration** em `prisma/migrations/<ts>_<nome>/migration.sql` + `prisma generate`. Migration **aditiva** (default/nullable). Aplicar com `prisma migrate deploy`.
- **Campo novo do modelo ⇒ refletir no response Zod** (`schemas/index.ts`), senão o serializer corta o campo.
- **TDD (C5)**: teste antes; nada `completed` sem verde. Integração exige `DATABASE_URL` com **`?schema=test`** (faz `deleteMany` — nunca o banco real).
- **pnpm** (npm/yarn/bun banidos). Verificação: `pnpm -C api exec tsc -p tsconfig.json --noEmit` · `pnpm -C api test` · `pnpm -C api test:integration`.

---

## File Structure (Slice 1 — Fundação Paciente)

- `api/prisma/schema.prisma` — **modify**: enum `BusinessType`, `Tenant.businessType`, model `Patient`, `Appointment.patientId`.
- `api/prisma/migrations/<ts>_dental_patient_foundation/migration.sql` — **create**: SQL aditivo.
- `api/src/utils/phone.ts` — **create**: `normalizePhone` (puro).
- `api/src/services/patients.ts` — **create**: `upsertPatient` (regra, sem Fastify).
- `api/src/services/appointments.ts` — **modify**: linkar paciente em `createAppointment`/`updateAppointment`.
- `api/src/schemas/index.ts` — **modify**: `AppointmentResponseSchema.patientId`.
- `api/src/routes/auth.ts` — **modify**: expor `tenant.businessType` no `/auth/me`.
- `api/src/scripts/backfill-patients.ts` — **create**: backfill idempotente.
- `api/package.json` — **modify**: script `backfill:patients`.
- Testes: `api/tests/unit/phone.test.ts`, `api/tests/integration/patients.test.ts`, `api/tests/integration/backfill-patients.test.ts`.

---

## Task 1: Schema + migration (fundação Paciente)

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/migrations/<ts>_dental_patient_foundation/migration.sql`

**Interfaces:**
- Produces: enum `BusinessType { GENERIC DENTAL }`; `Tenant.businessType` (default GENERIC); model `Patient(id, tenantId, name, phone, email?, birthDate?, notes?, createdAt, updatedAt)` com `@@unique([tenantId, phone])`; `Appointment.patientId Int?` + relação.

- [ ] **Step 1: Editar `schema.prisma`** — adicionar o enum e o model, e os campos em `Tenant`/`Appointment`:

```prisma
enum BusinessType {
  GENERIC
  DENTAL
}

model Patient {
  id           Int           @id @default(autoincrement())
  tenantId     Int
  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name         String
  phone        String        // normalizado (só dígitos)
  email        String?
  birthDate    DateTime?
  notes        String?
  appointments Appointment[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([tenantId, phone])
  @@index([tenantId])
}
```
Em `model Tenant` adicionar: `businessType BusinessType @default(GENERIC)` e `patients Patient[]`.
Em `model Appointment` adicionar: `patientId Int?`, `patient Patient? @relation(fields: [patientId], references: [id], onDelete: SetNull)`, e `@@index([tenantId, patientId])`.

- [ ] **Step 2: Gerar a migration (sem aplicar interativo)**

Run: `pnpm -C api prisma migrate dev --name dental_patient_foundation --create-only`
Expected: cria `prisma/migrations/<ts>_dental_patient_foundation/migration.sql`. Conferir que o SQL é aditivo (novo enum/tabela, `ADD COLUMN "businessType" ... DEFAULT 'GENERIC'`, `ADD COLUMN "patientId" INTEGER`) — **sem** `DROP`.

- [ ] **Step 3: Aplicar no banco de teste e gerar o client**

Run: `pnpm -C api prisma migrate deploy` (com `DATABASE_URL` de teste `?schema=test`) e `pnpm -C api prisma generate`
Expected: migration aplicada; tipos do client incluem `Patient`, `Tenant.businessType`, `Appointment.patientId`.

- [ ] **Step 4: Typecheck**

Run: `pnpm -C api exec tsc -p tsconfig.json --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations
git commit -m "feat(api): schema aditivo — BusinessType, Patient, Appointment.patientId"
```

---

## Task 2: `normalizePhone` (helper puro) — TDD

**Files:**
- Create: `api/src/utils/phone.ts`
- Test: `api/tests/unit/phone.test.ts`

**Interfaces:**
- Produces: `normalizePhone(raw: string): string` (só dígitos).

- [ ] **Step 1: Teste que falha**

```ts
// api/tests/unit/phone.test.ts
import { describe, expect, it } from "vitest";
import { normalizePhone } from "../../src/utils/phone.js";

describe("normalizePhone", () => {
  it("mantém só dígitos", () => {
    expect(normalizePhone("+55 (11) 99999-1234")).toBe("5511999991234");
  });
  it("sem dígito vira string vazia", () => {
    expect(normalizePhone("abc-!")).toBe("");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm -C api exec vitest run tests/unit/phone.test.ts`
Expected: FAIL ("Cannot find module .../utils/phone.js").

- [ ] **Step 3: Implementação mínima**

```ts
// api/src/utils/phone.ts
/** Mantém só os dígitos (chave natural do paciente; evita duplicar por formatação). */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm -C api exec vitest run tests/unit/phone.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add api/src/utils/phone.ts api/tests/unit/phone.test.ts
git commit -m "feat(api): normalizePhone (dígitos) + teste"
```

---

## Task 3: `upsertPatient` (service) — TDD (integração)

**Files:**
- Create: `api/src/services/patients.ts`
- Test: `api/tests/integration/patients.test.ts`

**Interfaces:**
- Consumes: `Prisma.TransactionClient` (ou `PrismaClient`), `normalizePhone` (Task 2).
- Produces: `upsertPatient(db, tenantId, phone, name, email?): Promise<Patient>` — acha por `(tenantId, phone)` ou cria; atualiza `name` (e `email` se veio). `phone` recebido **já normalizado**.

- [ ] **Step 1: Teste que falha** (mirror do harness de `integration/appointments.test.ts`: `skipIf(!hasDb)`, `beforeEach` limpa + signup)

```ts
// api/tests/integration/patients.test.ts
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { upsertPatient } from "../../src/services/patients.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/patients.upsert", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let tenantId: number;

  beforeAll(async () => { app = await buildApp(); await app.ready(); });
  afterAll(async () => { await app.close(); });

  beforeEach(async () => {
    await app.prisma.appointment.deleteMany();
    await app.prisma.patient.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.tenant.deleteMany();
    const t = await app.prisma.tenant.create({ data: { name: "Clinica", slug: "clinica" } });
    tenantId = t.id;
  });

  it("cria na 1ª vez e reaproveita (mesmo telefone) na 2ª, atualizando o nome", async () => {
    const a = await upsertPatient(app.prisma, tenantId, "5511999991234", "Jose");
    const b = await upsertPatient(app.prisma, tenantId, "5511999991234", "Jose Silva");
    expect(b.id).toBe(a.id);
    expect(b.name).toBe("Jose Silva");
    expect(await app.prisma.patient.count()).toBe(1);
  });

  it("telefones diferentes = pacientes diferentes", async () => {
    await upsertPatient(app.prisma, tenantId, "5511999991234", "Jose");
    await upsertPatient(app.prisma, tenantId, "5511888882222", "Maria");
    expect(await app.prisma.patient.count()).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm -C api test:integration:prepare && pnpm -C api exec vitest run tests/integration/patients.test.ts --no-file-parallelism`
Expected: FAIL ("Cannot find module .../services/patients.js").

- [ ] **Step 3: Implementação mínima**

```ts
// api/src/services/patients.ts
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** Acha (por tenant+telefone normalizado) ou cria o paciente; atualiza o nome (e email se veio). */
export async function upsertPatient(
  db: Db,
  tenantId: number,
  phone: string,
  name: string,
  email?: string | null,
) {
  return db.patient.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    create: { tenantId, phone, name, email: email ?? null },
    update: { name, ...(email !== undefined ? { email: email ?? null } : {}) },
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm -C api exec vitest run tests/integration/patients.test.ts --no-file-parallelism`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add api/src/services/patients.ts api/tests/integration/patients.test.ts
git commit -m "feat(api): upsertPatient (acha-ou-cria por telefone) + integração"
```

---

## Task 4: Linkar paciente no booking (`createAppointment` + `updateAppointment`) — TDD

**Files:**
- Modify: `api/src/services/appointments.ts:104-124` (create) e `:191-224` (update)
- Test: `api/tests/integration/patients.test.ts` (adicionar casos via endpoint)

**Interfaces:**
- Consumes: `upsertPatient` (Task 3), `normalizePhone` (Task 2).
- Produces: `Appointment.patientId` populado no create; re-link no update quando `customerPhone`/`customerName` mudam.

- [ ] **Step 1: Teste que falha** (adicionar ao `patients.test.ts`; precisa de token OWNER — replicar o signup do harness de appointments)

```ts
  // dentro do describe, com um segundo bloco que faz signup p/ ter token:
  it("POST /appointments cria e linka o paciente por telefone", async () => {
    const signup = await app.inject({ method: "POST", url: "/auth/signup",
      payload: { email: "o@e.com", password: "password123", tenantName: "C2", tenantSlug: "c2" } });
    const token = signup.cookies.find((c) => c.name === "token")?.value ?? "";
    const svc = await app.inject({ method: "POST", url: "/services",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Limpeza", priceInCents: 5000, durationInMinutes: 30 } });
    const serviceId = svc.json().id as number;

    const r1 = await app.inject({ method: "POST", url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: { customerName: "Ana", customerPhone: "+55 11 90000-0000", serviceId, startTime: "2026-09-01T14:00:00.000Z" } });
    expect(r1.statusCode).toBe(201);
    expect(typeof r1.json().patientId).toBe("number");

    const r2 = await app.inject({ method: "POST", url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: { customerName: "Ana", customerPhone: "5511900000000", serviceId, startTime: "2026-09-01T16:00:00.000Z" } });
    expect(r2.json().patientId).toBe(r1.json().patientId); // mesmo telefone (formatações diferentes) => mesmo paciente
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm -C api exec vitest run tests/integration/patients.test.ts --no-file-parallelism`
Expected: FAIL (`patientId` é `undefined` no response / não linkado).

- [ ] **Step 3: Implementação** — em `createAppointment`, dentro da transação (após `assertNoConflict`), fazer o upsert e setar `patientId`:

```ts
// topo do arquivo:
import { upsertPatient } from "./patients.js";
import { normalizePhone } from "../utils/phone.js";

// dentro do $transaction do createAppointment, ANTES do tx.appointment.create:
const patient = await upsertPatient(
  tx, tenantId, normalizePhone(data.customerPhone), data.customerName, data.customerEmail ?? null,
);
// e no data: do create, adicionar:
//   patientId: patient.id,
```
Em `updateAppointment`: quando vier `data.customerPhone` **ou** `data.customerName`, re-upsert e incluir `patientId` em `dataFields` (usar `prisma` fora da transação de horário quando não houver mudança de horário; dentro do `tx` quando houver). Manter os campos `customer*` como snapshot (não remover).

- [ ] **Step 4: Rodar e ver passar** (rodar TAMBÉM a suíte de appointments p/ garantir que nada quebrou)

Run: `pnpm -C api exec vitest run tests/integration/patients.test.ts tests/integration/appointments.test.ts --no-file-parallelism`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add api/src/services/appointments.ts api/tests/integration/patients.test.ts
git commit -m "feat(api): booking linka Paciente por telefone (create/update)"
```

---

## Task 5: Expor `patientId` no response + `businessType` no `/auth/me` — TDD

**Files:**
- Modify: `api/src/schemas/index.ts:234-250` (`AppointmentResponseSchema`)
- Modify: `api/src/routes/auth.ts:140-151` (select do tenant no `/auth/me`)
- Test: `api/tests/integration/patients.test.ts` (asserts adicionais)

**Interfaces:**
- Produces: `AppointmentResponseSchema.patientId: number|null`; `/auth/me` retorna `tenant.businessType`.

- [ ] **Step 1: Teste que falha**

```ts
  it("/auth/me expõe tenant.businessType (default GENERIC)", async () => {
    const signup = await app.inject({ method: "POST", url: "/auth/signup",
      payload: { email: "me@e.com", password: "password123", tenantName: "C3", tenantSlug: "c3" } });
    const token = signup.cookies.find((c) => c.name === "token")?.value ?? "";
    const me = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${token}` } });
    expect(me.json().tenant.businessType).toBe("GENERIC");
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm -C api exec vitest run tests/integration/patients.test.ts --no-file-parallelism`
Expected: FAIL (`businessType` `undefined`).

- [ ] **Step 3: Implementação**
  - Em `AppointmentResponseSchema` (`schemas/index.ts`), adicionar após `userId`: `patientId: z.number().nullable(),`.
  - Em `routes/auth.ts`, no `select.tenant.select`, adicionar `businessType: true,`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm -C api exec vitest run tests/integration/patients.test.ts --no-file-parallelism && pnpm -C api exec tsc -p tsconfig.json --noEmit`
Expected: PASS + typecheck limpo.

- [ ] **Step 5: Commit**

```bash
git add api/src/schemas/index.ts api/src/routes/auth.ts api/tests/integration/patients.test.ts
git commit -m "feat(api): expõe patientId (response) e businessType (/auth/me)"
```

---

## Task 6: Backfill idempotente dos pacientes — TDD

**Files:**
- Create: `api/src/scripts/backfill-patients.ts`
- Modify: `api/package.json` (script `backfill:patients`)
- Test: `api/tests/integration/backfill-patients.test.ts`

**Interfaces:**
- Consumes: `normalizePhone` (Task 2).
- Produces: `backfillPatients(prisma): Promise<{ linked: number }>` — para todo `Appointment` com `patientId = null`, acha/cria o Paciente por telefone normalizado e seta `patientId`. Idempotente.

- [ ] **Step 1: Teste que falha**

```ts
// api/tests/integration/backfill-patients.test.ts
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { backfillPatients } from "../../src/scripts/backfill-patients.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/backfill-patients", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let tenantId: number, serviceId: number;

  beforeAll(async () => { app = await buildApp(); await app.ready(); });
  afterAll(async () => { await app.close(); });

  beforeEach(async () => {
    await app.prisma.appointment.deleteMany();
    await app.prisma.patient.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.tenant.deleteMany();
    const t = await app.prisma.tenant.create({ data: { name: "C", slug: "c" } });
    tenantId = t.id;
    const s = await app.prisma.service.create({ data: { name: "L", priceInCents: 1, durationInMinutes: 30, tenantId } });
    serviceId = s.id;
    // 2 agendamentos legados (sem patientId), mesmo telefone com formatações diferentes:
    await app.prisma.appointment.createMany({ data: [
      { customerName: "Ana", customerPhone: "+55 11 90000-0000", serviceId, tenantId, startTime: new Date("2026-09-01T14:00:00Z"), endTime: new Date("2026-09-01T14:30:00Z") },
      { customerName: "Ana", customerPhone: "5511900000000", serviceId, tenantId, startTime: new Date("2026-09-02T14:00:00Z"), endTime: new Date("2026-09-02T14:30:00Z") },
    ]});
  });

  it("cria 1 paciente para o telefone e linka os 2 agendamentos; idempotente", async () => {
    await backfillPatients(app.prisma);
    expect(await app.prisma.patient.count()).toBe(1);
    expect(await app.prisma.appointment.count({ where: { patientId: null } })).toBe(0);
    await backfillPatients(app.prisma); // 2ª rodada não duplica
    expect(await app.prisma.patient.count()).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm -C api exec vitest run tests/integration/backfill-patients.test.ts --no-file-parallelism`
Expected: FAIL ("Cannot find module .../scripts/backfill-patients.js").

- [ ] **Step 3: Implementação**

```ts
// api/src/scripts/backfill-patients.ts
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../utils/phone.js";

export async function backfillPatients(prisma: PrismaClient): Promise<{ linked: number }> {
  const pending = await prisma.appointment.findMany({
    where: { patientId: null },
    select: { id: true, tenantId: true, customerName: true, customerPhone: true, customerEmail: true },
  });
  let linked = 0;
  for (const a of pending) {
    const patient = await prisma.patient.upsert({
      where: { tenantId_phone: { tenantId: a.tenantId, phone: normalizePhone(a.customerPhone) } },
      create: { tenantId: a.tenantId, phone: normalizePhone(a.customerPhone), name: a.customerName, email: a.customerEmail },
      update: {},
    });
    await prisma.appointment.update({ where: { id: a.id }, data: { patientId: patient.id } });
    linked++;
  }
  return { linked };
}

// CLI (mirror de scripts/cleanup-tokens.ts): roda só quando executado direto.
if (import.meta.url === `file://${process.argv[1]}`) {
  const prisma = new PrismaClient();
  backfillPatients(prisma)
    .then((r) => { console.log(`backfill-patients: ${r.linked} agendamentos linkados`); })
    .finally(() => prisma.$disconnect());
}
```
Em `api/package.json` scripts, adicionar: `"backfill:patients": "tsx src/scripts/backfill-patients.ts"`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm -C api exec vitest run tests/integration/backfill-patients.test.ts --no-file-parallelism`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/scripts/backfill-patients.ts api/package.json api/tests/integration/backfill-patients.test.ts
git commit -m "feat(api): backfill idempotente de Paciente por telefone"
```

---

## Slice 1 — Gate final (rodar tudo verde antes de fechar)

- [ ] `pnpm -C api exec tsc -p tsconfig.json --noEmit` → PASS
- [ ] `pnpm -C api test` (unit) → PASS
- [ ] `pnpm -C api test:integration` → PASS (inclui patients + backfill + appointments intactos)
- [ ] Setar o tenant do Dr. Gabriel como DENTAL quando for o deploy dele: `UPDATE "Tenant" SET "businessType"='DENTAL' WHERE slug='<slug>'` (ou via seed).

---

## Roadmap — Slices 2–4 (detalhar em plano próprio ao chegar em cada)

> Cada slice vira um plano detalhado (TDD, bite-sized) **quando** for iniciado — os arquivos de web ainda precisam ser lidos (C1) antes de escrever código exato.

**Slice 2 — Dentes por consulta (dados + gating):** enum `DentalProcedure`; model `AppointmentTooth(appointmentId, toothFdi, procedure, note?)` `@@unique([appointmentId, toothFdi])`; helper puro `isValidFdiTooth` (11-18,21-28,31-38,41-48; 51-85) + unit; guard `assertDental(tenant)`; migration aditiva. Testes: FDI (limites/inválidos), GENERIC recusa dente.

**Slice 3 — API de paciente + charting no booking:** schemas Zod (`teeth?[]` no request/response de appointment, só DENTAL) + rotas finas `GET /patients`, `GET /patients/:id`, `PATCH /patients/:id`, `GET /patients/:id/odontogram` (agrega tooth→estado). Registrar em `app.ts`. Integração: multi-tenancy, RBAC, replace-on-edit dos dentes.

**Slice 4 — Web (gated `me.tenant.businessType === 'DENTAL'`):** `OdontogramaPicker` (SVG 32 dentes FDI, só tokens, a11y) no drawer de agendamento; ficha do Paciente (evolui a aba Clientes, read-only no MVP). React Query; unit da lógica pura + Playwright (claro/escuro, 0 erro console).

---

## Self-Review (writing-plans)

- **Cobertura do spec (Slice 1):** `businessType` (T1/T5) · `Patient` (T1/T3) · auto-upsert por telefone (T3/T4) · `patientId` opcional (T1/T4/T5) · backfill (T6) · response Zod (T5) · exposição p/ gating futuro (T5). ✅
- **Placeholders:** nenhum passo com "TODO"/"depois"; todo passo de código tem o código. ✅
- **Consistência de tipos:** `upsertPatient(db, tenantId, phone, name, email?)` é usado igual em T3/T4/T6; `normalizePhone` idem; `tenantId_phone` (nome do índice composto do Prisma) usado consistentemente. ✅
- **Escopo:** Slice 1 entrega software funcionando e testável por si (fundação Paciente), independente de dente. Slices 2–4 são planos subsequentes. ✅
