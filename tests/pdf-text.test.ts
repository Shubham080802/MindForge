import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { assessPdfScriptSupport, toPdfSafeText } from "@/lib/pdf-text";

async function helveticaPage() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  return { page: document.addPage([612, 792]), font };
}

describe("toPdfSafeText", () => {
  it("keeps ordinary Latin study text untouched", () => {
    const result = toPdfSafeText("Mitochondria convert energy into ATP — the 'cell' unit.");

    expect(result.text).toBe("Mitochondria convert energy into ATP — the 'cell' unit.");
    expect(result.droppedCharacters).toBe(0);
  });

  it("transliterates the scientific notation a learner actually meets", () => {
    const result = toPdfSafeText("∫ f(x) dx ≈ Σ, where α → β and H₂O");

    expect(result.text).toBe("integral f(x) dx ~= Sigma, where alpha -> beta and H2O");
    expect(result.droppedCharacters).toBe(0);
  });

  it("drops characters no Latin glyph can represent instead of throwing", () => {
    const result = toPdfSafeText("Energy 🎓 माइटोकॉन्ड्रिया");

    expect(result.text).toBe("Energy  ");
    expect(result.droppedCharacters).toBeGreaterThan(0);
  });

  it("counts only letters and digits as lost meaning", () => {
    const result = toPdfSafeText("plain ascii");

    expect(result.meaningfulCharacters).toBe(10);
    expect(result.droppedCharacters).toBe(0);
  });
});

describe("pdf-lib compatibility", () => {
  const sources = [
    "Mitochondria convert energy into ATP — the 'cell' unit.",
    "∫ f(x) dx ≈ Σ, where α → β and H₂O",
    "माइटोकॉन्ड्रिया ऊर्जा बनाते हैं",
    "ミトコンドリアは細胞のエネルギー工場です",
    "Спасибо, θ ≥ 90° ± 5",
    "Emoji 🎓 and zero-width​space",
  ];

  it.each(sources)("renders %j without throwing after sanitisation", async (source) => {
    const { page, font } = await helveticaPage();
    const { text } = toPdfSafeText(source);

    expect(() => page.drawText(text, { x: 50, y: 700, size: 12, font })).not.toThrow();
  });

  it("proves the raw source would have thrown", async () => {
    const { page, font } = await helveticaPage();

    expect(() => page.drawText("α → β", { x: 50, y: 700, size: 12, font })).toThrow();
  });

  it("keeps text measurable so line wrapping cannot fail", async () => {
    const { font } = await helveticaPage();
    const { text } = toPdfSafeText("θ ≥ 90° माइटो");

    expect(() => font.widthOfTextAtSize(text, 11)).not.toThrow();
  });
});

describe("assessPdfScriptSupport", () => {
  it("supports Latin study material containing scientific symbols", () => {
    const support = assessPdfScriptSupport([
      "Photosynthesis converts light into chemical energy.",
      "The rate is α → β with ΔG ≈ -30 kJ/mol.",
    ]);

    expect(support.supported).toBe(true);
  });

  it("refuses a session written in a script Helvetica cannot render", () => {
    const support = assessPdfScriptSupport([
      "माइटोकॉन्ड्रिया कोशिका का ऊर्जा घर है और यह एटीपी बनाता है।",
    ]);

    expect(support.supported).toBe(false);
    expect(support.droppedCharacters).toBeGreaterThan(8);
  });

  it("tolerates a stray unsupported character in an otherwise Latin session", () => {
    const support = assessPdfScriptSupport([
      "A long English explanation about cellular respiration and the electron transport chain.",
      "The professor added 気 as an aside.",
    ]);

    expect(support.supported).toBe(true);
  });
});
