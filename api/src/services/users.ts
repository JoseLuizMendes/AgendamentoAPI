import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";

export async function createUser(prisma: PrismaClient, data: { email: string; name?: string }) {
  return prisma.user.create({
    data: {
      email: data.email,
      ...(data.name !== undefined && { name: data.name }),
    },
  });
}

export async function getUser(prisma: PrismaClient, id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  
  if (!user) {
    throw new NotFoundError("Usuário não encontrado");
  }
  
  return user;
}

export async function updateUser(prisma: PrismaClient, id: number, data: { email?: string; name?: string }) {
  try {
    return await prisma.user.update({
      where: { id },
      data,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Usuário não encontrado");
    }
    throw error;
  }
}

export async function deleteUser(prisma: PrismaClient, id: number) {
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
