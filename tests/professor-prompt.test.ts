import { describe, expect, it } from "vitest";
import { buildProfessorPrompt } from "@/lib/professor-prompt";

describe("professor prompt", () => {
  it("creates a conversational, source-grounded Hindi teaching contract", () => {
    const prompt = buildProfessorPrompt([{ extractedText: "Gradient descent minimizes a loss function." }], "hi");

    expect(prompt).toContain("Professor MindForge");
    expect(prompt).toContain("Respond entirely in Hindi");
    expect(prompt).toContain("check-for-understanding question");
    expect(prompt).toContain("Material 1");
    expect(prompt).toContain("Gradient descent");
    expect(prompt).toContain("untrusted reference text");
  });

  it("clearly labels general-knowledge teaching when no source is available", () => {
    expect(buildProfessorPrompt([], "en")).toContain("answering from general knowledge");
  });
});
