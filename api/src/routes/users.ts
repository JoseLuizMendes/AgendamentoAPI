import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { UserParamsSchema } from "../schemas/index.js";
import * as userService from "../services/users.js";

const UserCreateInternalSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(["OWNER", "STAFF", "CUSTOMER"]),
});

const UserUpdateInternalSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(["OWNER", "STAFF", "CUSTOMER"]).optional(),
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /users - List all users in tenant
  zApp.get(
    "/users",
    {
      schema: {
        tags: ["Users"],
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      // Only OWNER can list users
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para listar usuários" });
      }

      const users = await userService.listUsers(app.prisma, req.auth.tenantId);
      return reply.send(users);
    }
  );

  // GET /users/:id - Get user
  zApp.get(
    "/users/:id",
    {
      schema: {
        tags: ["Users"],
        params: UserParamsSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      // Users can view their own profile, OWNER can view any user in tenant
      if (req.auth.role !== "OWNER" && req.auth.userId !== req.params.id) {
        return reply.status(403).send({ message: "Sem permissão para visualizar este usuário" });
      }

      const user = await userService.getUser(app.prisma, req.params.id, req.auth.tenantId);
      return reply.send(user);
    }
  );

  // POST /users - Create user (OWNER only)
  zApp.post(
    "/users",
    {
      schema: {
        tags: ["Users"],
        body: UserCreateInternalSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      // Only OWNER can create users
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para criar usuários" });
      }

      const userData: {
        email: string;
        password: string;
        name?: string;
        role: typeof req.body.role;
      } = {
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
      };
      if (req.body.name !== undefined) {
        userData.name = req.body.name;
      }

      const user = await userService.createUser(app.prisma, req.auth.tenantId, userData);
      return reply.status(201).send(user);
    }
  );

  // PUT /users/:id - Update user
  zApp.put(
    "/users/:id",
    {
      schema: {
        tags: ["Users"],
        params: UserParamsSchema,
        body: UserUpdateInternalSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      // Users can update their own profile (except role), OWNER can update any user
      if (req.auth.role !== "OWNER" && req.auth.userId !== req.params.id) {
        return reply.status(403).send({ message: "Sem permissão para atualizar este usuário" });
      }

      // Non-owners cannot change roles
      const data: any = {};
      if (req.body.email !== undefined) data.email = req.body.email;
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.role !== undefined && req.auth.role === "OWNER") {
        data.role = req.body.role;
      }

      const user = await userService.updateUser(app.prisma, req.params.id, req.auth.tenantId, data);
      return reply.send(user);
    }
  );

  // DELETE /users/:id - Delete user (OWNER only)
  zApp.delete(
    "/users/:id",
    {
      schema: {
        tags: ["Users"],
        params: UserParamsSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      // Only OWNER can delete users
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para deletar usuários" });
      }

      await userService.deleteUser(app.prisma, req.params.id, req.auth.tenantId);
      return reply.status(204).send();
    }
  );
};
