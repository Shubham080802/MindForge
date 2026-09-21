import { describe, expect, it } from "vitest";
import { calculateLearningProgress } from "@/lib/learning-progress";
import type { PracticeRoundRecord, StudyArtifactRecord } from "@/lib/learning-record";

const artifact: StudyArtifactRecord = {
  id: "artifact-1",
  kind: "summary",
  language: "en",
  content: { title: "Cells", summary: "A cell summary", keyPoints: [], definitions: {} },
  createdAt: "2026-09-20T00:00:00.000Z",
};

function round(overrides: Partial<PracticeRoundRecord> = {}): PracticeRoundRecord {
  return {
    id: "round-1",
    language: "en",
    currentIndex: 1,
    completedAt: "2026-09-20T00:10:00.000Z",
    createdAt: "2026-09-20T00:00:00.000Z",
    score: 0,
    questions: [{
      id: "question-1",
      position: 0,
      question: "What produces ATP?",
      type: "multiple_choice",
      options: ["Mitochondria", "Nucleus"],
      explanation: "Mitochondria produce most cellular ATP.",
      difficulty: "easy",
      concept: "Cellular energy",
      response: { answer: "Nucleus", verdict: "incorrect" },
      correctAnswer: "Mitochondria",
    }],
    ...overrides,
  };
}

describe("learning progress", () => {
  it("starts by recommending a study summary", () => {
    expect(calculateLearningProgress({ artifacts: [], rounds: [] }).recommendation.kind).toBe("summary");
  });

  it("prioritizes resuming unfinished practice", () => {
    const progress = calculateLearningProgress({ artifacts: [artifact], rounds: [round({ completedAt: null })] });
    expect(progress.recommendation.kind).toBe("resume");
  });

  it("surfaces the weakest practiced concept", () => {
    const progress = calculateLearningProgress({ artifacts: [artifact], rounds: [round()] });
    expect(progress.mastery[0]).toMatchObject({ concept: "Cellular energy", status: "review", accuracy: 0 });
    expect(progress.recommendation).toMatchObject({ kind: "review", concept: "Cellular energy" });
  });
});
