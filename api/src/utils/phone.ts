/**
 * Normaliza um telefone mantendo apenas os dígitos.
 *
 * É a **chave natural** do Paciente (`@@unique([tenantId, phone])`): guardar só dígitos evita
 * duplicar paciente por causa de formatação diferente ("+55 (11) 99999-1234" vs "5511999991234").
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}
