"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, CalendarDays, Clock, LayoutDashboard, LogOut, Menu, Plus, Tag, Users } from "lucide-react";

import { clearToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTenant } from "./tenant-context";

const NAV = [
  { label: "Agenda", href: "agenda", icon: CalendarDays },
  { label: "Dashboard", href: "dashboard", icon: LayoutDashboard },
  { label: "Clientes", href: "clientes", icon: Users },
  { label: "Serviços", href: "servicos", icon: Tag },
  { label: "Horários", href: "horarios", icon: Clock },
] as const;

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { me, slug } = useTenant();
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <CalendarClock className="size-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-display truncate text-lg leading-none">{me.tenant.name}</p>
          <p className="text-muted-foreground truncate font-mono text-[11px] leading-tight">/{slug}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const href = `/${slug}/${item.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-foreground text-background font-medium"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{me.email}</p>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-wide">{me.role}</p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={logout}>
            <LogOut className="size-4" /> Sair
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { slug } = useTenant();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = NAV.find((item) => pathname.startsWith(`/${slug}/${item.href}`));
  const title = current?.label ?? "Workspace";

  return (
    <div className="bg-background flex min-h-svh">
      {/* Sidebar fixa (desktop) */}
      <aside className="bg-background sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r lg:flex">
        <SidebarInner />
      </aside>

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/80 sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur lg:px-8">
          {/* Drawer mobile */}
          <div className="lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Abrir menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                <SidebarInner onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          <h1 className="font-display truncate text-xl tracking-wide">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" className="rounded-full">
              <Link href={`/${slug}/agenda`}>
                <Plus className="size-4" /> <span className="hidden sm:inline">Novo agendamento</span>
              </Link>
            </Button>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
