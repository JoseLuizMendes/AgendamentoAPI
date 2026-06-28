import { apiRequest } from "@/lib/api";

// Upload de imagem via fluxo ASSINADO (alinhado à arquitetura: credenciais só no backend).
// 1) pede a assinatura à nossa API (GET /uploads/signature) — o api_secret nunca sai do servidor;
// 2) envia o arquivo direto ao Cloudinary com a assinatura.

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder?: string;
  allowedFormats?: string;
};

/** Envia o arquivo ao Cloudinary (assinado pela nossa API) e devolve a `secure_url`. */
export async function uploadServiceImage(file: File): Promise<string> {
  const sig = await apiRequest<UploadSignature>("/uploads/signature");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  if (sig.folder) form.append("folder", sig.folder);
  // Deve casar exatamente com o que foi assinado pelo servidor, senão o Cloudinary rejeita.
  if (sig.allowedFormats) form.append("allowed_formats", sig.allowedFormats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Falha no upload da imagem");

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Resposta inválida do Cloudinary");
  return data.secure_url;
}
