import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { icon: "size-5", text: "text-xl" },
  md: { icon: "size-6", text: "text-2xl" },
  lg: { icon: "size-7", text: "text-3xl" },
} as const;

/**
 * Marca "Agendamento" (ícone + display). Herda a cor do contexto (currentColor),
 * então funciona tanto sobre fundo claro quanto sobre o painel escuro.
 * Passe `href={null}` para renderizar sem link.
 */
export function Wordmark({
  size = "md",
  href = "/",
  className,
}: {
  size?: keyof typeof sizes;
  href?: string | null;
  className?: string;
}) {
  const s = sizes[size];
  const content = (
    <span className={cn("inline-flex items-center gap-2 leading-none", className)}>
      <CalendarClock className={s.icon} />
      <span className={cn("font-display", s.text)}>Agendamento</span>
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
