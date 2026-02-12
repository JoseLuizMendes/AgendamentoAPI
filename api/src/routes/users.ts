import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { 
  UserCreateSchema, 
  UserUpdateSchema, 
  UserParamsSchema,
} from "../schemas/index.js";
import * as userService from "../services/users.js";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

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
      const user = await userService.getUser(app.prisma, req.params.id);
      return reply.send(user);
    }
  );

  // POST /users - Create user
  zApp.post(
    "/users",
    {
      schema: {
        tags: ["Users"],
        body: UserCreateSchema,
      },
    },
    async (req, reply) => {
      const data: { email: string; name?: string } = {
        email: req.body.email,
        ...(req.body.name !== undefined ? { name: req.body.name } : {}),
      };
      const user = await userService.createUser(app.prisma, data);
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
        body: UserUpdateSchema,
      },
    },
    async (req, reply) => {
      const data: { email?: string; name?: string } = {};
      if (req.body.email !== undefined) data.email = req.body.email;
      if (req.body.name !== undefined) data.name = req.body.name;

      const user = await userService.updateUser(app.prisma, req.params.id, data);
      return reply.send(user);
    }
  );

  // DELETE /users/:id - Delete user
  zApp.delete(
    "/users/:id",
    {
      schema: {
        tags: ["Users"],
        params: UserParamsSchema,
      },
    },
    async (req, reply) => {
      await userService.deleteUser(app.prisma, req.params.id);
      return reply.status(204).send();
    }
  );
};
