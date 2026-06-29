# Horários — lock/shade da agenda + follow-ups (design)

> Spec de brainstorming. Empilha sobre o plano "Página de Horários: controle total" (bento),
> hoje implementado como **WIP sem commit** na worktree `main`. Segue o `CLAUDE.md` raiz
> (Stack Congelada, C1–C8, Layered, TDD/C5). Data: 2026-06-15.

## 1. Contexto & estado atual (verificado lendo a `main`)

- O bento de Horários (Fases A–3 do plano anterior) está **implementado, porém sem commit**, na
  worktree `main` (14 arquivos). Esta spec **assume essa base** e empilha por cima.
- **Agenda** (`web/src/components/tenant/agenda/agenda-calendar.tsx`): o `businessHours` do
  FullCalendar vem **só** dos `hours` semanais (exclui `isOff`); **ignora overrides (feriados) e
  breaks (almoço)**. O passado é sombreado por **um** bg-event `fc-past-bg`
  (`--muted-foreground @ 8%`) e a seleção no passado é travada por
  `selectAllow(span ⇒ span.start ≥ now)`. **Dia fechado (`isOff`) NÃO é travado** — só ganha o
  sombreado fraco padrão do FC; dá pra clicar/criar nele.
- **Backend** (`api/src/services/availability.ts` → `resolveBusinessForDay`): fonte da verdade do
  expediente efetivo por data. Override vence (`isOff`/sem horas ⇒ fechado; senão open/close do
  override + **breaks herdados do dia da semana**); senão o dia da semana (ausente/`isOff` ⇒
  fechado). Tudo no fuso do tenant.
- **Contexto do front** (`useTenant`): já expõe `hours` (com `breaks`), `overrides`, `settings`
  (`timezone`, `minLeadTimeMinutes`). → **W1 é 100% frontend** (nenhuma mudança de API).
- **Combobox/Base UI**: `web/src/components/ui/combobox.tsx` (sobre `@base-ui/react`) **não é
  importado por nenhum componente** (o day-editor usa `Input` pro rótulo do break). Removível →
  reverte a exceção de stack.
- **Overrides** (`web/src/components/tenant/horarios/overrides-card.tsx`): hoje só criar + excluir.
  Backend tem `PUT /overrides/:id` que atualiza `isOff`/`openTime`/`closeTime` — **não** muda `date`.

## 2. Escopo

- **W1** — Sombreado + trava de disponibilidade na agenda (regra unificada).
- **W2** — Layout bento (largura + vão) — **Opção A** (Semana como trilha alta à esquerda).
- **W3** — Remover Combobox + Base UI (reverte a exceção de stack → 100% Radix).
- **W4** — Editar exceção de data in-place.

### Fora de escopo (follow-ups documentados)
- **Mês** (`dayGridMonth`): aplicar o sombreado/lock como célula-dia acinzentada (fechado/passado/
  feriado). **Decisão do dev: incluir em breve** — é o próximo follow-up priorizado.
- Fuso correto de ponta a ponta (usar `settings.timezone` + `timeZone` do FullCalendar) — hoje a
  agenda opera em horário local do navegador.
- Honrar `minLeadTimeMinutes` no shade/lock (backend continua enforce no POST/PATCH).
- Bloqueio de intervalo pontual por data (emergência parcial num dia) — exige modelo/endpoint novo.
- Copiar os intervalos no "copiar para"; editar break in-place; trocar a **data** de uma exceção
  (hoje = excluir+recriar).

## 3. W1 — Disponibilidade na agenda

### Regra (espelha `resolveBusinessForDay`)
Para cada data `D` visível:
1. `override = overrides[D]` (match por `date` "YYYY-MM-DD"):
   - existe e (`isOff` **ou** sem `openTime`/`closeTime`) ⇒ **fechado** (dia todo travado);
   - existe e com horas ⇒ efetivo `{ open: override.openTime, close: override.closeTime, breaks:
     breaksDoDiaDaSemana(D) }`.
2. senão `weekly = hours[weekdayOf(D)]`:
   - ausente **ou** `isOff` ⇒ **fechado**;
   - senão efetivo `{ open, close, breaks }` do weekly.

Disponível em `D` = `[max(open, agora), close]` **menos** cada break (só no futuro). Travado =
complemento dentro de `[slotMinTime, slotMaxTime]`.

### Helper novo — `web/src/components/tenant/agenda/availability.ts` (lógica pura)
- `effectiveHoursForDate(dateISO, hours, overrides): { open: string; close: string; breaks:
  {start,end}[] } | null`.
- `computeLockedBands(days: Date[], hours, overrides, now: Date, slotMin: string, slotMax: string):
  { start: Date; end: Date }[]` — por dia, calcula os intervalos **disponíveis** (futuro ∩
  expediente − breaks) e devolve o **complemento mesclado** (sem sobreposição) como faixas
  travadas. "Passado" cai naturalmente aqui (corte por `now`).
- `isAvailable(start: Date, end: Date, hours, overrides, now: Date): boolean` — `[start,end]` cabe
  inteiro num intervalo disponível (mesma base do `computeLockedBands`). Usado por `selectAllow` e
  `eventAllow`.
- Sem React, sem I/O → unit-testável.

### Mudanças em `agenda-calendar.tsx`
- Trocar o único `fc-past-bg` pelas **N faixas** de `computeLockedBands` (bg-events), todas com a
  **mesma classe cinza**. Renomear `fc-past-bg` → `fc-locked-bg` no `globals.css` (passado deixa de
  ser caso especial). Conjunto sem sobreposição ⇒ **cinza uniforme** (corrige o empilhamento de
  opacidade latente do approach atual).
- `selectAllow = (span) => isAvailable(span.start, span.end, …)` (trava **criar** em qualquer cinza).
- Adicionar `eventAllow = (dropInfo) => isAvailable(dropInfo.start, dropInfo.end, …)` (trava
  **arrastar/redimensionar** pra dentro do cinza). Mover pra slot livre continua ok.
- Remover o `businessHours` visual (ou `--fc-non-business-color: transparent`) pra **não competir**
  com as faixas → um cinza só. **Disponível = sem faixa = fundo normal (preto), clicável.**
- Recalcular as faixas via `useMemo` quando muda `range`, `hours`, `overrides` ou `now` (o tick de
  minuto já existe) — **sem `useEffect` de fetch**.
- Vale em `timeGridWeek` e `timeGridDay`. No `dayGridMonth` **não** aplicar agora (follow-up);
  garantir que as faixas timeGrid não vazem pro mês.

### Notas
- **Fuso:** o helper opera em horário **local do navegador** (consistente com como os eventos já
  renderizam hoje). Assume tenant ≈ navegador. Backend continua o juiz final no POST/PATCH, então o
  cinza é UX, não regra. (tz-correto = follow-up.)
- **`now`:** fronteira do passado = `Date.now()` (igual hoje; `minLeadTimeMinutes` segue server-side).
- **C7:** validar via Context7 as APIs do FullCalendar usadas (`selectAllow`, `eventAllow`,
  bg-events/`display:"background"`, `--fc-non-business-color`) antes de codar.

### TDD (C5)
- **Adicionar Vitest ao `web`**: devDep `vitest` + script `"test": "vitest run"` (sem jsdom — o
  helper é função pura). Vitest é a ferramenta do **canon** (não é lib nova) — só não estava ligada
  no pacote `web`. **Registrar no `CLAUDE.md` raiz** (Exceções/registro) que o `web` passou a ter
  unit-test runner.
- `web/src/components/tenant/agenda/availability.test.ts` (RED→GREEN→REFACTOR): dia normal (faixas
  antes/depois + almoço), dia fechado (`isOff`) ⇒ dia todo, override feriado ⇒ dia todo, override de
  horário especial ⇒ horas do override + breaks do weekday, passado ⇒ travado, mescla sem
  sobreposição, `isAvailable` true/false nas bordas, dentro de break e fora do expediente.

## 4. W2 — Layout bento (Opção A)

- `web/src/app/[tenant]/horarios/page.tsx`: `max-w-6xl` → `max-w-7xl` (**só esta página**; as irmãs
  dashboard/clientes/serviços ficam em `6xl` por consistência, revisável depois).
- Arranjo no grid de 6 colunas (`lg`):
  - `Semana` — `lg:col-span-2 lg:row-span-2` (trilha alta à esquerda).
  - `Editor do dia` — `lg:col-span-4` (linha 1, direita).
  - `Exceções` — `lg:col-span-2` + `Triagem` — `lg:col-span-2` (linha 2, direita).
  - Mobile (`grid-cols-1`) empilha: Semana → Editor → Exceções → Triagem.
- Ajustar spans em `page.tsx` (e `bento.tsx` se precisar suportar `row-span`). Cada card `h-fit`/
  `items-start` pra não esticar à toa.
- **Calibrar ao vivo** (Playwright na :3001) a largura final e o equilíbrio das alturas (Semana de 7
  linhas ≈ Editor + Exceções/Triagem) — screenshots claro/escuro.

## 5. W3 — Remover Combobox + Base UI

- Apagar `web/src/components/ui/combobox.tsx`.
- `pnpm -C web remove @base-ui/react` (package.json + lockfile).
- Docs: remover a nota de exceção de `web/src/components/ui/CLAUDE.md`; remover `Combobox` da lista
  de reuso de `web/src/components/tenant/horarios/CLAUDE.md`; no `CLAUDE.md` raiz, marcar a entrada
  de **Exceções aprovadas** "UI: Base UI (`@base-ui/react`) para o combobox" como **revertida
  (2026-06-15)** (o canon de UI volta a Radix puro).
- Verificação: `grep` confirma 0 imports de `combobox`/`@base-ui`; `tsc` + `lint` limpos.

## 6. W4 — Editar exceção de data in-place

- `overrides-card.tsx`: estado `editing: BusinessDateOverride | null`. Botão de editar (lápis) em
  cada linha → carrega `isOff`/`openTime`/`closeTime` no form; **data travada** (read-only) com aviso
  "trocar data = excluir e recriar". Botão vira "Salvar alteração" + "Cancelar"; `PUT /overrides/:id`.
- Manter o keyed-remount (key pelo `editing?.id`) p/ reinit sem `useEffect`.
- Criar (sem `editing`) continua igual; exclusão via `AlertDialog` (já existe).
- Após salvar/cancelar: `reloadOverrides()`.

## 7. Topologia / sequenciamento

- A WIP do bento está **sem commit na `main`**. **Decisão do dev: commitar a WIP da `main` primeiro**
  (base limpa) antes de empilhar W1–W4.
- Como `main` é o branch default (guardrail: não commitar direto no default), o **plano de
  implementação começa por uma Fase 0** que leva a WIP do bento pra um branch e segue os follow-ups
  sobre ela. O detalhe operacional (qual worktree/branch) fica no plano (`writing-plans`).

## 8. Verificação (quality gate)

- **Backend:** W1–W4 não tocam a API. Reconfirmar `pnpm -C api exec tsc -p tsconfig.json --noEmit`
  e `pnpm -C api test` verdes na base (após o commit da WIP).
- **Web:** `pnpm -C web exec tsc --noEmit` + `pnpm -C web lint` (≤ baseline; sem `set-state-in-effect`
  novo, sem hex, sem `any`) + **`pnpm -C web test`** (Vitest do helper W1) verdes.
- **Playwright (MCP)** na :3001 (mock `/auth/me`, `/services`, `/hours` com breaks+label,
  `/overrides`, `/settings`, `/appointments`):
  - **W1:** dia fechado/feriado/almoço/passado em cinza e **não-clicáveis**; futuro no expediente
    clicável; arrastar evento pra dentro do cinza é revertido; **um cinza só** (sem empilhamento).
    Semana e Dia.
  - **W2:** bento sem vão, largura ok, claro/escuro, 0 erro de console.
  - **W4:** editar exceção (PUT) com data travada; criar/excluir intactos.

## 9. Arquivos afetados (estimativa)

- **Novos:** `web/src/components/tenant/agenda/availability.ts`,
  `web/src/components/tenant/agenda/availability.test.ts`, config Vitest do web
  (`web/vitest.config.ts` se necessário).
- **Editados:** `agenda-calendar.tsx`, `web/src/app/globals.css` (classe `fc-locked-bg`),
  `web/src/app/[tenant]/horarios/page.tsx`, `web/src/components/ui/bento.tsx` (se preciso),
  `overrides-card.tsx`, `web/package.json` (− `@base-ui/react`, + `vitest`, + script `test`),
  `CLAUDE.md` (raiz), `web/src/components/ui/CLAUDE.md`,
  `web/src/components/tenant/horarios/CLAUDE.md`.
- **Apagados:** `web/src/components/ui/combobox.tsx`.
