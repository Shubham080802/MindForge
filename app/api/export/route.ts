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

    const { sessionId, format, content, toolResults } = await request.json();

    if (!sessionId || !format || !["markdown", "json", "pdf"].includes(format)) {
      return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
    }

    // Verify session ownership
    const sessionData = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.user.id },
      include: { materials: true, messages: true },
    });

    if (!sessionData) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    let exportContent = "";
    const filename = `mindforge-${sessionData.title.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`;

    if (format === "json") {
      const exportData = {
        session: {
          id: sessionData.id,
          title: sessionData.title,
          createdAt: sessionData.createdAt,
        },
        materials: sessionData.materials.map((m) => ({
          name: m.url.split("/").pop(),
          type: m.type,
          size: m.size,
        })),
        messages: sessionData.messages.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
        toolResults: toolResults || {},
        exportedAt: new Date().toISOString(),
      };
      exportContent = JSON.stringify(exportData, null, 2);
    } else if (format === "markdown") {
      let md = `# ${sessionData.title}\n\n`;
      md += `**Created:** ${new Date(sessionData.createdAt).toLocaleDateString()}\n`;
      md += `**Exported:** ${new Date().toLocaleDateString()}\n\n`;

      if (sessionData.materials.length > 0) {
        md += "## Materials\n\n";
        sessionData.materials.forEach((m, i) => {
          md += `${i + 1}. ${m.url.split("/").pop()} (${m.type}, ${(m.size / 1024).toFixed(1)} KB)\n`;
        });
        md += "\n";
      }

      if (sessionData.messages.length > 0) {
        md += "## Conversation\n\n";
        sessionData.messages.forEach((m) => {
          const role = m.role === "user" ? "👤 You" : "🤖 AI";
          md += `### ${role}\n${m.content}\n\n`;
        });
      }

      if (toolResults) {
        md += "## Study Tools Results\n\n";
        Object.entries(toolResults).forEach(([tool, result]) => {
          md += `### ${tool.charAt(0).toUpperCase() + tool.slice(1)}\n`;
          if (typeof result === "object") {
            md += "```json\n" + JSON.stringify(result, null, 2) + "\n```\n\n";
          } else {
            md += `${result}\n\n`;
          }
        });
      }

      exportContent = md;
    } else if (format === "pdf") {
      // For PDF, we'll return HTML that can be printed/saved as PDF
      // The client will handle the actual PDF generation via browser print
      let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${sessionData.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    h3 { color: #4b5563; }
    pre { background: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
    .user { background: #eff6ff; border-left: 4px solid #3b82f6; }
    .assistant { background: #f0fdf4; border-left: 4px solid #22c55e; }
    .meta { color: #6b7280; font-size: 0.9em; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>${sessionData.title}</h1>
  <div class="meta">Created: ${new Date(sessionData.createdAt).toLocaleDateString()} | Exported: ${new Date().toLocaleDateString()}</div>
`;

      if (sessionData.materials.length > 0) {
        html += "<h2>Materials</h2><ul>";
        sessionData.materials.forEach((m) => {
          html += `<li>${m.url.split("/").pop()} (${m.type}, ${(m.size / 1024).toFixed(1)} KB)</li>`;
        });
        html += "</ul>";
      }

      if (sessionData.messages.length > 0) {
        html += "<h2>Conversation</h2>";
        sessionData.messages.forEach((m) => {
          const roleClass = m.role === "user" ? "user" : "assistant";
          html += `<div class="message ${roleClass}"><div class="meta">${m.role === "user" ? "👤 You" : "🤖 AI"} - ${new Date(m.createdAt).toLocaleString()}</div>${m.content.replace(/\n/g, "<br>")}</div>`;
        });
      }

      if (toolResults) {
        html += "<h2>Study Tools Results</h2>";
        Object.entries(toolResults).forEach(([tool, result]) => {
          html += `<h3>${tool.charAt(0).toUpperCase() + tool.slice(1)}</h3>`;
          if (typeof result === "object") {
            html += "<pre>" + JSON.stringify(result, null, 2).replace(/</g, "<").replace(/>/g, ">") + "</pre>";
          } else {
            html += "<p>" + String(result).replace(/\n/g, "<br>") + "</p>";
          }
        });
      }

      html += "</body></html>";
      exportContent = html;
    }

    if (format === "pdf") {
      return new NextResponse(exportContent, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="${filename}.html"`,
        },
      });
    }

    const mimeType = format === "json" ? "application/json" : "text/markdown";
    return new NextResponse(exportContent, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}.${format}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ message: "Failed to export" }, { status: 500 });
  }
}