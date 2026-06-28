import { describe, expect, it, vi } from "vitest";
import { installGracefulShutdown } from "../../src/shutdown.js";

function fakeApp() {
  return {
    close: vi.fn().mockResolvedValue(undefined),
    log: { error: vi.fn() },
  };
}

/** Captura os handlers registrados por sinal via um `on` fake. */
function capture() {
  const handlers = new Map<string, () => void>();
  const on = (sig: NodeJS.Signals, h: () => void) => handlers.set(sig, h);
  return { handlers, on };
}

describe("installGracefulShutdown", () => {
  it("registra handlers para SIGTERM e SIGINT por padrão", () => {
    const app = fakeApp();
    const { handlers, on } = capture();
    installGracefulShutdown(app, { on });
    expect([...handlers.keys()].sort()).toEqual(["SIGINT", "SIGTERM"]);
  });

  it("ao receber o sinal, fecha a app e sai com 0", async () => {
    const app = fakeApp();
    const exit = vi.fn();
    const { handlers, on } = capture();
    installGracefulShutdown(app, { on, exit });

    await handlers.get("SIGTERM")!();

    expect(app.close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("é idempotente: sinais repetidos fecham a app só uma vez", async () => {
    const app = fakeApp();
    const exit = vi.fn();
    const { handlers, on } = capture();
    installGracefulShutdown(app, { on, exit });

    const h = handlers.get("SIGINT")!;
    await Promise.all([h(), h()]);

    expect(app.close).toHaveBeenCalledTimes(1);
  });

  it("se app.close falhar, sai com 1 e loga o erro", async () => {
    const app = fakeApp();
    app.close.mockRejectedValueOnce(new Error("boom"));
    const exit = vi.fn();
    const { handlers, on } = capture();
    installGracefulShutdown(app, { on, exit });

    await handlers.get("SIGTERM")!();

    expect(exit).toHaveBeenCalledWith(1);
    expect(app.log.error).toHaveBeenCalled();
  });
});
