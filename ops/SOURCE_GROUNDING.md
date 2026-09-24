# Source-linked professor answers

The professor now selects up to four short passages from the learner's own
attached materials for each question. Passage selection runs in the application
over text already fetched from PostgreSQL; it makes no embedding request and
requires no vector database, new subscription, schema migration, or extra AI
call. It replaces the former prompt behavior of sending only the first 3,000
characters of every document. The context sent to Gemini is bounded to about
4,000 characters of source text plus the existing conversation and instructions.

Each passage has a marker such as `[S1]`. The professor is instructed to cite
only a passage that supports a factual claim. A saved answer retains references
only for markers it actually uses, as the material ID and exact character
offsets. The workspace renders those markers as buttons. Opening one shows the
extracted passage and the original material; text documents also highlight the
passage in the full extracted text. Previously saved messages keep their older
attached-file preview behavior.

## Current limits

- Upload ingestion saves at most the first 50,000 characters of extracted text
  per material. Questions about later content cannot be grounded until that
  ingestion limit changes.
- Passage ranking is lexical. A question in one language about source text in
  another may fall back to opening passages. The answer should then identify
  any information it cannot establish from those passages.
- PDF extraction currently stores plain text without page coordinates, so the
  viewer shows the exact extracted excerpt above the original PDF. It cannot
  jump to a PDF page or highlight the original page yet.
- A citation points to text the model was shown; it is not an independent
  factual verification of the model's interpretation. The learner can inspect
  the passage directly.

Regression coverage selects text after the former 3,000-character cutoff,
checks exact offsets and bounded context, filters nonexistent markers, and
exercises citation opening in the authenticated browser journey.
