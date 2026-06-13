"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Plus, RefreshCw, Tag } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { useTenant } from "@/components/tenant/tenant-context";
import { EmptyState, formatBRL } from "@/components/tenant/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ServicosPage() {
  const { services, reloadServices } = useTenant();
  const [name, setName] = useState("");
  const [priceReais, setPriceReais] = useState("");
  const [duration, setDuration] = useState(30);

  const createMutation = useMutation({
    mutationFn: (body: { name: string; priceInCents: number; durationInMinutes: number }) =>
      apiRequest("/services", { method: "POST", body }),
    onSuccess: async () => {
      toast.success("Serviço criado");
      setName("");
      setPriceReais("");
      setDuration(30);
      await reloadServices();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Erro inesperado"),
  });

  function createService() {
    const priceInCents = Math.round(Number(priceReais.replace(",", ".")) * 100);
    if (!name.trim()) return toast.error("Informe o nome do serviço");
    if (!Number.isFinite(priceInCents) || priceInCents < 0) return toast.error("Preço inválido");
    createMutation.mutate({ name: name.trim(), priceInCents, durationInMinutes: duration });
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-display text-xl tracking-wide">Novo serviço</CardTitle>
            <CardDescription>Procedimento com preço e duração.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Nome</Label>
              <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Limpeza de pele" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="svc-price">Preço</Label>
                <div className="border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex h-9 items-center rounded-md border bg-transparent pl-3 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                  <span className="text-muted-foreground select-none text-sm">R$</span>
                  <input
                    id="svc-price"
                    inputMode="decimal"
                    value={priceReais}
                    onChange={(e) => setPriceReais(e.target.value)}
                    placeholder="0,00"
                    className="placeholder:text-muted-foreground h-full w-full bg-transparent px-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-dur">Duração (min)</Label>
                <Input id="svc-dur" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
            </div>
            <Button onClick={createService} disabled={createMutation.isPending} className="w-full">
              <Plus className="size-4" /> {createMutation.isPending ? "Criando..." : "Criar serviço"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-display text-xl tracking-wide">Serviços ({services.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={reloadServices}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.length === 0 ? (
              <EmptyState icon={Tag}>Nenhum serviço cadastrado.</EmptyState>
            ) : (
              services.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1.5 text-xs">
                      <Clock className="size-3.5" />
                      {s.durationInMinutes} min
                    </p>
                  </div>
                  <span className="font-display shrink-0 text-2xl tracking-wide">{formatBRL(s.priceInCents)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
