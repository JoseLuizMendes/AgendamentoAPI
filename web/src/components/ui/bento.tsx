import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Grid bento reutilizável: 1 coluna no mobile, 6 colunas no `lg`. Cada filho
 * controla o próprio tamanho via `lg:col-span-*` no className.
 */
function Bento({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bento"
      className={cn("grid grid-cols-1 gap-4 lg:grid-cols-6", className)}
      {...props}
    />
  );
}

/** Célula do bento — superfície de card tokenizada. Passe `lg:col-span-*` no className. */
function BentoItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bento-item"
      className={cn(
        "flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Bento, BentoItem };
