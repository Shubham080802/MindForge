import { describe, expect, it } from "vitest";
import {
  SPEECH_CHUNK_LENGTH,
  SPEECH_LEAD_CHUNK_LENGTH,
  prepareSpeechText,
  splitSpeechText,
} from "@/lib/speech-text";

const sentence = "Mitochondria convert chemical energy into ATP for the cell. ";

describe("splitSpeechText", () => {
  it("keeps the first chunk short so playback can start quickly", () => {
    const [lead] = splitSpeechText(sentence.repeat(40));

    expect(lead.length).toBeLessThanOrEqual(SPEECH_LEAD_CHUNK_LENGTH);
  });

  it("uses the full chunk length after the lead", () => {
    const chunks = splitSpeechText(sentence.repeat(40));

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks.slice(1)) {
      expect(chunk.length).toBeLessThanOrEqual(SPEECH_CHUNK_LENGTH);
    }
    expect(chunks.slice(1).some((chunk) => chunk.length > SPEECH_LEAD_CHUNK_LENGTH)).toBe(true);
  });

  it("never loses or reorders words", () => {
    const source = sentence.repeat(30).trim();

    expect(splitSpeechText(source).join(" ")).toBe(source.replaceAll(/\s+/g, " "));
  });

  it("returns a single chunk for a short reply", () => {
    expect(splitSpeechText("Photosynthesis converts light into chemical energy."))
      .toEqual(["Photosynthesis converts light into chemical energy."]);
  });

  it("returns nothing for empty text", () => {
    expect(splitSpeechText("   ")).toEqual([]);
  });

  it("splits a single word that exceeds the lead budget", () => {
    const chunks = splitSpeechText("x".repeat(SPEECH_LEAD_CHUNK_LENGTH + 50));

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.length).toBe(SPEECH_LEAD_CHUNK_LENGTH);
    expect(chunks.join("")).toBe("x".repeat(SPEECH_LEAD_CHUNK_LENGTH + 50));
  });

  it("honours explicit lengths so callers can override the defaults", () => {
    expect(splitSpeechText("one two three four five", 10, 4)).toEqual(["one", "two three", "four five"]);
  });

  // The client counts chunks and the server slices by index; they must agree.
  it("is deterministic for the same input", () => {
    const source = sentence.repeat(25);

    expect(splitSpeechText(source)).toEqual(splitSpeechText(source));
  });

  it("splits multilingual replies without dropping characters", () => {
    const hindi = "माइटोकॉन्ड्रिया कोशिका का ऊर्जा घर है। ".repeat(20);
    const chunks = splitSpeechText(hindi);

    expect(chunks.join(" ")).toBe(hindi.replaceAll(/\s+/g, " ").trim());
  });
});

describe("prepareSpeechText", () => {
  it("removes markdown and citation markers the professor should not read aloud", () => {
    const spoken = prepareSpeechText("## Heading\n- **Bold** point [Material 1]\n`code`");

    expect(spoken).toBe("Heading Bold point code");
  });
});
