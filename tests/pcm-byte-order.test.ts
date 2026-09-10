import { describe, expect, it } from "vitest";
import { swapByteOrder, toLittleEndianPcm, zeroCrossingRate } from "@/lib/gemini-speech";

/** A slow waveform with pauses: the shape real speech has. */
function speechLike(samples = 6_000): Uint8Array {
  const pcm = new Uint8Array(samples * 2);
  const view = new DataView(pcm.buffer);
  for (let index = 0; index < samples; index += 1) {
    const silent = Math.floor(index / 800) % 3 === 2;
    const value = silent ? 0 : Math.round(Math.sin(index / 12) * 8_000);
    view.setInt16(index * 2, value, true);
  }
  return pcm;
}

describe("zeroCrossingRate", () => {
  it("is low for speech-shaped audio", () => {
    expect(zeroCrossingRate(speechLike())).toBeLessThan(0.2);
  });

  it("is high when the same bytes are read in the wrong order", () => {
    expect(zeroCrossingRate(swapByteOrder(speechLike()))).toBeGreaterThan(0.3);
  });

  it("handles payloads too short to measure", () => {
    expect(zeroCrossingRate(new Uint8Array([]))).toBe(0);
    expect(zeroCrossingRate(new Uint8Array([1, 2]))).toBe(0);
  });
});

describe("swapByteOrder", () => {
  it("exchanges each sample's bytes without mutating the source", () => {
    const source = new Uint8Array([1, 2, 3, 4]);

    expect(Array.from(swapByteOrder(source))).toEqual([2, 1, 4, 3]);
    expect(Array.from(source)).toEqual([1, 2, 3, 4]);
  });

  it("leaves a trailing odd byte alone", () => {
    expect(Array.from(swapByteOrder(new Uint8Array([1, 2, 9])))).toEqual([2, 1, 9]);
  });
});

describe("toLittleEndianPcm", () => {
  it("keeps audio that is already little-endian", () => {
    const speech = speechLike();
    const result = toLittleEndianPcm(speech);

    expect(result.swapped).toBe(false);
    expect(Array.from(result.pcm)).toEqual(Array.from(speech));
  });

  // The production failure: big-endian samples wrapped as little-endian WAV,
  // which a listener hears as continuous buzzing.
  it("recovers big-endian audio that arrived mislabelled", () => {
    const bigEndian = swapByteOrder(speechLike());
    const result = toLittleEndianPcm(bigEndian);

    expect(result.swapped).toBe(true);
    expect(Array.from(result.pcm)).toEqual(Array.from(speechLike()));
  });

  it("produces audio with a speech-like crossing rate either way", () => {
    for (const source of [speechLike(), swapByteOrder(speechLike())]) {
      expect(zeroCrossingRate(toLittleEndianPcm(source).pcm)).toBeLessThan(0.2);
    }
  });

  it("does not throw on an empty payload", () => {
    expect(toLittleEndianPcm(new Uint8Array([])).pcm.byteLength).toBe(0);
  });

  it("falls back to the declared mime type when the payload is too short to measure", () => {
    const tiny = new Uint8Array([0x12, 0x34, 0xab, 0xcd]);

    expect(Array.from(toLittleEndianPcm(tiny, "audio/L16;rate=24000").pcm)).toEqual([0x34, 0x12, 0xcd, 0xab]);
    expect(Array.from(toLittleEndianPcm(tiny).pcm)).toEqual([0x12, 0x34, 0xab, 0xcd]);
  });

  it("ignores a mime label that contradicts a measurable payload", () => {
    const speech = speechLike();

    // Labelled big-endian, but the bytes are already speech-shaped as they are.
    expect(toLittleEndianPcm(speech, "audio/L16;rate=24000").swapped).toBe(false);
  });
});
