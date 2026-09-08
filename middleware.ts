import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { routeAccess } from "@/lib/route-access";

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const access = routeAccess(req.nextUrl.pathname);
  if (!access.requiresAuthentication) return NextResponse.next();

  const authState = await auth();
  if (authState.userId) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = req.nextUrl.clone();
  signInUrl.pathname = "/auth/signin";
  signInUrl.search = "";
  signInUrl.searchParams.set("redirect_url", req.url);
  return NextResponse.redirect(signInUrl);
}, {
  contentSecurityPolicy: {
    directives: {
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
    },
  },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
