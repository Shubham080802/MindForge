import { z } from "zod";
import { STUDY_LANGUAGE_CODES } from "@/lib/study-languages";

export const sessionCreateInput = z.object({
  title: z.string().trim().min(1).max(120),
  initialQuery: z.string().trim().max(8_000).optional(),
  materialIds: z.array(z.string().cuid()).max(10).refine((ids) => new Set(ids).size === ids.length, "Material identifiers must be unique").optional(),
});
export const sessionUpdateInput = z.object({ title: z.string().trim().min(1).max(120) });
export const sessionMessageInput = z.object({
  content: z.string().trim().min(1).max(8_000),
  stream: z.boolean().optional(),
  language: z.enum(STUDY_LANGUAGE_CODES).default("en"),
});
export const profileUpdateInput = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  language: z.enum(STUDY_LANGUAGE_CODES).optional(),
}).refine((input) => input.name !== undefined || input.language !== undefined, { message: "No fields to update" });

export const studyToolInput = z.object({
  tool: z.enum(["summary", "concepts", "quiz", "translate"]),
  content: z.string().max(20_000).optional(),
  targetLanguage: z.enum(STUDY_LANGUAGE_CODES).optional(),
});

export const subjectInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2_000).optional(),
});

export const conversationInput = z.object({ subjectId: z.string().uuid() });

export const messageInput = z.object({
  prompt: z.string().trim().min(1).max(8_000),
});

export const questionInput = z.object({
  subjectId: z.string().uuid(),
  count: z.number().int().min(1).max(10),
});

export const audioInput = z.object({ text: z.string().trim().min(1).max(4_000) });
export const speechChunkInput = z.object({
  chunkIndex: z.number().int().min(0).max(24),
});
