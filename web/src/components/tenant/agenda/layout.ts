import type { ToolbarInput } from "@fullcalendar/core";

/**
 * Configuração responsiva da agenda (view inicial + toolbar).
 *
 * - **Desktop (`isMobile === false`):** abre na semana (`timeGridWeek`) com a toolbar completa
 *   (navegação + "Novo" + alternância semana/dia/mês).
 * - **Mobile (`isMobile === true`):** abre na lista por dia (`listWeek`, estilo "Agenda" do
 *   Google/Samsung), com toolbar enxuta que alterna só entre lista e a grade "Dia" — evitando os
 *   7 dias espremidos da semana e o overflow de botões em telas estreitas. O "Novo" sai da toolbar
 *   (vira ação fora da grade) para não estourar a largura.
 *
 * Pura e sem dependência de DOM → testável (Vitest). Quem decide o `isMobile` é o `useIsMobile`.
 */
export function calendarLayout(isMobile: boolean): {
  initialView: string;
  headerToolbar: ToolbarInput;
} {
  if (isMobile) {
    return {
      initialView: "listWeek",
      headerToolbar: { left: "prev,next", center: "title", right: "listWeek,timeGridDay" },
    };
  }
  return {
    initialView: "timeGridWeek",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "novo timeGridWeek,timeGridDay,dayGridMonth",
    },
  };
}
