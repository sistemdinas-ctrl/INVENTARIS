import { type NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/inventaris", "/jumlah", "/distribusi", "/riwayat"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isLoginPage = pathname.startsWith("/login");
  const isApiRoute = pathname.startsWith("/api");

  if (!isProtected || isApiRoute) return NextResponse.next();

  const hasSession = req.cookies.has("sb-logged-in");

  if (!hasSession && !isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
