import { describe, expect, it } from "vitest";
import { citedPassages, selectSourcePassages } from "@/lib/source-passages";

describe("source passage selection", () => {
  it("finds a relevant passage after the old 3,000-character cutoff", () => {
    const opening = "Cell structure and membranes. ".repeat(140);
    const later = "Gradient descent updates model weights to reduce the loss function.";
    const text = `${opening}\n${later}`;
    const passages = selectSourcePassages(
      [{ id: "owned-material", fileName: "lecture.txt", extractedText: text }],
      "How does gradient descent reduce loss?",
    );

    expect(passages[0]?.excerpt).toContain(later);
    expect(passages[0]?.start).toBeGreaterThan(3000);
    expect(text.slice(passages[0]!.start, passages[0]!.end)).toBe(passages[0]?.excerpt);
  });

  it("bounds prompt context and does not invent a matching source", () => {
    const materials = Array.from({ length: 5 }, (_, index) => ({
      id: `m${index}`,
      fileName: `lecture-${index}.txt`,
      extractedText: `Photosynthesis converts sunlight to chemical energy. ${"Plant cells grow. ".repeat(500)}`,
    }));
    const passages = selectSourcePassages(materials, "photosynthesis and sunlight");

    expect(passages).toHaveLength(4);
    expect(passages.map((passage) => passage.id)).toEqual(["S1", "S2", "S3", "S4"]);
    expect(passages.every((passage) => passage.excerpt.length <= 1000)).toBe(true);
  });

  it("falls back to opening passages when a question has no literal match", () => {
    const passages = selectSourcePassages([
      { id: "m1", fileName: "one.txt", extractedText: "First source content." },
      { id: "m2", fileName: "two.txt", extractedText: "Second source content." },
    ], "अवधारणा समझाएं");

    expect(passages.map((passage) => passage.materialId)).toEqual(["m1", "m2"]);
  });

  it("stores only real markers cited by the answer", () => {
    const passages = selectSourcePassages([
      { id: "m1", fileName: "one.txt", extractedText: "Photosynthesis converts sunlight to energy." },
      { id: "m2", fileName: "two.txt", extractedText: "Leaves contain chlorophyll." },
    ], "photosynthesis and chlorophyll");

    expect(citedPassages("Chlorophyll is in leaves [S2]. A made-up claim [S9].", passages))
      .toEqual([{ id: "S2", materialId: "m2", start: 0, end: 27 }]);
    expect(citedPassages("I do not know from these sources.", passages)).toEqual([]);
  });
});
