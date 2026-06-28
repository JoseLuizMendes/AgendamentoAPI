import type { BusinessDateOverride } from "@/components/tenant/types";

/**
 * Exceções de hoje em diante (oculta datas já passadas), ordenadas asc.
 *
 * NOTA DE DECISÃO (2026-06-19): por ora apenas **ocultamos** as exceções vencidas — o
 * registro continua no banco (não-destrutivo). Avaliar depois um DELETE automático/cron
 * para limpar exceções passadas. Datas em "YYYY-MM-DD" → compara como string (ISO ordena
 * lexicograficamente). `todayYmd` deve ser a data local de hoje.
 */
export function upcomingOverrides(
  overrides: BusinessDateOverride[],
  todayYmd: string,
): BusinessDateOverride[] {
  return overrides
    .filter((o) => o.date >= todayYmd)
    .sort((a, b) => a.date.localeCompare(b.date));
}
