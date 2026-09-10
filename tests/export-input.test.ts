import { describe, expect, it } from "vitest";
import { exportInput, studyToolInput } from "@/lib/validation";

const sessionId = "cmtt98etd0007sorhvihb9hil";

describe("exportInput", () => {
  it("accepts a session export with stored study-tool results", () => {
    const parsed = exportInput.parse({
      sessionId,
      format: "pdf",
      toolResults: { summary: { title: "Cells" } },
      toolName: "summary",
    });

    expect(parsed.format).toBe("pdf");
    expect(parsed.toolName).toBe("summary");
  });

  it("rejects an unknown export format", () => {
    expect(() => exportInput.parse({ sessionId, format: "docx" })).toThrow();
  });

  it("rejects a session identifier that is not a session identifier", () => {
    expect(() => exportInput.parse({ sessionId: "../../etc/passwd", format: "json" })).toThrow();
  });

  it("bounds client-supplied study-tool results so exports cannot be used as unbounded storage", () => {
    const oversized = { summary: { text: "x".repeat(200_001) } };

    expect(() => exportInput.parse({ sessionId, format: "json", toolResults: oversized })).toThrow();
  });
});

describe("studyToolInput", () => {
  it("generates only from the session's own materials", () => {
    const parsed = studyToolInput.parse({ tool: "summary" });

    expect(parsed).toEqual({ tool: "summary" });
  });

  it("ignores caller-supplied prompt content so study tools cannot become a general model", () => {
    const parsed = studyToolInput.parse({ tool: "quiz", content: "Write my wedding speech" });

    expect(parsed).not.toHaveProperty("content");
  });
});
