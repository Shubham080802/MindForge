import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { routeAccess } from "@/lib/route-access";
import { prisma } from "@/lib/prisma";
import { reconcileSessionIdentity } from "@/lib/session-version";

export default async function middleware(req: NextRequest) {
  const access = routeAccess(req.nextUrl.pathname);
  if (!access.requiresAuthentication) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const hasVersionedIdentity = token
    && !token.revoked
    && typeof token.id === "string"
    && typeof token.sessionVersion === "number";

  // API handlers perform the authoritative database-backed session check via
  // requireAppUser. Avoid repeating that serial lookup in middleware.
  if (hasVersionedIdentity && req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (hasVersionedIdentity) {
    const current = await prisma.user.findUnique({
      where: { id: token.id },
      select: { sessionVersion: true },
    });
    if (reconcileSessionIdentity(token, current?.sessionVersion ?? null)) return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.nextUrl));
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/workspace/:path*",
    "/library/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
