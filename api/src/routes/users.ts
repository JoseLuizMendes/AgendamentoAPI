import type { FastifyPluginAsync } from "fastify";
import { 
  UserCreateSchema, 
  UserUpdateSchema, 
  UserParamsSchema,
  ErrorResponseSchema 
} from "../schemas/index.js";
import * as userService from "../services/users.js";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // GET /users/:id - Get user
  app.get("/users/:id", async (req, reply) => {
    const params = UserParamsSchema.parse(req.params);
    const user = await userService.getUser(app.prisma, params.id);
    return reply.send(user);
  });

  // POST /users - Create user
  app.post("/users", async (req, reply) => {
    const body = UserCreateSchema.parse(req.body);
    const data: { email: string; name?: string } = { email: body.email };
    if (body.name !== undefined) data.name = body.name;
    
    const user = await userService.createUser(app.prisma, data);
    return reply.status(201).send(user);
  });

  // PUT /users/:id - Update user
  app.put("/users/:id", async (req, reply) => {
    const params = UserParamsSchema.parse(req.params);
    const body = UserUpdateSchema.parse(req.body);
    const data: { email?: string; name?: string } = {};
    if (body.email !== undefined) data.email = body.email;
    if (body.name !== undefined) data.name = body.name;
    
    const user = await userService.updateUser(app.prisma, params.id, data);
    return reply.send(user);
  });

  // DELETE /users/:id - Delete user
  app.delete("/users/:id", async (req, reply) => {
    const params = UserParamsSchema.parse(req.params);
    await userService.deleteUser(app.prisma, params.id);
    return reply.status(204).send();
  });
};
