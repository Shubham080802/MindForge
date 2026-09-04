import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

async function generatePdf(
  title: string,
  createdAt: string,
  materials: Array<{ url: string; type: string; size: number }>,
  messages: Array<{ role: string; content: string; createdAt: string }>,
  toolResults: Record<string, any>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const addText = (text: string, fontSize = 12, isBold = false, color = rgb(0, 0, 0)) => {
    const f = isBold ? boldFont : font;
    const lines = f.widthOfTextAtSize(text, fontSize) > contentWidth
      ? wrapText(text, fontSize, contentWidth, f)
      : [text];
    
    for (const line of lines) {
      if (y - fontSize < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, size: fontSize, font: f, color });
      y -= fontSize + 2;
    }
    return lines.length;
  };

  const wrapText = (text: string, fontSize: number, maxWidth: number, font: any): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const addSectionHeader = (title: string) => {
    y -= 8;
    addText(title, 16, true, rgb(0.1, 0.1, 0.1));
    y -= 4;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 12;
  };

  // Title
  addText(title, 24, true, rgb(0.1, 0.2, 0.5));
  y -= 4;
  addText(`Created: ${new Date(createdAt).toLocaleDateString()} | Exported: ${new Date().toLocaleDateString()}`, 10, false, rgb(0.4, 0.4, 0.4));
  y -= 20;

  // Materials
  if (materials.length > 0) {
    addSectionHeader("Materials");
    materials.forEach((m, i) => {
      const name = m.url.split("/").pop() || "Document";
      addText(`${i + 1}. ${name} (${m.type}, ${(m.size / 1024).toFixed(1)} KB)`, 11);
    });
    y -= 10;
  }

  // Conversation
  if (messages.length > 0) {
    addSectionHeader("Conversation");
    messages.forEach((m) => {
      const isUser = m.role === "user";
      addText(`${isUser ? "You" : "AI"} - ${new Date(m.createdAt).toLocaleString()}`, 10, true, isUser ? rgb(0.2, 0.4, 0.8) : rgb(0.1, 0.6, 0.2));
      const contentLines = wrapText(m.content, 11, contentWidth, font);
      for (const line of contentLines) {
        if (y - 11 < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(line, { x: margin + 10, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
        y -= 13;
      }
      y -= 10;
    });
  }

  // Study Tools Results
  if (toolResults && Object.keys(toolResults).length > 0) {
    addSectionHeader("Study Tools Results");
    Object.entries(toolResults).forEach(([tool, result]) => {
      addText(tool.charAt(0).toUpperCase() + tool.slice(1), 13, true, rgb(0.3, 0.3, 0.5));
      y -= 4;
      const content = typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
      const contentLines = wrapText(content, 10, contentWidth, font);
      for (const line of contentLines) {
        if (y - 10 < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(line, { x: margin + 10, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 12;
      }
      y -= 8;
    });
  }

  return pdfDoc.save();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, format, content, toolResults, toolName } = await request.json();

    if (!sessionId || !format || !["markdown", "json", "pdf"].includes(format)) {
      return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
    }

    const sessionData = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.user.id },
      include: { materials: true, messages: true },
    });

    if (!sessionData) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

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
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }

    if (format === "markdown") {
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

      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${filename}.md"`,
        },
      });
    }

    if (format === "pdf") {
      if (toolName && toolResults && toolResults[toolName]) {
        // Export single tool result
        const singleToolResults: Record<string, any> = { [toolName]: toolResults[toolName] };
        const pdfBytes = await generatePdf(
          `${sessionData.title} - ${toolName}`,
          sessionData.createdAt.toISOString(),
          [],
          [],
          singleToolResults
        );
        return new NextResponse(Buffer.from(pdfBytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}-${toolName}.pdf"`,
          },
        });
      }

      const pdfBytes = await generatePdf(
        sessionData.title,
        sessionData.createdAt.toISOString(),
        sessionData.materials,
        sessionData.messages.map(m => ({ role: m.role, content: m.content, createdAt: m.createdAt.toISOString() })),
        toolResults || {}
      );

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    return NextResponse.json({ message: "Invalid format" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ message: "Failed to export" }, { status: 500 });
  }
}