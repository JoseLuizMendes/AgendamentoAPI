import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { UserParamsSchema } from "../schemas/index.js";
import * as userService from "../services/users.js";
import { requireAuth, requireRole } from "../utils/guards.js";

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

  // GET /users - List all users in tenant (OWNER)
  zApp.get(
    "/users",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Users"],
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const users = await userService.listUsers(app.prisma, auth.tenantId);
      return reply.send(users);
    }
  );

  // GET /users/:id - Get user (próprio perfil ou OWNER)
  zApp.get(
    "/users/:id",
    {
      schema: {
        tags: ["Users"],
        params: UserParamsSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      if (auth.role !== "OWNER" && auth.userId !== req.params.id) {
        return reply.status(403).send({ message: "Sem permissão para visualizar este usuário" });
      }
      const user = await userService.getUser(app.prisma, req.params.id, auth.tenantId);
      return reply.send(user);
    }
  );

  // POST /users - Create user (OWNER)
  zApp.post(
    "/users",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Users"],
        body: UserCreateInternalSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
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

      const user = await userService.createUser(app.prisma, auth.tenantId, userData);
      return reply.status(201).send(user);
    }
  );

  // PUT /users/:id - Update user (próprio perfil ou OWNER; só OWNER muda role)
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
      const auth = requireAuth(req);
      if (auth.role !== "OWNER" && auth.userId !== req.params.id) {
        return reply.status(403).send({ message: "Sem permissão para atualizar este usuário" });
      }

      const data: { email?: string; name?: string; role?: NonNullable<typeof req.body.role> } = {};
      if (req.body.email !== undefined) data.email = req.body.email;
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.role !== undefined && auth.role === "OWNER") {
        data.role = req.body.role;
      }

      const user = await userService.updateUser(app.prisma, req.params.id, auth.tenantId, data);
      return reply.send(user);
    }
  );

  // DELETE /users/:id - Delete user (OWNER)
  zApp.delete(
    "/users/:id",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Users"],
        params: UserParamsSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      await userService.deleteUser(app.prisma, req.params.id, auth.tenantId);
      return reply.status(204).send();
    }
  );
};
