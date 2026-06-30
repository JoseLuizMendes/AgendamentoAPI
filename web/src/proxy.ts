import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate de rota (defense-in-depth + UX): redireciona visitante SEM sessão para /login antes de
 * a página do workspace renderizar. Verificação **otimista** — só checa a PRESENÇA do cookie de
 * sessão (`token`), não valida o JWT (o Web não tem o segredo). A autorização real continua na API.
 *
 * Em produção com subdomínios, o cookie precisa de Domain=.<dominio> (COOKIE_DOMAIN na API) para
 * chegar ao domínio do Web. Em dev (localhost), o cookie já é compartilhado entre as portas.
 */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/dashboard", // legado (será migrado/removido na US5)
];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Raiz (landing) e rotas públicas conhecidas: liberar.
  const isPublic =
    pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return NextResponse.next();

  // Demais caminhos = workspace do tenant (/[tenant]/...). Exige a presença do cookie de sessão.
  const hasSession = Boolean(req.cookies.get("token")?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Ignora assets internos e arquivos estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
