import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError, parseJson, requireAppUser, requireMutation } from "@/lib/request-guard";
import { profileUpdateInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireAppUser();
    if ("error" in auth) return auth.error;
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true, image: true, language: true },
    });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    return internalError("Get profile", error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;

    const { name, language } = await parseJson(request, profileUpdateInput);
    const updateData = {
      ...(name !== undefined ? { name } : {}),
      ...(language !== undefined ? { language } : {}),
    };

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: { id: true, name: true, email: true, image: true, language: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return internalError("Update profile", error);
  }
}
