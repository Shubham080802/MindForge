import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluatePracticeAnswer, type QuizQuestion, type StudyToolName, type StudyToolResult } from "@/lib/study-tools";

type StoredPracticeQuestion = {
  id: string;
  position: number;
  type: string;
  prompt: string;
  options: Prisma.JsonValue;
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  concept: string | null;
  response: { answer: string; verdict: string } | null;
};

type StoredPracticeRound = {
  id: string;
  language: string;
  currentIndex: number;
  completedAt: Date | null;
  createdAt: Date;
  questions: StoredPracticeQuestion[];
};

export type PracticeQuestionRecord = Omit<QuizQuestion, "correctAnswer"> & {
  id: string;
  position: number;
  correctAnswer?: string;
  response?: { answer: string; verdict: "correct" | "incorrect" | "review" };
};

export type PracticeRoundRecord = {
  id: string;
  language: string;
  currentIndex: number;
  completedAt: string | null;
  createdAt: string;
  score: number;
  questions: PracticeQuestionRecord[];
};

export type StudyArtifactRecord = {
  id: string;
  kind: Exclude<StudyToolName, "quiz">;
  language: string;
  content: StudyToolResult;
  createdAt: string;
};

function stringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Hides answer keys until the learner has answered that question. */
export function toPracticeRoundRecord(round: StoredPracticeRound): PracticeRoundRecord {
  return {
    id: round.id,
    language: round.language,
    currentIndex: round.currentIndex,
    completedAt: round.completedAt?.toISOString() ?? null,
    createdAt: round.createdAt.toISOString(),
    score: round.questions.filter((question) => question.response?.verdict === "correct").length,
    questions: round.questions.map((question) => ({
      id: question.id,
      position: question.position,
      question: question.prompt,
      type: question.type as QuizQuestion["type"],
      options: stringArray(question.options),
      explanation: question.explanation,
      difficulty: question.difficulty as QuizQuestion["difficulty"],
      concept: question.concept ?? undefined,
      ...(question.response ? {
        correctAnswer: question.correctAnswer,
        response: {
          answer: question.response.answer,
          verdict: question.response.verdict as "correct" | "incorrect" | "review",
        },
      } : {}),
    })),
  };
}

const roundInclude = {
  questions: {
    orderBy: { position: "asc" as const },
    include: { response: { select: { answer: true, verdict: true } } },
  },
} satisfies Prisma.PracticeRoundInclude;

export async function loadLearningRecord(userId: string, sessionId: string) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId }, select: { id: true } });
  if (!session) return null;

  const [artifacts, rounds] = await Promise.all([
    prisma.studyArtifact.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.practiceRound.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" }, take: 10, include: roundInclude }),
  ]);

  return {
    artifacts: artifacts.map((artifact): StudyArtifactRecord => ({
      id: artifact.id,
      kind: artifact.kind as StudyArtifactRecord["kind"],
      language: artifact.language,
      content: artifact.content as unknown as StudyToolResult,
      createdAt: artifact.createdAt.toISOString(),
    })),
    rounds: rounds.map(toPracticeRoundRecord),
  };
}

export async function persistStudyToolResult(
  sessionId: string,
  tool: StudyToolName,
  language: string,
  result: StudyToolResult,
): Promise<{ kind: "artifact"; artifact: StudyArtifactRecord } | { kind: "round"; round: PracticeRoundRecord }> {
  if (tool !== "quiz") {
    const artifact = await prisma.studyArtifact.create({
      data: { sessionId, kind: tool, language, content: result as unknown as Prisma.InputJsonValue },
    });
    return {
      kind: "artifact",
      artifact: {
        id: artifact.id,
        kind: artifact.kind as StudyArtifactRecord["kind"],
        language: artifact.language,
        content: artifact.content as unknown as StudyToolResult,
        createdAt: artifact.createdAt.toISOString(),
      } satisfies StudyArtifactRecord,
    };
  }

  const questions = "questions" in result ? result.questions : [];
  const round = await prisma.practiceRound.create({
    data: {
      sessionId,
      language,
      questions: {
        create: questions.map((question, position) => ({
          position,
          type: question.type,
          prompt: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
          concept: question.concept,
        })),
      },
    },
    include: roundInclude,
  });
  return { kind: "round", round: toPracticeRoundRecord(round) };
}

export async function recordPracticeResponse(input: {
  userId: string;
  sessionId: string;
  roundId: string;
  questionId: string;
  answer: string;
}) {
  const question = await prisma.practiceQuestion.findFirst({
    where: {
      id: input.questionId,
      roundId: input.roundId,
      round: { sessionId: input.sessionId, session: { userId: input.userId } },
    },
    include: {
      response: true,
      round: { select: { currentIndex: true, _count: { select: { questions: true } } } },
    },
  });
  if (!question) return null;

  const quizQuestion: QuizQuestion = {
    question: question.prompt,
    type: question.type as QuizQuestion["type"],
    options: stringArray(question.options),
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    difficulty: question.difficulty as QuizQuestion["difficulty"],
    concept: question.concept ?? undefined,
  };
  const evaluation = evaluatePracticeAnswer(quizQuestion, input.answer);

  if (!question.response) {
    const nextIndex = Math.max(question.round.currentIndex, question.position + 1);
    await prisma.$transaction([
      prisma.practiceResponse.create({
        data: { questionId: question.id, answer: input.answer, verdict: evaluation.verdict },
      }),
      prisma.practiceRound.update({
        where: { id: input.roundId },
        data: {
          currentIndex: nextIndex,
          completedAt: nextIndex >= question.round._count.questions ? new Date() : null,
        },
      }),
    ]);
  }

  const round = await prisma.practiceRound.findUnique({ where: { id: input.roundId }, include: roundInclude });
  if (!round) return null;
  return {
    evaluation: question.response
      ? { verdict: question.response.verdict, expectedAnswer: question.correctAnswer }
      : evaluation,
    round: toPracticeRoundRecord(round),
  };
}
