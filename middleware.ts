import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { routeAccess } from "@/lib/route-access";

export default async function middleware(req: NextRequest) {
  const access = routeAccess(req.nextUrl.pathname);
  if (!access.requiresAuthentication) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.nextUrl));
}

export const config = {
  matcher: [
    "/workspace/:path*",
    "/library/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
