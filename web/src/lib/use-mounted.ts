import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * `true` apenas após a hidratação no client (`false` no SSR e no 1º render do
 * client, mantendo a hidratação consistente). Substitui o padrão
 * `useEffect(() => setMounted(true), [])` sem cair no lint `set-state-in-effect`.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
