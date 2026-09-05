import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.startsWith("sk-")) {
      return NextResponse.json({ message: "Invalid API key format" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { openaiApiKey: apiKey },
    });

    return NextResponse.json({ message: "API key saved" });
  } catch (error) {
    console.error("Save API key error:", error);
    return NextResponse.json({ message: "Failed to save API key" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { openaiApiKey: null },
    });

    return NextResponse.json({ message: "API key removed" });
  } catch (error) {
    console.error("Delete API key error:", error);
    return NextResponse.json({ message: "Failed to remove API key" }, { status: 500 });
  }
}