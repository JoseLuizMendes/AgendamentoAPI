import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "./proxy";

/** Constrói uma request crua (sem cookie de sessão) para o caminho dado. */
function req(path: string): NextRequest {
  return new NextRequest(`https://web.app${path}`);
}

/** Constrói uma request COM o cookie de sessão `token`. */
function reqWithToken(path: string): NextRequest {
  const r = new NextRequest(`https://web.app${path}`);
  r.cookies.set("token", "qualquer-jwt");
  return r;
}

describe("proxy (middleware/gate de rota)", () => {
  it("deixa as chamadas do proxy da API (/be/*) passarem — sem redirecionar pra /login", () => {
    // Regressão do bug de deploy: o middleware rodava ANTES do rewrite /be/* → API e
    // redirecionava o proxy pra /login (307), quebrando o login em produção.
    const res = proxy(req("/be/auth/login"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redireciona caminho protegido sem sessão para /login", () => {
    const res = proxy(req("/acme/agenda"));
    expect(res.headers.get("location")).toBe("https://web.app/login");
  });

  it("libera rota pública sem sessão (/login)", () => {
    const res = proxy(req("/login"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("libera a raiz (landing) sem sessão", () => {
    const res = proxy(req("/"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("deixa caminho protegido COM sessão passar", () => {
    const res = proxy(reqWithToken("/acme/agenda"));
    expect(res.headers.get("location")).toBeNull();
  });
});
