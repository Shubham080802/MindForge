import { z } from "zod";

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
