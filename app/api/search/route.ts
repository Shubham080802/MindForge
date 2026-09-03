import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const type = searchParams.get("type") || "all"; // all, sessions, materials, messages
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!query) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const searchTerm = `%${query}%`;

    let sessionResults: any[] = [];
    let materialResults: any[] = [];
    let messageResults: any[] = [];

    if (type === "all" || type === "sessions") {
      const sessions = await prisma.session.findMany({
        where: {
          userId: session.user.id,
          title: { contains: query, mode: "insensitive" },
        },
        include: {
          materials: { select: { id: true, type: true, url: true } },
          _count: { select: { materials: true, messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: type === "sessions" ? limit : 10,
        skip: type === "sessions" ? offset : 0,
      });
      sessionResults = sessions.map((s) => ({
        type: "session",
        id: s.id,
        title: s.title,
        snippet: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        materialCount: s._count.materials,
        messageCount: s._count.messages,
        url: `/workspace/${s.id}`,
      }));
    }

    if (type === "all" || type === "materials") {
      const materials = await prisma.material.findMany({
        where: {
          session: { userId: session.user.id },
          OR: [
            { extractedText: { contains: query, mode: "insensitive" } },
            { url: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          session: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: type === "materials" ? limit : 10,
        skip: type === "materials" ? offset : 0,
      });
      materialResults = materials.map((m) => {
        const text = m.extractedText || "";
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        let snippet = "";
        if (index >= 0) {
          const start = Math.max(0, index - 100);
          const end = Math.min(text.length, index + query.length + 100);
          snippet = text.slice(start, end);
          if (start > 0) snippet = "..." + snippet;
          if (end < text.length) snippet = snippet + "...";
        }
        return {
          type: "material",
          id: m.id,
          title: m.url.split("/").pop() || "Document",
          snippet,
          mimeType: m.mimeType,
          size: m.size,
          sessionId: m.sessionId,
          sessionTitle: m.session?.title,
          url: m.sessionId ? `/workspace/${m.sessionId}` : null,
        };
      });
    }

    if (type === "all" || type === "messages") {
      const messages = await prisma.message.findMany({
        where: {
          session: { userId: session.user.id },
          content: { contains: query, mode: "insensitive" },
        },
        include: {
          session: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: type === "messages" ? limit : 10,
        skip: type === "messages" ? offset : 0,
      });
      messageResults = messages.map((m) => {
        const text = m.content;
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        let snippet = "";
        if (index >= 0) {
          const start = Math.max(0, index - 100);
          const end = Math.min(text.length, index + query.length + 100);
          snippet = text.slice(start, end);
          if (start > 0) snippet = "..." + snippet;
          if (end < text.length) snippet = snippet + "...";
        }
        return {
          type: "message",
          id: m.id,
          role: m.role,
          snippet,
          sessionId: m.sessionId,
          sessionTitle: m.session?.title,
          createdAt: m.createdAt,
          url: `/workspace/${m.sessionId}`,
        };
      });
    }

    const allResults = [...sessionResults, ...materialResults, ...messageResults];

    if (type === "all") {
      allResults.sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt || "";
        const dateB = b.updatedAt || b.createdAt || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }

    return NextResponse.json({
      results: allResults.slice(0, limit),
      total: allResults.length,
      query,
      type,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ message: "Search failed" }, { status: 500 });
  }
}