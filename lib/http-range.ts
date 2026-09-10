/**
 * Byte-range handling for audio responses.
 *
 * Chrome's media loader opens a file with `Range: bytes=0-`. Answering that
 * with a plain 200 and no range headers leaves the media element stalled at
 * readyState 0 even though the bytes arrive -- a plain fetch of the same URL
 * completes in under a second, which is what makes the failure so confusing.
 * Advertising `Accept-Ranges` and answering with 206 is what lets playback
 * start, and it is also what makes seeking work.
 */

export type ByteRange =
  | { type: "full" }
  | { type: "partial"; start: number; end: number }
  | { type: "unsatisfiable" };

/**
 * Resolves a single byte range against a known payload size. Multi-range
 * requests are answered in full, which is allowed and is what media players
 * expect in practice.
 */
export function resolveByteRange(header: string | null | undefined, totalBytes: number): ByteRange {
  if (!header) return { type: "full" };

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return { type: "full" };

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return { type: "full" };
  if (totalBytes === 0) return { type: "unsatisfiable" };

  // `bytes=-500` asks for the final 500 bytes.
  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return { type: "unsatisfiable" };
    const start = Math.max(0, totalBytes - suffixLength);
    return { type: "partial", start, end: totalBytes - 1 };
  }

  const start = Number(rawStart);
  if (!Number.isFinite(start) || start >= totalBytes) return { type: "unsatisfiable" };

  const end = rawEnd ? Math.min(Number(rawEnd), totalBytes - 1) : totalBytes - 1;
  if (!Number.isFinite(end) || end < start) return { type: "unsatisfiable" };

  // A request for the whole payload is cheaper to answer as a normal 200.
  if (start === 0 && end === totalBytes - 1) return { type: "full" };

  return { type: "partial", start, end };
}

export function contentRangeHeader(start: number, end: number, totalBytes: number): string {
  return `bytes ${start}-${end}/${totalBytes}`;
}

export function unsatisfiableRangeHeader(totalBytes: number): string {
  return `bytes */${totalBytes}`;
}
