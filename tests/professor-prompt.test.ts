import { describe, expect, it } from "vitest";
import { buildProfessorPrompt } from "@/lib/professor-prompt";
import { selectSourcePassages } from "@/lib/source-passages";

describe("professor prompt", () => {
  it("creates a conversational, source-grounded Hindi teaching contract", () => {
    const passages = selectSourcePassages([{ id: "m1", fileName: "notes.txt", extractedText: "Gradient descent minimizes a loss function." }], "gradient descent");
    const prompt = buildProfessorPrompt(passages, "hi");

    expect(prompt).toContain("Professor MindForge");
    expect(prompt).toContain("Respond entirely in Hindi");
    expect(prompt).toContain("check-for-understanding question");
    expect(prompt).toContain("[S1] notes.txt");
    expect(prompt).toContain("Gradient descent");
    expect(prompt).toContain("untrusted reference text");
    expect(prompt).toContain("Only help with learning");
    expect(prompt).toContain("do not provide the requested information");
  });

  it("clearly labels general-knowledge teaching when no source is available", () => {
    expect(buildProfessorPrompt([], "en")).toContain("answering from general knowledge");
  });
});
