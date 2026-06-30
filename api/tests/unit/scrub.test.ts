import { describe, expect, it } from "vitest";
import { scrubEvent, type ScrubbableEvent } from "../../src/observability/scrub.js";

/**
 * Scrub (beforeSend): garante que nenhum dado sensível saia nos eventos de telemetria
 * (cookie de sessão, header Authorization, senha no corpo). Função pura/idempotente.
 */
describe("scrubEvent", () => {
  it("remove Authorization, Cookie/Set-Cookie e request.cookies", () => {
    const event: ScrubbableEvent = {
      request: {
        url: "/services",
        headers: {
          Authorization: "Bearer abc.def.ghi",
          Cookie: "token=eyJ; other=1",
          "Set-Cookie": "token=eyJ; HttpOnly",
          "content-type": "application/json",
        },
        cookies: { token: "eyJ" },
      },
    };

    const out = scrubEvent(event);

    expect(out.request?.headers?.["Authorization"]).toBe("[Filtered]");
    expect(out.request?.headers?.["Cookie"]).toBe("[Filtered]");
    expect(out.request?.headers?.["Set-Cookie"]).toBe("[Filtered]");
    expect(out.request?.headers?.["content-type"]).toBe("application/json"); // preserva o inócuo
    expect(out.request?.cookies).toBe("[Filtered]");
  });

  it("ofusca senha/token no corpo (rotas de auth e em geral)", () => {
    const event: ScrubbableEvent = {
      request: { url: "/auth/login", data: { email: "a@b.com", password: "segredo123" } },
    };
    const out = scrubEvent(event);
    const data = out.request?.data as Record<string, unknown>;
    expect(data.password).toBe("[Filtered]");
    expect(data.email).toBe("a@b.com"); // email não é segredo aqui
  });

  it("é idempotente e não quebra sem request/campos", () => {
    expect(scrubEvent({})).toEqual({});
    expect(scrubEvent({ request: {} })).toEqual({ request: {} });
    const e: ScrubbableEvent = { request: { headers: { "x-foo": "bar" } } };
    expect(scrubEvent(e).request?.headers?.["x-foo"]).toBe("bar");
  });
});
