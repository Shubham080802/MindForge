import { describe, expect, it, vi } from "vitest";
import {
  buildGeminiSpeechRequest,
  generateGeminiSpeech,
  pcmToWav,
  prepareSpeechText,
  splitSpeechText,
} from "@/lib/gemini-speech";

describe("Gemini speech generation", () => {
  it("requests exact Hindi speech from an audio-only Flash model", () => {
    const request = buildGeminiSpeechRequest("नमस्ते विद्यार्थी", "hi-IN");

    expect(request.model).toMatch(/flash-tts/);
    expect(request.response_format).toEqual({ type: "audio" });
    expect(request.generation_config.speech_config).toEqual([
      expect.objectContaining({ language: "hi-IN" }),
    ]);
    expect(request.input).toContain("नमस्ते विद्यार्थी");
  });

  it("wraps Gemini PCM output in a browser-playable WAV container", () => {
    const wav = pcmToWav(Uint8Array.from([1, 2, 3, 4]));

    expect(wav.subarray(0, 4).toString()).toBe("RIFF");
    expect(wav.subarray(8, 12).toString()).toBe("WAVE");
    expect(wav.length).toBe(48);
  });

  it("returns a WAV response from Gemini audio data", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      steps: [{
        type: "model_output",
        content: [{
          type: "audio",
          data: Buffer.from([1, 2, 3, 4]).toString("base64"),
          mime_type: "audio/l16",
          sample_rate: 24_000,
          channels: 1,
        }],
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const audio = await generateGeminiSpeech({
      text: "नमस्ते विद्यार्थी",
      locale: "hi-IN",
      apiKey: "test-key",
      fetcher,
    });

    expect(audio.subarray(0, 4).toString()).toBe("RIFF");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("converts network-order L16 samples to little-endian WAV samples", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      steps: [{
        type: "model_output",
        content: [{
          type: "audio",
          data: Buffer.from([0x12, 0x34, 0xab, 0xcd]).toString("base64"),
          mime_type: "audio/l16; rate=24000; channels=1",
        }],
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const audio = await generateGeminiSpeech({
      text: "नमस्ते विद्यार्थी",
      locale: "hi-IN",
      apiKey: "test-key",
      fetcher,
    });

    expect([...audio.subarray(44)]).toEqual([0x34, 0x12, 0xcd, 0xab]);
  });

  it("chunks a full explanation without losing content", () => {
    const text = `${"पहला वाक्य। ".repeat(40)}${"दूसरा वाक्य। ".repeat(40)}`.trim();
    const chunks = splitSpeechText(text, 240);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 240)).toBe(true);
    expect(chunks.join(" ").replaceAll(/\s+/g, " ")).toBe(text.replaceAll(/\s+/g, " "));
  });

  it("removes markdown and source markers before narration", () => {
    expect(prepareSpeechText("## **Supervised Learning**\n- Uses labels [Material 1]."))
      .toBe("Supervised Learning Uses labels .");
  });
});
