import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportClientError } from "./report-error";

/**
 * `reportClientError` é fire-and-forget: envia o report para `POST /client-errors` com o
 * shape do contrato e **nunca** propaga erro (rede caída não pode derrubar a app).
 */
describe("reportClientError", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "test-sha");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("faz POST /client-errors com o shape do contrato (inclui appVersion)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await reportClientError({ message: "boom", stack: "at x", kind: "render" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/client-errors");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");

    const body = JSON.parse(init.body as string);
    expect(body.message).toBe("boom");
    expect(body.stack).toBe("at x");
    expect(body.kind).toBe("render");
    expect(body.appVersion).toBe("test-sha");
  });

  it("engole rejeição de rede sem propagar", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(reportClientError({ message: "x" })).resolves.toBeUndefined();
  });
});
