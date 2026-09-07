import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, requireMutation } from "@/lib/request-guard";
import { profileUpdateInput } from "@/lib/validation";

export const runtime = "nodejs";

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
    if (error instanceof Response) return error;
    console.error("Update profile error:", error);
    return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
  }
}
