/**
 * Encerramento gracioso: ao receber SIGTERM/SIGINT, fecha a app (dispara os hooks
 * `onClose`, ex.: `prisma.$disconnect`) antes de sair. Dependências injetáveis
 * (`on`/`exit`) para teste determinístico sem mexer no `process` real.
 */

type ClosableApp = {
  close: () => Promise<void>;
  log: { error: (obj: unknown, msg?: string) => void };
};

type ShutdownDeps = {
  signals?: NodeJS.Signals[];
  exit?: (code: number) => void;
  on?: (signal: NodeJS.Signals, handler: () => void) => void;
};

export function installGracefulShutdown(app: ClosableApp, deps: ShutdownDeps = {}): () => Promise<void> {
  const signals = deps.signals ?? ["SIGTERM", "SIGINT"];
  const exit = deps.exit ?? ((code) => process.exit(code));
  const on = deps.on ?? ((signal, handler) => void process.on(signal, handler));

  let shuttingDown = false;

  const handler = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await app.close();
      exit(0);
    } catch (err) {
      app.log.error(err, "Erro durante o encerramento");
      exit(1);
    }
  };

  for (const signal of signals) on(signal, handler);
  return handler;
}
