import { z } from "zod";

/**
 * Configuração validada do ambiente (fonte única de verdade).
 *
 * Em vez de ler `process.env` espalhado pelo código, o app importa `config`.
 * `loadConfig` é exportada para permitir testes com ambientes simulados.
 */

const DEV_JWT_FALLBACK = "development-secret-change-in-production";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1).optional(),
    JWT_SECRET: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().min(1).default("0.0.0.0"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3001"),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    RATE_LIMIT_WINDOW: z.string().min(1).default("1 minute"),
    PUBLIC_HEALTH: z
      .string()
      .optional()
      .transform((v) => v !== "false"), // default true; só "false" desliga
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "JWT_SECRET é obrigatório e deve ter no mínimo 32 caracteres em produção",
        });
      }
    }
  });

export type Config = {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  databaseUrl: string | undefined;
  jwtSecret: string;
  port: number;
  host: string;
  corsOrigin: string;
  rateLimitMax: number;
  rateLimitWindow: string;
  publicHealth: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
      .join("; ");
    throw new Error(`Configuração de ambiente inválida: ${details}`);
  }

  const e = parsed.data;

  return {
    nodeEnv: e.NODE_ENV,
    isProduction: e.NODE_ENV === "production",
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET ?? DEV_JWT_FALLBACK,
    port: e.PORT,
    host: e.HOST,
    corsOrigin: e.CORS_ORIGIN,
    rateLimitMax: e.RATE_LIMIT_MAX,
    rateLimitWindow: e.RATE_LIMIT_WINDOW,
    publicHealth: e.PUBLIC_HEALTH,
  };
}

/** Config carregada uma vez a partir do ambiente do processo. */
export const config = loadConfig();
