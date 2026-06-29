import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError, TooManyRequestsError, ValidationError } from "../utils/errors.js";
import type { SignupInput, LoginInput } from "../schemas/index.js";
import { config } from "../config.js";
import { createAuthToken, consumeAuthToken } from "./auth-tokens.js";
import { sendEmail, verificationEmail, passwordResetEmail } from "./mail.js";

/** Localiza um usuário por email + slug do tenant (ou null). Usado nos fluxos por email. */
async function findUserByEmailTenant(prisma: PrismaClient, email: string, tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return null;
  return prisma.user.findUnique({ where: { email_tenantId: { email, tenantId: tenant.id } } });
}

/** Cria token de verificação e envia o email (best-effort — falha de envio não quebra o fluxo). */
async function sendVerification(prisma: PrismaClient, userId: number, email: string): Promise<void> {
  try {
    const raw = await createAuthToken(prisma, userId, "EMAIL_VERIFICATION");
    const link = `${config.appBaseUrl}/verify-email?token=${raw}`;
    const { subject, html } = verificationEmail(link);
    await sendEmail({ to: email, subject, html, devLink: link });
  } catch {
    // Ignora: o usuário pode pedir reenvio depois.
  }
}

// Hash bcrypt "dummy" para comparar quando o usuário/tenant não existe — assim o login executa
// SEMPRE um `bcrypt.compare` e o tempo de resposta não revela se o email está cadastrado
// (anti-enumeração por timing). Computado uma vez no carregamento do módulo.
const DUMMY_HASH = bcrypt.hashSync("invalid-placeholder-password", 10);

/**
 * Decide o bloqueio após uma falha de login: ao atingir `maxAttempts` tentativas, bloqueia a
 * conta por `lockMinutes` (bloqueio temporário — auto-expira, evita atacante trancar a vítima
 * de propósito). Abaixo do limite, sem bloqueio. Função pura (testável isoladamente).
 */
export function computeLockout(
  failedAttempts: number,
  maxAttempts: number,
  lockMinutes: number,
  now: Date
): { lockedUntil: Date | null } {
  if (failedAttempts >= maxAttempts) {
    return { lockedUntil: new Date(now.getTime() + lockMinutes * 60_000) };
  }
  return { lockedUntil: null };
}

export async function signup(prisma: PrismaClient, data: SignupInput) {
  // Check if tenant slug already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: data.tenantSlug },
  });

  if (existingTenant) {
    throw new ConflictError("Slug do tenant já está em uso");
  }

  // Create tenant and owner user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: data.tenantName,
        slug: data.tenantSlug,
      },
    });

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create owner user
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        passwordHash,
        role: "OWNER",
        tenantId: tenant.id,
      },
    });

    return { user, tenant };
  });

  // Dispara a verificação de email (não bloqueia o cadastro se o envio falhar).
  await sendVerification(prisma, result.user.id, result.user.email);

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      tenantId: result.user.tenantId,
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
    },
  };
}

export async function login(prisma: PrismaClient, data: LoginInput) {
  // Find tenant by slug
  const tenant = await prisma.tenant.findUnique({
    where: { slug: data.tenantSlug },
  });

  // Só busca o usuário se o tenant existe; caso contrário segue com `null`.
  const user = tenant
    ? await prisma.user.findUnique({
        where: {
          email_tenantId: {
            email: data.email,
            tenantId: tenant.id,
          },
        },
      })
    : null;

  // Conta bloqueada (lockout temporário ainda válido) → recusa antes de checar a senha.
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new TooManyRequestsError(
      "Conta temporariamente bloqueada por muitas tentativas. Tente novamente mais tarde."
    );
  }

  // SEMPRE roda um compare (contra o hash real ou o dummy) → tempo constante (anti-enumeração).
  const isPasswordValid = await bcrypt.compare(data.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !isPasswordValid) {
    // Registra a falha só para usuário existente (não se tranca conta inexistente).
    if (user) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const { lockedUntil } = computeLockout(
        failedLoginAttempts,
        config.loginMaxAttempts,
        config.loginLockMinutes,
        new Date()
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts, lockedUntil },
      });
    }
    throw new UnauthorizedError("Credenciais inválidas");
  }

  // Sucesso: zera os contadores de falha se houver algo a limpar.
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

/** Confirma o email a partir do token do link. Token inválido/expirado/usado → erro. */
export async function verifyEmail(prisma: PrismaClient, rawToken: string): Promise<void> {
  const userId = await consumeAuthToken(prisma, rawToken, "EMAIL_VERIFICATION");
  if (!userId) {
    throw new ValidationError("Token de verificação inválido ou expirado");
  }
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

/** (Re)envia o email de verificação. Silencioso: não revela se o email existe. */
export async function requestEmailVerification(
  prisma: PrismaClient,
  email: string,
  tenantSlug: string
): Promise<void> {
  const user = await findUserByEmailTenant(prisma, email, tenantSlug);
  if (user && !user.emailVerifiedAt) {
    await sendVerification(prisma, user.id, user.email);
  }
}

/** Solicita redefinição de senha. Sempre resolve (anti-enumeração); só envia se o usuário existe. */
export async function requestPasswordReset(
  prisma: PrismaClient,
  email: string,
  tenantSlug: string
): Promise<void> {
  const user = await findUserByEmailTenant(prisma, email, tenantSlug);
  if (user) {
    try {
      const raw = await createAuthToken(prisma, user.id, "PASSWORD_RESET");
      const link = `${config.appBaseUrl}/reset-password?token=${raw}`;
      const { subject, html } = passwordResetEmail(link);
      await sendEmail({ to: user.email, subject, html, devLink: link });
    } catch {
      // Ignora: não vaza erro nem existência do email.
    }
  }
}

/** Conclui a redefinição: valida o token (uso único), grava a nova senha e zera o lockout. */
export async function resetPassword(
  prisma: PrismaClient,
  rawToken: string,
  newPassword: string
): Promise<void> {
  const userId = await consumeAuthToken(prisma, rawToken, "PASSWORD_RESET");
  if (!userId) {
    throw new ValidationError("Token de redefinição inválido ou expirado");
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });
}
