import { redirect } from "next/navigation";

/** Índice do workspace → redireciona para a Agenda. */
export default async function TenantIndex({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  redirect(`/${tenant}/agenda`);
}
