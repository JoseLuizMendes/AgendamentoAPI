import { apiRequest } from "./api";

/**
 * Sessão de auth vive num cookie httpOnly (definido pela API no login/signup) — o JS
 * não lê o token. Logout = pedir à API para limpar o cookie.
 */
export async function logout(): Promise<void> {
  await apiRequest("/auth/logout", { method: "POST" });
}
