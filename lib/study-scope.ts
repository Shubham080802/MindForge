export const STUDY_SCOPE_MESSAGE = "MindForge is a study-only workspace. Ask about your materials, a concept, an assignment, research, a case study, or a skill you want to understand.";

/**
 * Words that mark analysis rather than an errand. Research and case studies
 * routinely describe hotels, restaurants and trips, so vocabulary about those
 * subjects must never be read as a request for them on its own.
 */
const ACADEMIC_CONTEXT = /\b(?:lesson|study|studies|learn|course|class|homework|assignment|exam|quiz|research|material|document|pdf|chapter|notes?|textbook|history|geography|science|climate|meteorology|tourism|economics?|urban planning|cultural studies|case|report|analy[sz]is|analy[sz]e|evaluate|assess|critique|findings|thesis|dissertation|paper|journal|article|literature|hypothes[ie]s|methodology|survey|dataset|data|swot|framework|strategy|company|companies|business|industry|market|customers?|partners?|operations|management|marketing|finance|pricing|demand|revenue|growth|startup|platform|brand|policy|project|how .{0,40} works?|why (?:did|does|do|is|are|was|were)|how (?:do|does|did) (?!i\b|we\b)\w+)\b/i;

const CLEAR_LEARNING_INTENT = /\b(?:explain|teach|learn|study|define|compare|contrast|analy[sz]e|summari[sz]e|translate|calculate|solve|derive|prove|practice|quiz|question bank|flashcards?|study plan|help me understand|concept|theory|lesson|course|class|homework|assignment|exam|research|material|document|pdf|chapter|notes?|textbook|example|case stud(?:y|ies)|swot|findings|thesis|dissertation|literature review|hypothes[ie]s|methodology)\b/i;

const OUT_OF_SCOPE_PATTERNS = [
  /\bhow(?:'s| is) (?:the )?weather\b|\bwhat(?:'s| is) (?:the )?weather (?:like|today|tomorrow|tonight|outside|this (?:week|weekend))\b|\b(?:weather|forecast|temperature) (?:today|tomorrow|tonight|this (?:week|weekend)|in [\p{L}\s-]+)\b/iu,
  /\b(?:places? to visit|things to do in|travel itinerary|plan (?:my |our |a )?(?:[\w-]+\s+){0,4}trip|where should (?:i|we) (?:go|travel|visit)|book (?:me )?(?:a )?(?:flight|hotel)|find (?:me )?(?:flights?|hotels?)|recommend (?:places|restaurants|hotels|destinations))\b/i,
  /\b(?:directions to|navigate (?:me )?to|traffic (?:to|near|in)|how do i get to)\b/i,
  /\b(?:make (?:a )?reservation|book (?:a )?table|order (?:me )?food|find (?:a )?restaurant near)\b/i,
  /\b(?:tell me a joke|dating advice|write (?:me )?a pickup line|celebrity gossip)\b/i,
] as const;

/**
 * Pattern matching is only trustworthy for short, imperative requests such as
 * "book me a hotel in Madrid". Anything longer is usually pasted material or a
 * considered research question, and deserves semantic judgment, not a keyword.
 */
export const UTILITY_PROMPT_MAX_LENGTH = 200;

export type StudyScopeDecision =
  | { allowed: true }
  | { allowed: false; message: typeof STUDY_SCOPE_MESSAGE };

export interface StudyScopeContext {
  /**
   * The learner has attached study material. Keyword rules cannot see it, so
   * they step aside and the server judges the prompt against the document.
   */
  hasMaterials?: boolean;
}

export function evaluateStudyScope(input: string, context: StudyScopeContext = {}): StudyScopeDecision {
  const prompt = input.replace(/\s+/g, " ").trim();
  if (!prompt || context.hasMaterials || prompt.length > UTILITY_PROMPT_MAX_LENGTH) return { allowed: true };

  const utilityRequest = OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(prompt));
  if (utilityRequest && !ACADEMIC_CONTEXT.test(prompt)) {
    return { allowed: false, message: STUDY_SCOPE_MESSAGE };
  }

  return { allowed: true };
}

export function hasClearLearningIntent(input: string): boolean {
  return CLEAR_LEARNING_INTENT.test(input.replace(/\s+/g, " ").trim());
}

/**
 * Structural markers of study material. A document carrying several of them
 * -- an abstract and references, or a case study's executive summary and
 * recommendations -- is educational without needing a model to say so, and
 * nothing transactional like a receipt or booking confirmation carries three.
 */
const ACADEMIC_SIGNALS = [
  /\babstract\b/i,
  /\bintroduction\b/i,
  /\bconclusions?\b/i,
  /\breferences\b/i,
  /\bbibliography\b/i,
  /\bcitations?\b/i,
  /\bmethodology\b/i,
  /\bliterature review\b/i,
  /\bcase stud(?:y|ies)\b/i,
  /\bhypothes[ie]s\b/i,
  /\bfindings\b/i,
  /\bappendix\b/i,
  /\bchapter \d+|\bchapter [ivx]+\b/i,
  /\bsyllabus\b/i,
  /\blecture\b/i,
  /\blearning (?:objectives|outcomes)\b/i,
  /\bexercises?\b/i,
  /\btheorem\b/i,
  /\b(?:figure|fig\.|table) \d+/i,
  /\bet al\.?/i,
  /\bdoi\b|\b10\.\d{4,9}\//i,
  /\bjournal\b/i,
  /\buniversity\b|\bcollege\b|\binstitute\b/i,
  /\bexecutive summary\b/i,
  /\brecommendations\b/i,
  /\bswot\b/i,
  /\bstakeholders?\b/i,
  /\b(?:respondents|sample size|survey)\b/i,
  /\btable of contents\b/i,
  /\bdiscussion questions?\b/i,
] as const;

export const STRONG_ACADEMIC_SIGNAL_COUNT = 3;

export function countAcademicSignals(text: string): number {
  return ACADEMIC_SIGNALS.filter((signal) => signal.test(text)).length;
}

export function hasStrongAcademicSignals(text: string): boolean {
  return countAcademicSignals(text) >= STRONG_ACADEMIC_SIGNAL_COUNT;
}
