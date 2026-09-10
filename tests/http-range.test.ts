import { describe, expect, it } from "vitest";
import { contentRangeHeader, resolveByteRange, unsatisfiableRangeHeader } from "@/lib/http-range";

const TOTAL = 1_000;

describe("resolveByteRange", () => {
  it("serves the whole payload when no range is requested", () => {
    expect(resolveByteRange(null, TOTAL)).toEqual({ type: "full" });
    expect(resolveByteRange(undefined, TOTAL)).toEqual({ type: "full" });
  });

  // This is the request Chrome's media loader opens a file with.
  it("treats an open-ended range covering everything as a full response", () => {
    expect(resolveByteRange("bytes=0-", TOTAL)).toEqual({ type: "full" });
  });

  it("resolves a bounded range", () => {
    expect(resolveByteRange("bytes=200-499", TOTAL)).toEqual({ type: "partial", start: 200, end: 499 });
  });

  it("resolves an open-ended range from an offset", () => {
    expect(resolveByteRange("bytes=600-", TOTAL)).toEqual({ type: "partial", start: 600, end: 999 });
  });

  it("resolves a suffix range to the final bytes", () => {
    expect(resolveByteRange("bytes=-100", TOTAL)).toEqual({ type: "partial", start: 900, end: 999 });
  });

  it("clamps a suffix longer than the payload to the whole payload", () => {
    expect(resolveByteRange("bytes=-5000", TOTAL)).toEqual({ type: "partial", start: 0, end: 999 });
  });

  it("clamps an end past the payload to the last byte", () => {
    expect(resolveByteRange("bytes=900-5000", TOTAL)).toEqual({ type: "partial", start: 900, end: 999 });
  });

  it("rejects a start beyond the payload", () => {
    expect(resolveByteRange("bytes=1000-", TOTAL)).toEqual({ type: "unsatisfiable" });
    expect(resolveByteRange("bytes=2000-3000", TOTAL)).toEqual({ type: "unsatisfiable" });
  });

  it("rejects an inverted range", () => {
    expect(resolveByteRange("bytes=500-100", TOTAL)).toEqual({ type: "unsatisfiable" });
  });

  it("rejects a zero-length suffix", () => {
    expect(resolveByteRange("bytes=-0", TOTAL)).toEqual({ type: "unsatisfiable" });
  });

  it("falls back to a full response for syntax it does not handle", () => {
    expect(resolveByteRange("bytes=0-99, 200-299", TOTAL)).toEqual({ type: "full" });
    expect(resolveByteRange("items=0-99", TOTAL)).toEqual({ type: "full" });
    expect(resolveByteRange("bytes=abc-def", TOTAL)).toEqual({ type: "full" });
    expect(resolveByteRange("bytes=-", TOTAL)).toEqual({ type: "full" });
  });

  it("cannot satisfy a range against an empty payload", () => {
    expect(resolveByteRange("bytes=0-10", 0)).toEqual({ type: "unsatisfiable" });
  });

  it("tolerates surrounding whitespace", () => {
    expect(resolveByteRange("  bytes=10-20  ", TOTAL)).toEqual({ type: "partial", start: 10, end: 20 });
  });
});

describe("range headers", () => {
  it("formats a partial content range", () => {
    expect(contentRangeHeader(200, 499, TOTAL)).toBe("bytes 200-499/1000");
  });

  it("formats an unsatisfiable range", () => {
    expect(unsatisfiableRangeHeader(TOTAL)).toBe("bytes */1000");
  });
});
