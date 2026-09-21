export const STUDY_TOOL_NAMES = ["summary", "concepts", "quiz", "translate"] as const;
export type StudyToolName = (typeof STUDY_TOOL_NAMES)[number];
export type ExportableStudyToolName = Exclude<StudyToolName, "quiz">;

export interface SummaryResult {
  title: string;
  summary: string;
  keyPoints: string[];
  definitions: Record<string, string>;
}

export interface ConceptResult {
  concepts: Array<{
    term: string;
    definition: string;
    importance: "high" | "medium" | "low";
    relatedTerms: string[];
  }>;
}

export interface QuizQuestion {
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface QuizResult {
  questions: QuizQuestion[];
}

export interface TranslationResult {
  translatedContent: string;
}

export type StudyToolResult =
  | SummaryResult
  | ConceptResult
  | QuizResult
  | TranslationResult;

export function studyToolLabel(tool: StudyToolName | string) {
  if (tool === "summary") return "Summary";
  if (tool === "concepts") return "Key concepts";
  if (tool === "quiz") return "Practice questions";
  if (tool.startsWith("translate")) return "Multilingual explanation";
  return tool.charAt(0).toUpperCase() + tool.slice(1);
}

function normalizedAnswer(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function expectedOption(question: QuizQuestion) {
  const normalized = normalizedAnswer(question.correctAnswer);
  const letter = normalized.match(/^(?:option )?([a-f])$/)?.[1];
  if (!letter) return question.correctAnswer;
  return question.options[letter.charCodeAt(0) - 97] ?? question.correctAnswer;
}

export type PracticeAnswerEvaluation = {
  verdict: "correct" | "incorrect" | "review";
  expectedAnswer: string;
};

/** Evaluates objective questions and avoids falsely failing nuanced short answers. */
export function evaluatePracticeAnswer(question: QuizQuestion, answer: string): PracticeAnswerEvaluation {
  const expectedAnswer = expectedOption(question);
  const actual = normalizedAnswer(answer);
  const expected = normalizedAnswer(expectedAnswer);

  if (actual === expected) return { verdict: "correct", expectedAnswer };
  if (question.type !== "short_answer") return { verdict: "incorrect", expectedAnswer };

  const expectedTokens = new Set(expected.split(" ").filter((token) => token.length > 2));
  const actualTokens = new Set(actual.split(" ").filter((token) => token.length > 2));
  const matchingTokens = [...expectedTokens].filter((token) => actualTokens.has(token)).length;
  const coverage = expectedTokens.size ? matchingTokens / expectedTokens.size : 0;

  return {
    verdict: coverage >= 0.7 ? "correct" : "review",
    expectedAnswer,
  };
}

export function buildStudyToolFollowUp(tool: ExportableStudyToolName, result: StudyToolResult) {
  if (tool === "summary") {
    const summary = result as SummaryResult;
    return `Professor, help me discuss the generated summary titled "${summary.title}". Start by connecting its main ideas, then ask me one check-for-understanding question.`;
  }
  if (tool === "concepts") {
    const concepts = (result as ConceptResult).concepts.slice(0, 8).map((concept) => concept.term).join(", ");
    return `Professor, help me understand how these key concepts connect: ${concepts}. Teach them conversationally and check my understanding.`;
  }

  return "Professor, continue teaching from the multilingual explanation I just generated. Clarify the most important idea and then ask me one check-for-understanding question.";
}

export function buildPracticeDiscussionPrompt(question: QuizQuestion, answer: string) {
  return `Professor, help me understand this practice question without simply repeating the answer.\n\nQuestion: ${question.question}\nMy answer: ${answer || "I was unsure"}`;
}
