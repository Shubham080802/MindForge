export const STUDY_SCOPE_MESSAGE = "MindForge is a study-only workspace. Ask a learning question about your materials, a concept, an assignment, or a skill you want to understand.";

const ACADEMIC_CONTEXT = /\b(?:lesson|study|learn|course|class|homework|assignment|exam|quiz|research|material|document|pdf|chapter|notes?|textbook|history|geography|science|climate|meteorology|tourism economics|urban planning|cultural studies|how .{0,40} works?)\b/i;
const CLEAR_LEARNING_INTENT = /\b(?:explain|teach|learn|study|define|compare|contrast|analy[sz]e|summari[sz]e|translate|calculate|solve|derive|prove|practice|quiz|question bank|flashcards?|study plan|help me understand|concept|theory|lesson|course|class|homework|assignment|exam|research|material|document|pdf|chapter|notes?|textbook|example)\b/i;

const OUT_OF_SCOPE_PATTERNS = [
  /\bhow(?:'s| is) (?:the )?weather\b|\bwhat(?:'s| is) (?:the )?weather (?:like|today|tomorrow|tonight|outside|this (?:week|weekend))\b|\b(?:weather|forecast|temperature) (?:today|tomorrow|tonight|this (?:week|weekend)|in [\p{L}\s-]+)\b/iu,
  /\b(?:places? to visit|things to do in|travel itinerary|plan (?:my |our |a )?(?:[\w-]+\s+){0,4}trip|where should (?:i|we) (?:go|travel|visit)|book (?:me )?(?:a )?(?:flight|hotel)|find (?:me )?(?:flights?|hotels?)|recommend (?:places|restaurants|hotels|destinations))\b/i,
  /\b(?:directions to|navigate (?:me )?to|traffic (?:to|near|in)|how do i get to)\b/i,
  /\b(?:make (?:a )?reservation|book (?:a )?table|order (?:me )?food|find (?:a )?restaurant near)\b/i,
  /\b(?:tell me a joke|dating advice|write (?:me )?a pickup line|celebrity gossip)\b/i,
] as const;

export type StudyScopeDecision =
  | { allowed: true }
  | { allowed: false; message: typeof STUDY_SCOPE_MESSAGE };

export function evaluateStudyScope(input: string): StudyScopeDecision {
  const prompt = input.replace(/\s+/g, " ").trim();
  if (!prompt) return { allowed: true };

  const utilityRequest = OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(prompt));
  if (utilityRequest && !ACADEMIC_CONTEXT.test(prompt)) {
    return { allowed: false, message: STUDY_SCOPE_MESSAGE };
  }

  return { allowed: true };
}

export function hasClearLearningIntent(input: string): boolean {
  return CLEAR_LEARNING_INTENT.test(input.replace(/\s+/g, " ").trim());
}
