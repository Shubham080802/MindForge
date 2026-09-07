import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAI } from "@/lib/ai-client";
import { internalError, requireMutation } from "@/lib/request-guard";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VOICE_MAP: Record<string, OpenAI.Audio.SpeechCreateParams["voice"]> = {
  alloy: "alloy",
  echo: "echo",
  fable: "fable",
  onyx: "onyx",
  nova: "nova",
  shimmer: "shimmer",
};

const LANG_VOICE_MAP: Record<string, OpenAI.Audio.SpeechCreateParams["voice"]> = {
  en: "nova",
  es: "nova",
  fr: "nova",
  de: "nova",
  it: "nova",
  pt: "nova",
  hi: "nova",
  ja: "nova",
  ko: "nova",
  zh: "nova",
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;
    await enforceRateLimit(request, "ai", auth.userId);

    const { text, voice, language } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ message: "Text required" }, { status: 400 });
    }

    const selectedVoice = voice || LANG_VOICE_MAP[language || "en"] || "nova";
    const openai = getOpenAI();

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: selectedVoice as OpenAI.Audio.SpeechCreateParams["voice"],
      input: text.trim(),
      response_format: "mp3",
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return internalError("Text to speech", error);
  }
}
