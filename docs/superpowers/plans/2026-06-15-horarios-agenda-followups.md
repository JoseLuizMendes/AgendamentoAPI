# Horários — lock/shade da agenda + follow-ups · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar a disponibilidade da agenda (cinza+travado para passado/fechado/feriado/fora do expediente/almoço; preto+clicável no resto) e fechar os follow-ups de Horários (layout bento, remoção do Base UI, edição de exceção in-place), sobre a WIP do bento já pronta.

**Architecture:** W1 é 100% frontend — um helper de lógica pura (`availability.ts`) que espelha o `resolveBusinessForDay` do backend, consumido pela `agenda-calendar.tsx` para gerar faixas cinza (bg-events) e travar `selectAllow`/`eventAllow`. W2/W3/W4 são mudanças localizadas de UI/tooling/docs. Tudo empilha sobre a WIP do bento, que a Fase 0 commita primeiro num branch de trabalho.

**Tech Stack:** Next 16 + React 19, FullCalendar 6 (timeGrid), Tailwind v4 (tokens), @tanstack/react-query, Vitest (novo no `web`, para o helper), Playwright (MCP) para E2E/visual.

**Spec:** [docs/superpowers/specs/2026-06-15-horarios-agenda-followups-design.md](../specs/2026-06-15-horarios-agenda-followups-design.md)

**Convenções (do CLAUDE.md):** só tokens (sem hex), sem `any`, fetch só via React Query (sem `useEffect`-fetch), TDD (C5), Context7 antes de API de lib (C7). Toda mensagem de commit termina com a linha `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## ⚠️ Fase 0 — Topologia (executar com cuidado, NÃO delegar a subagente cego)

A WIP do bento (14 arquivos) está **sem commit na worktree `main`** (branch default). Decisão do dev: **commitar a WIP primeiro**. Como não se commita direto no default, levamos a WIP para um branch de trabalho `feat/horarios-controle-total`, **no próprio worktree `main`** (onde a WIP e o dev server :3001 já vivem) — assim nenhum arquivo é movido entre worktrees (menor risco de perda). A spec + este plano (hoje no branch `claude/intelligent-swartz-65dab4`) são trazidos para o branch de trabalho.

> Caminho da worktree main: `F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI`

- [ ] **Step 1: Conferir a WIP (não destrutivo)**

Run:
```bash
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" status --short
```
Expected: os 14 itens da WIP (M schema.prisma, hours.ts, schemas, services/hours.ts, page.tsx, drawers, tenant-context.ts, types.ts, hour-picker.tsx; ?? migration `break_label`, hours.test.ts, `horarios/`, `bento.tsx`).

- [ ] **Step 2: Criar o branch de trabalho carregando a WIP**

A WIP acompanha o `switch -c` (mesmo HEAD `eaff6ee`, sem conflito). `main` permanece em `eaff6ee` limpo.
```bash
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" switch -c feat/horarios-controle-total
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" status --short
```
Expected: mesmo conjunto de mudanças, agora no branch `feat/horarios-controle-total`.

- [ ] **Step 3: Commitar a WIP do bento (Fases A–3)**

```bash
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" add -A
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" commit -m "feat: Horários controle total (bento) + observações nos agendamentos" -m "Editar/excluir dia, intervalo rotulado (label no break + migration), exceções de data (CRUD overrides), copiar p/ vários dias, layout bento (bento.tsx) e observações (notes) nos drawers de criar/detalhar. Fases A–3." -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: Trazer spec + plano para o branch de trabalho**

```bash
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" checkout claude/intelligent-swartz-65dab4 -- docs/superpowers/
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" add docs/superpowers/
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" commit -m "docs: spec + plano dos follow-ups de Horários" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5: Verificar a base verde (antes de empilhar)**

Run (do worktree main):
```bash
pnpm -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI/api" exec tsc -p tsconfig.json --noEmit
pnpm -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI/api" test
pnpm -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI/web" exec tsc --noEmit
pnpm -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI/web" lint
```
Expected: api tsc limpo; api unit verdes; web tsc limpo; web lint ≤ baseline. Se algo falhar, **parar e reportar** (a WIP não estava verde) — não seguir.

> A partir daqui, **todo trabalho é no worktree main, branch `feat/horarios-controle-total`**. Os caminhos abaixo são relativos a esse worktree. O worktree `intelligent-swartz` fica órfão (pode ser removido depois com `git worktree remove`).

---

## Fase 1 — Vitest no `web` (habilita o TDD do W1)

**Files:**
- Create: `web/vitest.config.ts`
- Modify: `web/package.json`
- Modify: `CLAUDE.md` (raiz — registro)

- [ ] **Step 1: Adicionar o Vitest como devDep**

Run:
```bash
pnpm -C web add -D vitest
```

- [ ] **Step 2: Criar `web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Adicionar o script `test` ao `web/package.json`**

No bloco `"scripts"`, adicionar a linha `test` (manter as demais):
```json
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Confirmar que o tooling não quebrou os tipos**

Run:
```bash
pnpm -C web exec tsc --noEmit
```
Expected: limpo (a config nova não entra no build do Next; o helper/tests chegam na Fase 2).

- [ ] **Step 5: Registrar no `CLAUDE.md` raiz**

Em **Exceções aprovadas (registro)**, adicionar:
```markdown
- **Vitest ligado no `web`** — 2026-06-15. O `web` passou a ter unit-test runner (Vitest, já no
  canon) para lógica pura de UI (ex.: `availability.ts` da agenda). `pnpm -C web test`.
```

- [ ] **Step 6: Commit**

```bash
git add web/vitest.config.ts web/package.json pnpm-lock.yaml CLAUDE.md
git commit -m "chore(web): liga o Vitest para unit de lógica pura" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Fase 2 — W1: helper de disponibilidade (TDD)

**Files:**
- Create: `web/src/components/tenant/agenda/availability.ts`
- Test: `web/src/components/tenant/agenda/availability.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `web/src/components/tenant/agenda/availability.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { effectiveHoursForDate, computeLockedBands, isAvailable } from "./availability";
import type { BusinessHours, BusinessDateOverride } from "@/components/tenant/types";

const SLOT_MIN = "08:30:00";
const SLOT_MAX = "21:00:00";

function bh(p: Partial<BusinessHours> & { dayOfWeek: number }): BusinessHours {
  return {
    id: p.dayOfWeek + 1,
    dayOfWeek: p.dayOfWeek,
    openTime: p.openTime ?? "09:00",
    closeTime: p.closeTime ?? "18:00",
    isOff: p.isOff ?? false,
    tenantId: 1,
    breaks: p.breaks ?? [],
  };
}
// Seg 2026-06-15; weekday local = 1 (segunda)
const monday = (h: number, m = 0) => new Date(2026, 5, 15, h, m, 0, 0);

describe("effectiveHoursForDate", () => {
  it("usa as horas do dia da semana quando não há override", () => {
    const eff = effectiveHoursForDate(monday(0), [bh({ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" })], []);
    expect(eff).toEqual({ open: "09:00", close: "18:00", breaks: [] });
  });
  it("retorna null em dia isOff", () => {
    expect(effectiveHoursForDate(monday(0), [bh({ dayOfWeek: 1, isOff: true })], [])).toBeNull();
  });
  it("retorna null em override de feriado (isOff)", () => {
    const ov: BusinessDateOverride[] = [{ id: 1, date: "2026-06-15", isOff: true, tenantId: 1 }];
    expect(effectiveHoursForDate(monday(0), [bh({ dayOfWeek: 1 })], ov)).toBeNull();
  });
  it("override de horário especial usa as horas do override + breaks do dia da semana", () => {
    const ov: BusinessDateOverride[] = [{ id: 1, date: "2026-06-15", isOff: false, openTime: "10:00", closeTime: "14:00", tenantId: 1 }];
    const hours = [bh({ dayOfWeek: 1, breaks: [{ id: 9, businessHoursId: 2, startTime: "12:00", endTime: "13:00" }] })];
    expect(effectiveHoursForDate(monday(0), hours, ov)).toEqual({
      open: "10:00",
      close: "14:00",
      breaks: [{ start: "12:00", end: "13:00" }],
    });
  });
});

describe("isAvailable", () => {
  const hours = [bh({ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", breaks: [{ id: 9, businessHoursId: 2, startTime: "12:00", endTime: "13:00" }] })];
  const now = monday(10, 0);
  it("true dentro do expediente e no futuro", () => {
    expect(isAvailable(monday(14, 0), monday(15, 0), hours, [], now, SLOT_MIN, SLOT_MAX)).toBe(true);
  });
  it("false no passado", () => {
    expect(isAvailable(monday(9, 0), monday(9, 30), hours, [], now, SLOT_MIN, SLOT_MAX)).toBe(false);
  });
  it("false dentro do almoço (break)", () => {
    expect(isAvailable(monday(12, 0), monday(12, 30), hours, [], now, SLOT_MIN, SLOT_MAX)).toBe(false);
  });
  it("false após o fechamento", () => {
    expect(isAvailable(monday(18, 0), monday(18, 30), hours, [], now, SLOT_MIN, SLOT_MAX)).toBe(false);
  });
  it("false em dia fechado", () => {
    expect(isAvailable(monday(14, 0), monday(15, 0), [bh({ dayOfWeek: 1, isOff: true })], [], now, SLOT_MIN, SLOT_MAX)).toBe(false);
  });
});

describe("computeLockedBands", () => {
  const hours = [bh({ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", breaks: [{ id: 9, businessHoursId: 2, startTime: "12:00", endTime: "13:00" }] })];
  it("gera faixas sem sobreposição e cobre passado/antes/almoço/depois", () => {
    const now = monday(10, 0);
    const bands = computeLockedBands([monday(0)], hours, [], now, SLOT_MIN, SLOT_MAX);
    // ordena por início
    const sorted = [...bands].sort((a, b) => a.start.getTime() - b.start.getTime());
    // sem sobreposição
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].start.getTime()).toBeGreaterThanOrEqual(sorted[i - 1].end.getTime());
    }
    // 08:30→10:00 (grid+passado), 12:00→13:00 (almoço), 18:00→21:00 (após fechar)
    const has = (s: Date, e: Date) => sorted.some((b) => b.start.getTime() === s.getTime() && b.end.getTime() === e.getTime());
    expect(has(monday(8, 30), monday(10, 0))).toBe(true);
    expect(has(monday(12, 0), monday(13, 0))).toBe(true);
    expect(has(monday(18, 0), monday(21, 0))).toBe(true);
  });
  it("dia fechado vira uma faixa cobrindo a grade inteira", () => {
    const now = monday(7, 0);
    const bands = computeLockedBands([monday(0)], [bh({ dayOfWeek: 1, isOff: true })], [], now, SLOT_MIN, SLOT_MAX);
    expect(bands).toHaveLength(1);
    expect(bands[0].start.getTime()).toBe(monday(8, 30).getTime());
    expect(bands[0].end.getTime()).toBe(monday(21, 0).getTime());
  });
});
```

- [ ] **Step 2: Rodar e ver falhar (RED)**

Run:
```bash
pnpm -C web test
```
Expected: FAIL — `availability.ts` não existe / exports indefinidos.

- [ ] **Step 3: Implementar o helper**

Criar `web/src/components/tenant/agenda/availability.ts`:
```ts
import type { BusinessHours, BusinessDateOverride } from "@/components/tenant/types";

export type Interval = { start: Date; end: Date };
type EffectiveHours = { open: string; close: string; breaks: { start: string; end: string }[] };

/** "yyyy-MM-dd" local de um Date. */
function dateKey(day: Date): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date no dia `day` (local) na hora "HH:MM[:SS]". "24:00" → 00:00 do dia seguinte. */
function atTime(day: Date, hhmm: string): Date {
  const [h, m, s] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, s || 0, 0);
  return d;
}

/** Expediente efetivo da data (espelha resolveBusinessForDay do backend). null = fechado. */
export function effectiveHoursForDate(
  day: Date,
  hours: BusinessHours[],
  overrides: BusinessDateOverride[],
): EffectiveHours | null {
  const override = overrides.find((o) => o.date === dateKey(day));
  const weekly = hours.find((h) => h.dayOfWeek === day.getDay());

  if (override) {
    if (override.isOff || !override.openTime || !override.closeTime) return null;
    return {
      open: override.openTime,
      close: override.closeTime,
      breaks: (weekly?.breaks ?? []).map((b) => ({ start: b.startTime, end: b.endTime })),
    };
  }
  if (!weekly || weekly.isOff) return null;
  return {
    open: weekly.openTime,
    close: weekly.closeTime,
    breaks: weekly.breaks.map((b) => ({ start: b.startTime, end: b.endTime })),
  };
}

/** `iv` menos o intervalo [cs, ce]. */
function subtract(iv: Interval, cs: Date, ce: Date): Interval[] {
  if (ce <= iv.start || cs >= iv.end) return [iv];
  const out: Interval[] = [];
  if (cs > iv.start) out.push({ start: iv.start, end: cs });
  if (ce < iv.end) out.push({ start: ce, end: iv.end });
  return out;
}

/** Intervalos DISPONÍVEIS da data: [max(open, now), close] ∩ [slotMin, slotMax] − breaks. */
function availableIntervalsForDay(
  day: Date,
  hours: BusinessHours[],
  overrides: BusinessDateOverride[],
  now: Date,
  slotMin: string,
  slotMax: string,
): Interval[] {
  const eff = effectiveHoursForDate(day, hours, overrides);
  if (!eff) return [];
  const gridStart = atTime(day, slotMin);
  const gridEnd = atTime(day, slotMax);
  let start = atTime(day, eff.open);
  let end = atTime(day, eff.close);
  if (start < gridStart) start = gridStart;
  if (end > gridEnd) end = gridEnd;
  if (now > start) start = now;
  if (end <= start) return [];

  let intervals: Interval[] = [{ start, end }];
  for (const b of eff.breaks) {
    const bs = atTime(day, b.start);
    const be = atTime(day, b.end);
    intervals = intervals.flatMap((iv) => subtract(iv, bs, be));
  }
  return intervals;
}

/** Faixas TRAVADAS (cinza) = complemento das disponíveis dentro de [slotMin, slotMax], por dia. */
export function computeLockedBands(
  days: Date[],
  hours: BusinessHours[],
  overrides: BusinessDateOverride[],
  now: Date,
  slotMin: string,
  slotMax: string,
): Interval[] {
  const bands: Interval[] = [];
  for (const day of days) {
    const gridStart = atTime(day, slotMin);
    const gridEnd = atTime(day, slotMax);
    const avail = availableIntervalsForDay(day, hours, overrides, now, slotMin, slotMax).sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    let cursor = gridStart;
    for (const iv of avail) {
      if (iv.start > cursor) bands.push({ start: cursor, end: iv.start });
      if (iv.end > cursor) cursor = iv.end;
    }
    if (cursor < gridEnd) bands.push({ start: cursor, end: gridEnd });
  }
  return bands;
}

/** [start, end] cabe inteiro numa janela disponível? (mesma base das faixas). */
export function isAvailable(
  start: Date,
  end: Date,
  hours: BusinessHours[],
  overrides: BusinessDateOverride[],
  now: Date,
  slotMin: string,
  slotMax: string,
): boolean {
  return availableIntervalsForDay(start, hours, overrides, now, slotMin, slotMax).some(
    (iv) => start >= iv.start && end <= iv.end,
  );
}
```

- [ ] **Step 4: Rodar e ver passar (GREEN)**

Run:
```bash
pnpm -C web test
```
Expected: PASS (todos os describes verdes).

- [ ] **Step 5: Typecheck + commit**

Run:
```bash
pnpm -C web exec tsc --noEmit
```
Expected: limpo. Então:
```bash
git add web/src/components/tenant/agenda/availability.ts web/src/components/tenant/agenda/availability.test.ts
git commit -m "feat(web): helper de disponibilidade da agenda (lógica pura + testes)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Fase 3 — W1: integração na agenda

**Files:**
- Modify: `web/src/components/tenant/agenda/agenda-calendar.tsx`
- Modify: `web/src/app/globals.css`

- [ ] **Step 1: Renomear a classe da faixa cinza no `globals.css`**

Trocar o seletor `.fc .fc-bg-event.fc-past-bg` por `.fc .fc-bg-event.fc-locked-bg` (mesmo estilo):
```css
/* Indisponível (passado, fechado, feriado, fora do expediente, intervalo): faixa de fundo. */
.fc .fc-bg-event.fc-locked-bg {
  background: var(--muted-foreground);
  opacity: 0.08;
}
```

- [ ] **Step 2: Importar o helper + ler `overrides` do contexto**

Em `agenda-calendar.tsx`, adicionar o import (após o import de `./colors`):
```ts
import { computeLockedBands, isAvailable, type Interval } from "./availability";
```
E incluir `overrides` no destructuring do `useTenant`:
```ts
  const { services, hours, settings, overrides } = useTenant();
```

- [ ] **Step 3: Guardar o tipo de view (para aplicar só em timeGrid)**

Adicionar estado (junto dos outros `useState`):
```ts
  const [viewType, setViewType] = useState("timeGridWeek");
```
E setar no `onDatesSet` (primeira linha da função):
```ts
  function onDatesSet(arg: DatesSetArg) {
    setViewType(arg.view.type);
    setRange({
      startISO: arg.start.toISOString(),
      endISO: arg.end.toISOString(),
      startMs: arg.start.getTime(),
      endMs: arg.end.getTime(),
    });
  }
```

- [ ] **Step 4: Calcular dias visíveis + faixas travadas; remover `businessHours`**

Remover o memo `businessHours` (o bloco `const businessHours = useMemo(... [hours]);`). Em seguida, logo após a definição de `slotMinTime`/`slotMaxTime`, adicionar:
```ts
  const visibleDays = useMemo(() => {
    if (!range) return [] as Date[];
    const days: Date[] = [];
    const cursor = new Date(range.startMs);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getTime() < range.endMs) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [range]);

  const lockedBands = useMemo<Interval[]>(() => {
    if (!viewType.startsWith("timeGrid")) return [];
    return computeLockedBands(visibleDays, hours, overrides, new Date(now), slotMinTime, slotMaxTime);
  }, [viewType, visibleDays, hours, overrides, now, slotMinTime, slotMaxTime]);
```

- [ ] **Step 5: Trocar o past-bg pelas faixas no memo `events`**

Substituir o bloco que empurra o `fc-past-bg` (o `if (range) { ... display: "background" ... fc-past-bg ... }`) por:
```ts
    for (const band of lockedBands) {
      list.push({
        start: band.start.toISOString(),
        end: band.end.toISOString(),
        display: "background",
        classNames: ["fc-locked-bg"],
      });
    }
    return list;
```
E ajustar o array de deps do memo `events` de `[appointments, colorMode, now, settings, range]` para `[appointments, colorMode, now, settings, lockedBands]`.

- [ ] **Step 6: Travar `selectAllow` e adicionar `eventAllow`**

Trocar o `selectAllow` atual por (e adicionar `eventAllow` logo abaixo do `editable`):
```tsx
          selectAllow={(span) =>
            viewType.startsWith("timeGrid")
              ? isAvailable(span.start, span.end, hours, overrides, new Date(now), slotMinTime, slotMaxTime)
              : span.start.getTime() >= Date.now()
          }
          eventAllow={(dropInfo) =>
            viewType.startsWith("timeGrid")
              ? isAvailable(dropInfo.start, dropInfo.end, hours, overrides, new Date(now), slotMinTime, slotMaxTime)
              : true
          }
```
E remover a prop `businessHours={businessHours}` da `<FullCalendar />`.

- [ ] **Step 7: Validar a API do FullCalendar (C7)**

Consultar via Context7 (MCP) a doc do FullCalendar 6 para confirmar as assinaturas de `selectAllow(span, movingEvent)`, `eventAllow(dropInfo, draggedEvent)` e o uso de eventos `display: "background"`. Ajustar se divergir.

- [ ] **Step 8: Typecheck + lint**

Run:
```bash
pnpm -C web exec tsc --noEmit
pnpm -C web lint
```
Expected: tsc limpo; lint ≤ baseline (sem `set-state-in-effect` novo — `setViewType` é callback de evento, não efeito).

- [ ] **Step 9: Verificar no Playwright (MCP) — Semana e Dia**

Subir/usar o dev server :3001. Mockar `/auth/me`, `/services`, `/hours` (com um dia `isOff`, um dia com break de almoço 12:00–13:00), `/overrides` (um feriado `isOff` numa data da semana visível), `/settings`, `/appointments`. Verificar:
- Domingo `isOff` → coluna inteira cinza; clicar nela **não** abre o create.
- Dia com almoço → faixa cinza 12:00–13:00; clicar nela não abre o create.
- Antes da abertura / depois do fechamento → cinza; passado de hoje → cinza; **um cinza só** (sem região mais escura por empilhamento).
- Futuro dentro do expediente → fundo normal (preto), clicar abre o create.
- Arrastar um agendamento ativo para dentro do cinza → reverte.
- Trocar para a view **Dia**: mesmo comportamento. Trocar para **Mês**: sem faixas (sem regressão), 0 erro de console. Screenshots claro/escuro.

- [ ] **Step 10: Commit**

```bash
git add web/src/components/tenant/agenda/agenda-calendar.tsx web/src/app/globals.css
git commit -m "feat(web): agenda sombreia e trava horários indisponíveis (passado/fechado/feriado/fora do expediente/almoço)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Fase 4 — W2: layout bento (Opção A)

**Files:**
- Modify: `web/src/app/[tenant]/horarios/page.tsx`
- Modify: `web/src/components/ui/bento.tsx` (se necessário p/ `row-span`)

- [ ] **Step 1: Largura + spans (Opção A)**

Em `page.tsx`, trocar o container e os spans dos cards. Container:
```tsx
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
```
Cards no `<Bento>` (Semana vira trilha alta `row-span-2`; Exceções e Triagem dividem a linha de baixo à direita):
```tsx
      <Bento>
        <WeekCard className="h-fit lg:col-span-2 lg:row-span-2" selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <DayEditorCard
          key={editorKey}
          className="h-fit lg:col-span-4"
          dayOfWeek={selectedDay}
          current={current}
          allHours={hours}
          onReload={reloadHours}
        />
        <OverridesCard className="h-fit lg:col-span-2" />
        <TriageSettingsCard
          key={`${settings.statusPromptAfterStartMin}-${settings.overdueAfterEndMin}`}
          className="lg:col-span-2"
          initial={settings}
          onSaved={reloadSettings}
        />
      </Bento>
```

- [ ] **Step 2: Garantir que o grid suporta `row-span`**

Abrir `web/src/components/ui/bento.tsx`. Se o grid já é `grid-cols-1 lg:grid-cols-6 gap-4` sem `auto-rows` fixo, `row-span-2` já funciona — sem mudança. Se houver algo que force a altura das linhas, ajustar para deixar as linhas implícitas com altura automática (não introduzir hex/estilo fora de token).

- [ ] **Step 3: Typecheck + lint**

Run:
```bash
pnpm -C web exec tsc --noEmit
pnpm -C web lint
```
Expected: limpos.

- [ ] **Step 4: Calibrar ao vivo (Playwright/MCP)**

Na :3001, abrir `/[tenant]/horarios`. Conferir: sem **vão** abaixo do editor (a Semana alta preenche a coluna esquerda nas 2 linhas; Exceções+Triagem fecham a linha de baixo à direita), menos espaço lateral, claro/escuro, 0 erro de console. Ajustar `max-w-7xl`/spans se a altura da Semana destoar muito (tunável). Screenshot antes/depois.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/[tenant]/horarios/page.tsx web/src/components/ui/bento.tsx
git commit -m "feat(web): layout bento de Horários sem vão (Semana como trilha) + largura" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Fase 5 — W3: remover Combobox + Base UI (reverte exceção)

**Files:**
- Delete: `web/src/components/ui/combobox.tsx`
- Modify: `web/package.json`
- Modify: `CLAUDE.md`, `web/src/components/ui/CLAUDE.md`, `web/src/components/tenant/horarios/CLAUDE.md`

- [ ] **Step 1: Confirmar 0 imports (guard)**

Run (Grep/rg):
```bash
git -C "F:/1-ZECA/1-Repositorio/Documentos/MeusProjetos/AgendamentoAPI" grep -n "ui/combobox\|@base-ui" -- web/src
```
Expected: só `web/src/components/ui/combobox.tsx` e menções em CLAUDE.md — nenhum import de componente. Se aparecer import real, **parar** (o pressuposto mudou).

- [ ] **Step 2: Apagar o primitivo e remover a dep**

```bash
git rm web/src/components/ui/combobox.tsx
pnpm -C web remove @base-ui/react
```

- [ ] **Step 3: Atualizar as docs**

- `web/src/components/ui/CLAUDE.md`: remover a linha que autoriza Base UI para o combobox.
- `web/src/components/tenant/horarios/CLAUDE.md`: remover `Combobox` da lista de "Reusar …".
- `CLAUDE.md` (raiz), em **Exceções aprovadas**, marcar a entrada do Base UI como revertida:
```markdown
- ~~**UI: Base UI (`@base-ui/react`) para o `combobox`**~~ — **revertida em 2026-06-15** (combobox
  sem uso após o bento de Horários; `@base-ui/react` removido). Canon de UI volta a **Radix** puro.
```

- [ ] **Step 4: Typecheck + lint + commit**

Run:
```bash
pnpm -C web exec tsc --noEmit
pnpm -C web lint
```
Expected: limpos (nada importava o combobox). Então:
```bash
git add -A
git commit -m "refactor(web): remove Combobox + @base-ui/react (reverte exceção de stack → Radix puro)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Fase 6 — W4: editar exceção de data in-place

**Files:**
- Modify: `web/src/components/tenant/horarios/overrides-card.tsx`

- [ ] **Step 1: Estado de edição + mutation de update**

No `OverridesCard`, adicionar o estado de edição e a mutation `PUT`. Adicionar `Pencil` aos imports de `lucide-react`. Estado (junto dos demais `useState`):
```tsx
  const [editing, setEditing] = useState<BusinessDateOverride | null>(null);
```
> Como o form precisa reinicializar ao entrar/sair de edição sem `useEffect` de sync, extrair o conteúdo do form para um subcomponente `OverrideForm` **keyed por `editing?.id ?? "new"`** (padrão keyed-remount do projeto). O `OverrideForm` recebe `initial: BusinessDateOverride | null`, `onDone: () => void`. Importar o tipo: `import type { BusinessDateOverride } from "@/components/tenant/types";`.

- [ ] **Step 2: O `OverrideForm` (criar e editar)**

Estrutura do subcomponente (dentro do mesmo arquivo). Em modo edição (`initial != null`): a data fica **read-only** (label + texto, sem `Calendar`) com aviso; `PUT /overrides/:id`. Em modo criação: igual ao atual (`Calendar` + `POST /overrides`).
```tsx
function OverrideForm({
  initial,
  onDone,
}: {
  initial: BusinessDateOverride | null;
  onDone: () => void;
}) {
  const { reloadOverrides } = useTenant();
  const [date, setDate] = useState<Date | undefined>(initial ? new Date(`${initial.date}T00:00:00`) : undefined);
  const [closed, setClosed] = useState(initial ? initial.isOff || !initial.openTime : true);
  const [openTime, setOpenTime] = useState(initial?.openTime ?? "");
  const [closeTime, setCloseTime] = useState(initial?.closeTime ?? "");
  const [calOpen, setCalOpen] = useState(false);
  const isEdit = initial != null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new ApiError("Escolha uma data", 400);
      const body: { date?: string; isOff?: boolean; openTime?: string; closeTime?: string } = {};
      if (!isEdit) body.date = format(date, "yyyy-MM-dd");
      if (closed) {
        body.isOff = true;
      } else {
        if (!openTime || !closeTime) throw new ApiError("Informe abertura e fechamento", 400);
        body.isOff = false;
        body.openTime = openTime;
        body.closeTime = closeTime;
      }
      if (isEdit) {
        await apiRequest(`/overrides/${initial!.id}`, { method: "PUT", body });
      } else {
        await apiRequest("/overrides", { method: "POST", body });
      }
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Exceção atualizada" : "Exceção salva");
      await reloadOverrides();
      onDone();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro ao salvar exceção"),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Data</Label>
        {isEdit ? (
          <p className="text-muted-foreground font-mono text-sm">
            {date ? format(date, "dd 'de' MMM yyyy", { locale: ptBR }) : ""}
            <span className="ml-2 text-xs">(trocar data = excluir e recriar)</span>
          </p>
        ) : (
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn("w-full justify-start gap-2 font-normal", !date && "text-muted-foreground")}
              >
                <CalendarOff className="size-4 shrink-0" />
                {date ? format(date, "dd 'de' MMM yyyy", { locale: ptBR }) : "Escolher data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setCalOpen(false); }} locale={ptBR} autoFocus />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Label className="flex items-center gap-2 text-sm">
        <Checkbox checked={closed} onCheckedChange={(c) => setClosed(!!c)} className="size-4" />
        Fechado neste dia
      </Label>

      {!closed ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Abre</Label>
            <HourPicker value={openTime} onChange={setOpenTime} aria-label="Hora de abertura" />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <HourPicker value={closeTime} onChange={setCloseTime} aria-label="Hora de fechamento" />
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1">
          <Plus className="size-4" /> {saveMutation.isPending ? "Salvando..." : isEdit ? "Salvar alteração" : "Adicionar exceção"}
        </Button>
        {isEdit ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Compor o form keyed + botão de editar na linha**

No corpo do `OverridesCard`, trocar o form inline atual por:
```tsx
        <OverrideForm key={editing?.id ?? "new"} initial={editing} onDone={() => setEditing(null)} />
```
E em cada linha da lista (antes do `AlertDialog` de excluir), adicionar o botão de editar:
```tsx
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setEditing(o)}
                  aria-label="Editar exceção"
                >
                  <Pencil className="size-4" />
                </Button>
```
> Remover do `OverridesCard` o estado/mutations antigos que foram para o `OverrideForm` (date/closed/openTime/closeTime/calOpen/createMutation). Manter `overrides`/`reloadOverrides`, `deleteMutation`, `sorted` e o `AlertDialog`.

- [ ] **Step 4: Typecheck + lint**

Run:
```bash
pnpm -C web exec tsc --noEmit
pnpm -C web lint
```
Expected: limpos.

- [ ] **Step 5: Verificar no Playwright (MCP)**

Na :3001, em `/[tenant]/horarios`: criar exceção (POST, intacto); clicar no lápis de uma exceção → form carrega com a **data travada**; alternar Fechado/horário e salvar → `PUT /overrides/:id`, lista atualiza; "Cancelar" sai do modo edição; excluir (AlertDialog) intacto. 0 erro de console.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/tenant/horarios/overrides-card.tsx
git commit -m "feat(web): editar exceção de data in-place (PUT /overrides/:id, data travada)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Fase 7 — Verificação final (quality gate)

- [ ] **Step 1: Gate completo**

Run (do worktree main, branch `feat/horarios-controle-total`):
```bash
pnpm -C api exec tsc -p tsconfig.json --noEmit
pnpm -C api test
pnpm -C web exec tsc --noEmit
pnpm -C web lint
pnpm -C web test
```
Expected: tudo verde; web lint ≤ baseline; sem `any`/hex/`set-state-in-effect` novo.

- [ ] **Step 2: Smoke E2E (Playwright/MCP)**

Repassar os cenários-chave: W1 (cinza+trava em Semana e Dia, um cinza só, Mês sem regressão), W2 (bento sem vão, claro/escuro), W4 (editar exceção). 0 erro de console em todas.

- [ ] **Step 3: Resumo final**

Reportar o que foi feito por fase, com a evidência de cada verificação (saídas dos comandos + observações do Playwright). Listar follow-ups que continuam abertos (Mês na agenda — priorizado; fuso correto; `minLeadTimeMinutes` no lock; bloqueio pontual por data).

---

## Self-review (cobertura da spec)

- **W1 disponibilidade** → Fases 2 (helper+testes) e 3 (integração). ✔
- **Regra espelha `resolveBusinessForDay`** → `effectiveHoursForDate` + teste do override especial herdando breaks. ✔
- **Um cinza só / sem empilhamento** → `computeLockedBands` (complemento sem sobreposição) + teste + verificação visual. ✔
- **`selectAllow`+`eventAllow`** → Fase 3 Step 6. ✔
- **Só timeGrid; Mês follow-up** → guard `viewType.startsWith("timeGrid")` + verificação Mês sem regressão. ✔
- **TDD via Vitest no web** → Fase 1 + Fase 2. ✔
- **W2 Opção A + max-w-7xl** → Fase 4. ✔
- **W3 remover Base UI + reverter exceção + docs** → Fase 5. ✔
- **W4 editar in-place, data travada** → Fase 6. ✔
- **Topologia (commit WIP primeiro)** → Fase 0. ✔
