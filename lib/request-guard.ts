import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { ensureAppUser } from "@/lib/clerk-user";
import { reportServerError } from "@/lib/observability";

/**
 * The single seam for authenticated, browser-initiated mutations. Keeping it
 * here prevents route handlers from drifting into subtly different security
 * behaviour.
 */
export async function requireAppUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) } as const;
  }

  const user = await ensureAppUser(clerkUserId);
  return { userId: user.id, clerkUserId } as const;
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    throw new Response("Invalid request origin", { status: 403 });
  }
}

export async function requireMutation(request: NextRequest) {
  assertSameOrigin(request);
  return requireAppUser();
}

export async function parseJson<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json().catch(() => undefined);
  return schema.parse(body);
}

export function invalidRequest(error: unknown) {
  if (error instanceof Response) return error;
  return NextResponse.json({ message: "Invalid request" }, { status: 400 });
}

export async function internalError(action: string, error: unknown) {
  if (error instanceof Response) return error;
  if (error instanceof ZodError) {
    return NextResponse.json({ message: "Invalid request", issues: error.flatten().fieldErrors }, { status: 400 });
  }
  await reportServerError(action, error);
  return NextResponse.json({ message: "Request could not be completed" }, { status: 500 });
}
