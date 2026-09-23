/** A bounded excerpt from text that is already stored with an owned material. */
export interface SourcePassage {
  id: string;
  materialId: string;
  fileName: string;
  start: number;
  end: number;
  excerpt: string;
}

export type PassageReference = Pick<SourcePassage, "id" | "materialId" | "start" | "end">;

type MaterialText = { id: string; fileName: string; extractedText: string | null };

const PASSAGE_LENGTH = 1000;
const PASSAGE_OVERLAP = 120;
const MAX_PASSAGES = 4;
const MAX_PER_MATERIAL = 2;
const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "can", "could", "describe",
  "does", "explain", "for", "from", "have", "how", "into", "its", "material",
  "materials", "more", "please", "show", "tell", "than", "that", "the", "their",
  "them", "there", "these", "this", "those", "through", "using", "what", "when",
  "where", "which", "why", "with", "would", "your",
]);

function terms(text: string): string[] {
  return [...new Set((text.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])
    .filter((term) => !STOP_WORDS.has(term)))];
}

function splitMaterial(material: MaterialText): Omit<SourcePassage, "id">[] {
  const text = material.extractedText ?? "";
  const passages: Omit<SourcePassage, "id">[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + PASSAGE_LENGTH, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf("\n", end), text.lastIndexOf(" ", end));
      if (boundary > start + PASSAGE_LENGTH * 0.7) end = boundary + 1;
    }

    let excerptStart = start;
    while (excerptStart < end && /\s/u.test(text[excerptStart]!)) excerptStart += 1;
    let excerptEnd = end;
    while (excerptEnd > excerptStart && /\s/u.test(text[excerptEnd - 1]!)) excerptEnd -= 1;

    if (excerptEnd > excerptStart) {
      passages.push({
        materialId: material.id,
        fileName: material.fileName,
        start: excerptStart,
        end: excerptEnd,
        excerpt: text.slice(excerptStart, excerptEnd),
      });
    }
    if (end === text.length) break;
    start = Math.max(start + 1, end - PASSAGE_OVERLAP);
  }

  return passages;
}

function scorePassage(passage: Omit<SourcePassage, "id">, queryTerms: string[]): number {
  const text = passage.excerpt.normalize("NFKC").toLocaleLowerCase();
  const fileName = passage.fileName.normalize("NFKC").toLocaleLowerCase();
  return queryTerms.reduce((score, term) => {
    const matches = text.split(term).length - 1;
    return score + (matches ? 2 + Math.min(matches, 3) : 0) + (fileName.includes(term) ? 1 : 0);
  }, 0);
}

/**
 * Search the text already loaded from the learner's owned session. No model,
 * embedding API, vector service, migration, or duplicate passage storage.
 */
export function selectSourcePassages(materials: MaterialText[], question: string): SourcePassage[] {
  const queryTerms = terms(question);
  const candidates = materials.flatMap(splitMaterial);
  const ranked = candidates
    .map((passage, order) => ({ passage, order, score: scorePassage(passage, queryTerms) }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
  const hasMatch = ranked.some((candidate) => candidate.score > 0);
  const selected: Omit<SourcePassage, "id">[] = [];
  const perMaterial = new Map<string, number>();

  for (const candidate of ranked) {
    if (hasMatch && candidate.score === 0) break;
    const count = perMaterial.get(candidate.passage.materialId) ?? 0;
    if (count >= (hasMatch ? MAX_PER_MATERIAL : 1)) continue;
    selected.push(candidate.passage);
    perMaterial.set(candidate.passage.materialId, count + 1);
    if (selected.length === MAX_PASSAGES) break;
  }

  return selected.map((passage, index) => ({ ...passage, id: `S${index + 1}` }));
}

/** Persist only references that the answer actually cites, not every candidate. */
export function citedPassages(answer: string, passages: SourcePassage[]): PassageReference[] {
  const citedIds = new Set([...answer.matchAll(/\[(S\d+)]/g)].map((match) => match[1]));
  return passages
    .filter((passage) => citedIds.has(passage.id))
    .map(({ id, materialId, start, end }) => ({ id, materialId, start, end }));
}
