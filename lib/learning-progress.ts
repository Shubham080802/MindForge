import type { PracticeRoundRecord, StudyArtifactRecord } from "@/lib/learning-record";

export type ConceptMastery = {
  concept: string;
  attempted: number;
  correct: number;
  accuracy: number;
  status: "review" | "growing" | "strong";
};

export type LearningRecommendation =
  | { kind: "resume"; label: string; detail: string }
  | { kind: "summary"; label: string; detail: string }
  | { kind: "practice"; label: string; detail: string }
  | { kind: "review"; label: string; detail: string; concept: string };

export type LearningProgress = {
  attempted: number;
  correct: number;
  completedRounds: number;
  mastery: ConceptMastery[];
  recommendation: LearningRecommendation;
};

export function calculateLearningProgress(input: {
  artifacts: StudyArtifactRecord[];
  rounds: PracticeRoundRecord[];
}): LearningProgress {
  const concepts = new Map<string, { attempted: number; correct: number }>();
  let attempted = 0;
  let correct = 0;

  for (const round of input.rounds) {
    for (const question of round.questions) {
      if (!question.response) continue;
      attempted += 1;
      if (question.response.verdict === "correct") correct += 1;
      if (!question.concept?.trim()) continue;
      const current = concepts.get(question.concept) ?? { attempted: 0, correct: 0 };
      current.attempted += 1;
      if (question.response.verdict === "correct") current.correct += 1;
      concepts.set(question.concept, current);
    }
  }

  const mastery = [...concepts.entries()]
    .map(([concept, result]): ConceptMastery => {
      const accuracy = result.correct / result.attempted;
      return {
        concept,
        ...result,
        accuracy,
        status: accuracy < 0.6 ? "review" : accuracy < 0.85 ? "growing" : "strong",
      };
    })
    .sort((left, right) => left.accuracy - right.accuracy || right.attempted - left.attempted);

  const activeRound = input.rounds.find((round) => !round.completedAt);
  const weakestConcept = mastery.find((concept) => concept.status === "review");
  let recommendation: LearningRecommendation;

  if (activeRound) {
    recommendation = {
      kind: "resume",
      label: "Resume your practice round",
      detail: `Continue with question ${activeRound.currentIndex + 1} of ${activeRound.questions.length}.`,
    };
  } else if (input.artifacts.length === 0) {
    recommendation = {
      kind: "summary",
      label: "Create your first study summary",
      detail: "Start with a concise map of the material before testing recall.",
    };
  } else if (weakestConcept) {
    recommendation = {
      kind: "review",
      label: `Review ${weakestConcept.concept}`,
      detail: `You have ${weakestConcept.correct} correct answer${weakestConcept.correct === 1 ? "" : "s"} from ${weakestConcept.attempted} attempt${weakestConcept.attempted === 1 ? "" : "s"}.`,
      concept: weakestConcept.concept,
    };
  } else {
    recommendation = {
      kind: "practice",
      label: "Start another practice round",
      detail: attempted ? "Keep strengthening recall with a fresh question set." : "Turn your saved notes into active recall.",
    };
  }

  return {
    attempted,
    correct,
    completedRounds: input.rounds.filter((round) => round.completedAt).length,
    mastery,
    recommendation,
  };
}
