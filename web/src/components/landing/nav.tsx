"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CalendarClock, Menu, X } from "lucide-react";

const navLinks = [
  { name: "Recursos", href: "#recursos" },
  { name: "Como funciona", href: "#como-funciona" },
  { name: "Preços", href: "#precos" },
];

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled ? "top-4 left-4 right-4" : "top-0 left-0 right-0"
      }`}
    >
      <nav
        className={`mx-auto transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? "bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
            : "bg-transparent max-w-[1400px]"
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 transition-all duration-500 lg:px-8 ${
            isScrolled ? "h-14" : "h-20"
          }`}
        >
          <Link href="/" className="flex items-center gap-2">
            <CalendarClock className={`transition-all ${isScrolled ? "size-5" : "size-6"}`} />
            <span className={`font-display leading-none transition-all duration-500 ${isScrolled ? "text-xl" : "text-2xl"}`}>
              Agendamento
            </span>
          </Link>

          <div className="hidden items-center gap-12 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="group relative text-sm text-foreground/70 transition-colors duration-300 hover:text-foreground"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/signup">Criar conta</Link>
            </Button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 md:hidden"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 bg-background transition-all duration-500 md:hidden ${
          isMobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-full flex-col px-8 pb-8 pt-28">
          <div className="flex flex-1 flex-col justify-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-display text-5xl text-foreground transition-colors hover:text-muted-foreground"
              >
                {link.name}
              </a>
            ))}
          </div>
          <div className="flex gap-4 border-t border-foreground/10 pt-8">
            <Button asChild variant="outline" className="h-14 flex-1 rounded-full text-base">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Entrar</Link>
            </Button>
            <Button asChild className="h-14 flex-1 rounded-full text-base">
              <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>Criar conta</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
