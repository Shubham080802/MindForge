import { describe, expect, it } from "vitest";
import {
  buildStudyToolFollowUp,
  evaluatePracticeAnswer,
  type QuizQuestion,
} from "@/lib/study-tools";
import { parseStudyToolResult } from "@/lib/study-tool-result-schema";

const multipleChoice: QuizQuestion = {
  question: "Which organelle produces ATP?",
  type: "multiple_choice",
  options: ["Nucleus", "Mitochondrion", "Ribosome"],
  correctAnswer: "B",
  explanation: "Mitochondria generate most cellular ATP.",
  difficulty: "easy",
};

describe("study tool results", () => {
  it("parses a bounded interactive quiz", () => {
    const parsed = parseStudyToolResult("quiz", { questions: [multipleChoice] });
    expect("questions" in parsed && parsed.questions).toHaveLength(1);
  });

  it("rejects malformed provider output", () => {
    expect(() => parseStudyToolResult("quiz", { questions: [] })).toThrow();
    expect(() => parseStudyToolResult("summary", { title: "Missing content" })).toThrow();
  });

  it("understands option letters and option text", () => {
    expect(evaluatePracticeAnswer(multipleChoice, "Mitochondrion").verdict).toBe("correct");
    expect(evaluatePracticeAnswer(multipleChoice, "Nucleus").verdict).toBe("incorrect");
  });

  it("does not falsely fail a nuanced short answer", () => {
    const question: QuizQuestion = {
      ...multipleChoice,
      type: "short_answer",
      options: [],
      correctAnswer: "oxidative phosphorylation produces ATP",
    };

    expect(evaluatePracticeAnswer(question, "ATP is produced through oxidative phosphorylation").verdict).toBe("correct");
    expect(evaluatePracticeAnswer(question, "energy conversion").verdict).toBe("review");
  });

  it("creates a focused conversational follow-up", () => {
    expect(buildStudyToolFollowUp("concepts", {
      concepts: [{ term: "ATP", definition: "Energy carrier", importance: "high", relatedTerms: [] }],
    })).toContain("ATP");
  });
});
