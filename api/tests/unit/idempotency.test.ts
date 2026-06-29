import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { createAppointmentIdempotent, readIdempotencyKey } from "../../src/services/idempotency.js";

/** Erro de violação de unique do Prisma (key já reivindicada). */
function p2002() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.2.0",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const appt = { id: 42 } as any;

describe("readIdempotencyKey", () => {
  it("string válida → trim", () => {
    expect(readIdempotencyKey("  abc ")).toBe("abc");
  });
  it("vazio/undefined → null", () => {
    expect(readIdempotencyKey(undefined)).toBeNull();
    expect(readIdempotencyKey("")).toBeNull();
    expect(readIdempotencyKey("   ")).toBeNull();
  });
  it("array → primeiro valor não-vazio", () => {
    expect(readIdempotencyKey(["x", "y"])).toBe("x");
  });
});

describe("createAppointmentIdempotent", () => {
  it("key nova → cria e grava o resultado", async () => {
    const prisma = {
      idempotencyKey: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      appointment: { findUnique: vi.fn() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const create = vi.fn().mockResolvedValue(appt);

    const res = await createAppointmentIdempotent(prisma, 1, "k1", create);

    expect(create).toHaveBeenCalledTimes(1);
    expect(res).toBe(appt);
    expect(prisma.idempotencyKey.update).toHaveBeenCalledWith({
      where: { tenantId_key: { tenantId: 1, key: "k1" } },
      data: { appointmentId: 42 },
    });
  });

  it("replay (key já usada) → devolve o agendamento original e NÃO cria de novo", async () => {
    const prisma = {
      idempotencyKey: {
        create: vi.fn().mockRejectedValue(p2002()),
        findUnique: vi.fn().mockResolvedValue({ appointmentId: 42 }),
        update: vi.fn(),
        delete: vi.fn(),
      },
      appointment: { findUnique: vi.fn().mockResolvedValue(appt) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const create = vi.fn();

    const res = await createAppointmentIdempotent(prisma, 1, "k1", create);

    expect(create).not.toHaveBeenCalled();
    expect(res).toBe(appt);
  });

  it("create falha → libera a key e propaga o erro", async () => {
    const del = vi.fn().mockResolvedValue({});
    const prisma = {
      idempotencyKey: {
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn(),
        findUnique: vi.fn(),
        delete: del,
      },
      appointment: { findUnique: vi.fn() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const create = vi.fn().mockRejectedValue(new Error("conflito de horário"));

    await expect(createAppointmentIdempotent(prisma, 1, "k1", create)).rejects.toThrow(
      "conflito de horário"
    );
    expect(del).toHaveBeenCalledWith({ where: { tenantId_key: { tenantId: 1, key: "k1" } } });
  });
});
