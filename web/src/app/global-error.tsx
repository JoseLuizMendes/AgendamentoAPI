"use client";

import "./globals.css";

/**
 * Error Boundary do root layout. Substitui o `<html>/<body>` quando o próprio layout
 * raiz quebra, então precisa renderizar a árvore HTML inteira. Sem dependência de
 * provider/tema (eles podem ter sido o que falhou): só tokens e recarregar a página.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Algo deu errado</h2>
          <p style={{ maxWidth: "28rem", fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
            Encontramos um problema inesperado. Recarregue a página para continuar.
          </p>
          <button
            onClick={() => reset()}
            style={{
              height: "2.25rem",
              padding: "0 1rem",
              borderRadius: "0.375rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
