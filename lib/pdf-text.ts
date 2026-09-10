/**
 * PDF export uses pdf-lib's standard Helvetica, which can only encode WinAnsi
 * (CP1252). Study material routinely contains characters outside that set --
 * Greek letters, arrows, integrals, subscripts -- and drawing any one of them
 * throws, which previously turned a whole export into an HTTP 500.
 *
 * This module is the single seam between arbitrary study text and the PDF
 * canvas. It transliterates the symbols a learner actually meets, drops what
 * cannot survive, and reports how much meaning was lost so callers can refuse
 * to emit a PDF that would silently be blank.
 */

const CP1252_HIGH_RANGE =
  "€‚ƒ„…†‡ˆ‰Š‹ŒŽ"
  + "‘’“”•–—˜™š›œžŸ";

/** Exactly the code points pdf-lib's WinAnsi encoding accepts. */
const ENCODABLE = new Set<string>([
  ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)),
  ...Array.from({ length: 0xff - 0xa0 + 1 }, (_, i) => String.fromCharCode(0xa0 + i)),
  ...CP1252_HIGH_RANGE,
  "\n",
  "\t",
]);

/**
 * Readable ASCII stand-ins for the symbols that appear most often in study
 * notes. Spelling out Greek letters keeps a formula legible rather than
 * silently deleting the variable it names.
 */
const TRANSLITERATIONS: Record<string, string> = {
  "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta",
  "ε": "epsilon", "ζ": "zeta", "η": "eta", "θ": "theta",
  "ι": "iota", "κ": "kappa", "λ": "lambda", "μ": "mu",
  "ν": "nu", "ξ": "xi", "π": "pi", "ρ": "rho",
  "σ": "sigma", "τ": "tau", "υ": "upsilon", "φ": "phi",
  "χ": "chi", "ψ": "psi", "ω": "omega",
  "Γ": "Gamma", "Δ": "Delta", "Θ": "Theta", "Λ": "Lambda",
  "Π": "Pi", "Σ": "Sigma", "Φ": "Phi", "Ψ": "Psi", "Ω": "Omega",

  "→": "->", "←": "<-", "↔": "<->", "⇒": "=>", "⇐": "<=",
  "⇔": "<=>", "↑": "^", "↓": "v",

  "≤": "<=", "≥": ">=", "≠": "!=", "≈": "~=", "≡": "===",
  "∞": "infinity", "√": "sqrt", "∫": "integral", "∑": "sum",
  "∏": "product", "∂": "d", "∇": "grad", "∈": "in",
  "∉": "not in", "⊂": "subset", "⊆": "subset=", "∪": "union",
  "∩": "intersect", "∅": "empty set", "∀": "for all",
  "∃": "exists", "∴": "therefore", "∵": "because",
  "·": "*", "′": "'", "″": "\"",

  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  "⁰": "^0", "¹": "^1", "²": "^2", "³": "^3", "⁴": "^4",
  "⁵": "^5", "⁶": "^6", "⁷": "^7", "⁸": "^8", "⁹": "^9",

  "…": "...", "‐": "-", "‑": "-", "‒": "-", "―": "-",
  " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
  "​": "", "﻿": "",
};

const MEANINGFUL = /[\p{L}\p{N}]/u;

export interface PdfSafeText {
  /** Text guaranteed to be drawable with pdf-lib's standard Helvetica. */
  text: string;
  /** Letters and digits that no Latin glyph could represent. */
  droppedCharacters: number;
  /** Letters and digits present in the source. */
  meaningfulCharacters: number;
}

export function toPdfSafeText(input: string): PdfSafeText {
  let text = "";
  let droppedCharacters = 0;
  let meaningfulCharacters = 0;

  for (const character of input) {
    const meaningful = MEANINGFUL.test(character);
    if (meaningful) meaningfulCharacters += 1;

    if (ENCODABLE.has(character)) {
      text += character;
      continue;
    }

    const replacement = TRANSLITERATIONS[character];
    if (replacement !== undefined) {
      text += replacement;
      continue;
    }

    if (meaningful) droppedCharacters += 1;
  }

  return { text, droppedCharacters, meaningfulCharacters };
}

/**
 * A PDF that has lost most of its words is worse than an honest refusal, so
 * callers use this to divert the learner to Markdown or JSON export instead.
 */
const UNSUPPORTED_MINIMUM_DROPPED = 8;
const UNSUPPORTED_DROPPED_SHARE = 0.1;

export interface PdfScriptSupport {
  supported: boolean;
  droppedCharacters: number;
  meaningfulCharacters: number;
}

export function assessPdfScriptSupport(sections: string[]): PdfScriptSupport {
  let droppedCharacters = 0;
  let meaningfulCharacters = 0;

  for (const section of sections) {
    const result = toPdfSafeText(section);
    droppedCharacters += result.droppedCharacters;
    meaningfulCharacters += result.meaningfulCharacters;
  }

  const supported = droppedCharacters < UNSUPPORTED_MINIMUM_DROPPED
    || droppedCharacters / Math.max(meaningfulCharacters, 1) <= UNSUPPORTED_DROPPED_SHARE;

  return { supported, droppedCharacters, meaningfulCharacters };
}

export const PDF_SCRIPT_UNSUPPORTED_MESSAGE =
  "This session's writing system cannot be rendered in PDF export yet. "
  + "Export it as Markdown or JSON, which preserve every character.";
