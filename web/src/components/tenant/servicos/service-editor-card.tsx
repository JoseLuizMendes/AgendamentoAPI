"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Upload, X } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { uploadServiceImage } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Service } from "@/components/tenant/types";

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Editor de serviço (criar ou editar). Remontado por `key` no pai → estado inicial fresco de
 * `selected`, sem useEffect de sync. POST quando novo; PUT `/services/:id` quando editando.
 *
 * A imagem só sobe ao **salvar** (preview local via object URL antes disso). Isso garante
 * 1 upload por serviço salvo e evita assets órfãos no Cloudinary quando se re-escolhe o arquivo.
 */
export function ServiceEditorCard({
  selected,
  onSelect,
  onSaved,
  className,
}: {
  selected: Service | null;
  onSelect: (id: number | null) => void;
  onSaved: () => Promise<void>;
  className?: string;
}) {
  const isEdit = selected != null;
  const [name, setName] = useState(selected?.name ?? "");
  const [description, setDescription] = useState(selected?.description ?? "");
  const [imageUrl, setImageUrl] = useState(selected?.imageUrl ?? ""); // URL já hospedada (remota)
  const [pendingFile, setPendingFile] = useState<File | null>(null); // arquivo escolhido, ainda não enviado
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // object URL local p/ preview
  const [priceReais, setPriceReais] = useState(selected ? centsToReais(selected.priceInCents) : "");
  const [duration, setDuration] = useState(selected?.durationInMinutes ?? 30);
  const fileRef = useRef<HTMLInputElement>(null);

  // Revoga o object URL do preview ao trocá-lo/desmontar (gestão de recurso externo, não fetch).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Sobe a imagem só agora (1 upload por save). Sem arquivo novo → mantém a URL atual.
      const finalImageUrl = pendingFile ? await uploadServiceImage(pendingFile) : imageUrl || null;
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        imageUrl: finalImageUrl,
        priceInCents: Math.round(Number(priceReais.replace(",", ".")) * 100),
        durationInMinutes: duration,
      };
      return selected
        ? apiRequest(`/services/${selected.id}`, { method: "PUT", body })
        : apiRequest("/services", { method: "POST", body });
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Serviço atualizado" : "Serviço criado");
      if (!isEdit) {
        setName("");
        setDescription("");
        setPriceReais("");
        setDuration(30);
        setImageUrl("");
        setPendingFile(null);
        setPreviewUrl(null);
      }
      await onSaved();
    },
    onError: (err) => toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar"),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file) return;
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file)); // só preview; o upload acontece no save
  }

  function removeImage() {
    setPendingFile(null);
    setPreviewUrl(null);
    setImageUrl("");
  }

  function save() {
    const priceInCents = Math.round(Number(priceReais.replace(",", ".")) * 100);
    if (!name.trim()) return toast.error("Informe o nome do serviço");
    if (!Number.isFinite(priceInCents) || priceInCents < 0) return toast.error("Preço inválido");
    if (!Number.isInteger(duration) || duration < 1) return toast.error("Duração inválida");
    saveMutation.mutate();
  }

  const shownImage = previewUrl ?? (imageUrl || null);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle className="font-display text-xl tracking-wide">
              {isEdit ? "Editar serviço" : "Novo serviço"}
            </CardTitle>
            <CardDescription>Procedimento com preço, duração, descrição e imagem.</CardDescription>
          </div>
          {isEdit ? (
            <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
              <Plus className="size-4" /> Novo
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="svc-name">Nome</Label>
          <Input
            id="svc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Limpeza de pele"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="svc-desc">Descrição</Label>
          <Textarea
            id="svc-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes do procedimento (opcional)"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Imagem</Label>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
          {shownImage ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shownImage} alt="Prévia do serviço" className="size-16 rounded-lg border object-cover" />
              <div className="flex flex-col items-start gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" /> Trocar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
                  <X className="size-4" /> Remover
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Enviar imagem
            </Button>
          )}
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
            <Input
              id="svc-dur"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
        </div>

        <Button onClick={save} disabled={saveMutation.isPending} className="w-full sm:w-auto">
          {isEdit ? <Save className="size-4" /> : <Plus className="size-4" />}
          {saveMutation.isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar serviço"}
        </Button>
      </CardContent>
    </Card>
  );
}
