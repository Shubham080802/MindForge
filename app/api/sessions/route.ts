import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError, parseJson, requireAppUser, requireMutation } from "@/lib/request-guard";
import { sessionCreateInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;

    const { title, initialQuery, materialIds } = await parseJson(request, sessionCreateInput);

    if (materialIds?.length) {
      const available = await prisma.material.count({
        where: { id: { in: materialIds }, userId: auth.userId, sessionId: null },
      });
      if (available !== materialIds.length) {
        return NextResponse.json({ message: "One or more materials are unavailable." }, { status: 400 });
      }
    }
    const newSession = await prisma.$transaction(async (tx) => {
      const created = await tx.session.create({ data: { userId: auth.userId, title } });
      if (materialIds?.length) {
        const attached = await tx.material.updateMany({
          where: { id: { in: materialIds }, userId: auth.userId, sessionId: null },
          data: { sessionId: created.id },
        });
        if (attached.count !== materialIds.length) throw new Error("Material attachment changed during session creation");
      }
      if (initialQuery) {
        await tx.message.create({ data: { sessionId: created.id, role: "user", content: initialQuery } });
      }
      return created;
    });

    return NextResponse.json({
      session: {
        id: newSession.id,
        title: newSession.title,
        createdAt: newSession.createdAt,
      },
    });
  } catch (error) {
    return internalError("Create session", error);
  }
}

export async function GET() {
  try {
    const auth = await requireAppUser();
    if ("error" in auth) return auth.error;

    const sessions = await prisma.session.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      include: {
        materials: {
          select: { id: true, fileName: true, url: true, type: true, size: true, mimeType: true, createdAt: true },
        },
        _count: { select: { messages: true, materials: true } },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json({ message: "Failed to fetch sessions" }, { status: 500 });
  }
}
