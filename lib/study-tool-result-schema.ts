import { z } from "zod";
import type { StudyToolName, StudyToolResult } from "@/lib/study-tools";

const nonEmptyText = z.string().trim().min(1);

const summaryResultSchema = z.object({
  title: nonEmptyText,
  summary: nonEmptyText,
  keyPoints: z.array(nonEmptyText).min(1).max(20),
  definitions: z.record(nonEmptyText).default({}),
});

const conceptResultSchema = z.object({
  concepts: z.array(z.object({
    term: nonEmptyText,
    definition: nonEmptyText,
    importance: z.enum(["high", "medium", "low"]).default("medium"),
    relatedTerms: z.array(nonEmptyText).default([]),
  })).min(1).max(30),
});

const quizQuestionSchema = z.object({
  question: nonEmptyText,
  type: z.enum(["multiple_choice", "true_false", "short_answer"]),
  options: z.array(nonEmptyText).max(6).default([]),
  correctAnswer: nonEmptyText,
  explanation: nonEmptyText,
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  concept: z.string().trim().min(1).max(120).optional(),
});

const quizResultSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(10),
});

const translationResultSchema = z.object({
  translatedContent: nonEmptyText,
});

const RESULT_SCHEMAS = {
  summary: summaryResultSchema,
  concepts: conceptResultSchema,
  quiz: quizResultSchema,
  translate: translationResultSchema,
} as const;

/** The server-only parsing seam for untrusted provider-generated data. */
export function parseStudyToolResult(tool: StudyToolName, value: unknown): StudyToolResult {
  return RESULT_SCHEMAS[tool].parse(value) as StudyToolResult;
}

/** Retries a provider once when its JSON is incomplete or fails the strict result schema. */
export async function generateValidatedStudyToolResult(
  tool: StudyToolName,
  generate: (attempt: number) => Promise<string>,
): Promise<StudyToolResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return parseStudyToolResult(tool, JSON.parse(await generate(attempt)));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
