import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { UploadSignatureResponseSchema, ErrorResponseSchema } from "../schemas/index.js";
import * as cloudinaryService from "../services/cloudinary.js";
import { config } from "../config.js";
import { requireRole } from "../utils/guards.js";

export const uploadsRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /uploads/signature - Assinatura para upload direto no Cloudinary (OWNER/STAFF).
  // O api_secret nunca sai do servidor; o browser usa só a assinatura derivada.
  zApp.get(
    "/uploads/signature",
    {
      preHandler: requireRole("OWNER", "STAFF"),
      schema: {
        tags: ["Uploads"],
        description: "Assinatura de upload do Cloudinary (signed upload direto do browser).",
        response: { 200: UploadSignatureResponseSchema, 503: ErrorResponseSchema },
      },
    },
    async (_req, reply) => {
      if (!config.cloudinary) {
        return reply.status(503).send({ message: "Upload de imagem não configurado no servidor" });
      }
      return reply.send(cloudinaryService.buildUploadSignature(config.cloudinary));
    },
  );
};
