import { useSyncExternalStore } from "react";

/** Breakpoint do Tailwind `lg` (1024px): abaixo dele tratamos como "mobile/tablet". */
const MOBILE_QUERY = "(max-width: 1023px)";

/**
 * Assina uma media query e devolve se ela casa no momento. Usa `useSyncExternalStore`
 * (em vez de `useEffect` + `setState`) para sincronizar com um sistema externo (matchMedia)
 * sem cair no lint `set-state-in-effect` e mantendo a hidratação consistente (SSR = `false`).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** `true` em telas `< lg` (1024px) — usado para alternar a UX da agenda/dashboard para mobile. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
