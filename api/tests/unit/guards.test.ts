import { describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireAuth, requireRole } from "../../src/utils/guards.js";
import { UnauthorizedError } from "../../src/utils/errors.js";

function fakeReply() {
  const reply = {
    statusCode: 0,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(p: unknown) {
      this.payload = p;
      return this;
    },
  };
  return reply as unknown as FastifyReply & { statusCode: number; payload: unknown };
}

const authOwner = { userId: 1, tenantId: 1, role: "OWNER" } as const;
const authStaff = { userId: 2, tenantId: 1, role: "STAFF" } as const;

describe("guards/requireAuth", () => {
  it("retorna o payload quando autenticado", () => {
    const req = { auth: authOwner } as unknown as FastifyRequest;
    expect(requireAuth(req)).toEqual(authOwner);
  });

  it("lança UnauthorizedError quando não há auth", () => {
    const req = {} as FastifyRequest;
    expect(() => requireAuth(req)).toThrow(UnauthorizedError);
  });
});

describe("guards/requireRole", () => {
  it("bloqueia papel fora da lista com 403", async () => {
    const guard = requireRole("OWNER");
    const req = { auth: authStaff } as unknown as FastifyRequest;
    const reply = fakeReply();
    await guard(req, reply);
    expect(reply.statusCode).toBe(403);
    expect((reply.payload as { message: string }).message).toMatch(/permiss/i);
  });

  it("permite papel presente na lista (sem responder)", async () => {
    const guard = requireRole("OWNER", "STAFF");
    const req = { auth: authStaff } as unknown as FastifyRequest;
    const reply = fakeReply();
    const sendSpy = vi.spyOn(reply, "send");
    await guard(req, reply);
    expect(reply.statusCode).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("retorna 401 quando não autenticado", async () => {
    const guard = requireRole("OWNER");
    const req = {} as FastifyRequest;
    const reply = fakeReply();
    await guard(req, reply);
    expect(reply.statusCode).toBe(401);
  });
});
