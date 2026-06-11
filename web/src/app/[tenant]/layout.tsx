import { TenantProvider } from "@/components/tenant/tenant-context";
import { AppShell } from "@/components/tenant/app-shell";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <AppShell>{children}</AppShell>
    </TenantProvider>
  );
}
