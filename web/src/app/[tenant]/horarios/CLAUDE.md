---
nicho: "web/src/app/[tenant]/horarios"
escopo: "Rota de Horários + config de triagem"
---

# .../horarios/

> Complementa `../CLAUDE.md` ([tenant]) e a raiz.

- `page.tsx`: form de horário de funcionamento por dia (POST `/hours`) + grade da semana, e o card
  **"Triagem de status"** (limiares `statusPromptAfterStartMin`/`overdueAfterEndMin` → PATCH
  `/settings`).
- Escritas via `useMutation` + `reloadHours()`/`reloadSettings()` (invalida as queries).
- `TriageSettingsCard` é keyed pelos valores de `settings` p/ reinit sem efeito de sync.
