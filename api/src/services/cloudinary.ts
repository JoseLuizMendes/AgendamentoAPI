import crypto from "node:crypto";

/**
 * Assinatura de upload do Cloudinary (signed upload), sem SDK.
 *
 * Algoritmo (doc oficial — authentication_signatures): serializa os parâmetros a assinar
 * como `chave=valor` ordenados alfabeticamente e unidos por `&`, anexa o `api_secret` ao
 * final (sem separador) e aplica SHA-1 (hex). Pura e testável.
 */
export function signUploadParams(
  paramsToSign: Record<string, string | number>,
  apiSecret: string,
): string {
  const serialized = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(serialized + apiSecret).digest("hex");
}

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadFolder?: string;
  allowedFormats?: string; // ex.: "jpg,png,webp" — restringe o tipo de arquivo no upload assinado
};

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder?: string;
  allowedFormats?: string;
};

/**
 * Monta o payload que o browser usa para enviar o arquivo direto ao Cloudinary.
 * O `api_secret` nunca sai do servidor — só a assinatura derivada dele.
 */
export function buildUploadSignature(
  cfg: CloudinaryConfig,
  now: () => number = () => Math.floor(Date.now() / 1000),
): UploadSignature {
  const timestamp = now();
  const paramsToSign: Record<string, string | number> = { timestamp };
  if (cfg.uploadFolder) paramsToSign.folder = cfg.uploadFolder;
  if (cfg.allowedFormats) paramsToSign.allowed_formats = cfg.allowedFormats;

  const signature = signUploadParams(paramsToSign, cfg.apiSecret);

  const result: UploadSignature = {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    timestamp,
    signature,
  };
  if (cfg.uploadFolder) result.folder = cfg.uploadFolder;
  if (cfg.allowedFormats) result.allowedFormats = cfg.allowedFormats;
  return result;
}
