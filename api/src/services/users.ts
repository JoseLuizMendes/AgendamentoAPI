import type { PrismaClient, Role } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";
import bcrypt from "bcryptjs";

export async function listUsers(prisma: PrismaClient, tenantId: number) {
  return prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUser(prisma: PrismaClient, id: number, tenantId: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  if (!user || user.tenantId !== tenantId) {
    throw new NotFoundError("Usuário não encontrado");
  }
  
  return user;
}

export async function createUser(
  prisma: PrismaClient,
  tenantId: number,
  data: {
    email: string;
    password: string;
    name?: string;
    role: Role;
  }
) {
  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name ?? null,
      role: data.role,
      tenantId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateUser(
  prisma: PrismaClient,
  id: number,
  tenantId: number,
  data: {
    email?: string;
    name?: string;
    role?: Role;
  }
) {
  // First check if user exists and belongs to tenant
  await getUser(prisma, id, tenantId);

  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Usuário não encontrado");
    }
    throw error;
  }
}

export async function deleteUser(prisma: PrismaClient, id: number, tenantId: number) {
  // First check if user exists and belongs to tenant
  await getUser(prisma, id, tenantId);

  try {
    await prisma.user.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Usuário não encontrado");
    }
    throw error;
  }
}
