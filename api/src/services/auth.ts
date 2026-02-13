import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ConflictError, UnauthorizedError } from "../utils/errors.js";
import type { SignupInput, LoginInput } from "../schemas/index.js";

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

  if (!tenant) {
    throw new UnauthorizedError("Credenciais inválidas");
  }

  // Find user by email and tenantId
  const user = await prisma.user.findUnique({
    where: {
      email_tenantId: {
        email: data.email,
        tenantId: tenant.id,
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError("Credenciais inválidas");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError("Credenciais inválidas");
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
