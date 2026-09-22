import { describe, expect, it, vi } from "vitest";
import {
  buildStudyToolFollowUp,
  evaluatePracticeAnswer,
  type QuizQuestion,
} from "@/lib/study-tools";
import { parseStudyToolResult } from "@/lib/study-tool-result-schema";
import { generateValidatedStudyToolResult } from "@/lib/study-tool-result-schema";
import { toPracticeRoundRecord } from "@/lib/learning-record";
import { practiceAnswerInput } from "@/lib/validation";

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

  it("keeps unanswered practice keys private and reveals answered keys", () => {
    const round = toPracticeRoundRecord({
      id: "round-1",
      language: "en",
      currentIndex: 1,
      completedAt: null,
      createdAt: new Date("2026-09-20T00:00:00.000Z"),
      questions: [
        {
          id: "answered",
          position: 0,
          type: "multiple_choice",
          prompt: multipleChoice.question,
          options: multipleChoice.options,
          correctAnswer: multipleChoice.correctAnswer,
          explanation: multipleChoice.explanation,
          difficulty: multipleChoice.difficulty,
          concept: "Cellular energy",
          response: { answer: "Mitochondrion", verdict: "correct" },
        },
        {
          id: "unanswered",
          position: 1,
          type: "short_answer",
          prompt: "Describe oxidative phosphorylation.",
          options: [],
          correctAnswer: "ATP production using an electron transport chain",
          explanation: "The chain creates the gradient used by ATP synthase.",
          difficulty: "medium",
          concept: "Oxidative phosphorylation",
          response: null,
        },
      ],
    });

    expect(round.questions[0]!.correctAnswer).toBe("B");
    expect(round.questions[1]!.correctAnswer).toBeUndefined();
    expect(round.score).toBe(1);
  });

  it("bounds persisted practice answers", () => {
    expect(practiceAnswerInput.safeParse({ questionId: "bad", answer: "ATP" }).success).toBe(false);
    expect(practiceAnswerInput.safeParse({ questionId: "cm12345678901234567890123", answer: "" }).success).toBe(false);
  });

  it("retries once when a provider truncates quiz JSON", async () => {
    const attempts = [
      '{"questions":[{"question":"Incomplete',
      JSON.stringify({ questions: [multipleChoice] }),
    ];
    const generate = vi.fn(async (attempt: number) => attempts[attempt]!);

    const result = await generateValidatedStudyToolResult("quiz", generate);

    expect(generate).toHaveBeenCalledTimes(2);
    expect("questions" in result && result.questions).toHaveLength(1);
  });
});
