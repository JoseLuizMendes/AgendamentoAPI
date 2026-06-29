import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { GridLines } from "@/components/brand/grid-lines";
import { Button } from "@/components/ui/button";

/**
 * Página 404 (App Router `not-found.tsx`) — mostrada quando a rota/recurso não existe
 * (ou via `notFound()`). Diferente de `error.tsx`, que cobre crash em runtime.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <GridLines className="opacity-30" />

      <div className="absolute left-6 top-6 lg:left-10 lg:top-8">
        <Wordmark size="sm" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <span className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Erro 404</span>
        <p className="font-display text-[clamp(5rem,18vw,11rem)] leading-none tracking-wide">404</p>
        <h1 className="font-display mt-2 text-3xl tracking-wide">Página não encontrada</h1>
        <p className="text-muted-foreground mt-3 max-w-md">
          A página que você procura não existe ou foi movida.
        </p>
        <Button asChild size="lg" className="group mt-8 h-12 rounded-full px-8 text-base">
          <Link href="/">
            <ArrowLeft className="mr-1 size-4 transition-transform group-hover:-translate-x-1" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </main>
  );
}
