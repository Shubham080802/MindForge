import OpenAI from "openai";

let client: OpenAI | undefined;

export const DEFAULT_AI_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

type AIEnvironment = Record<string, string | undefined> & {
  GEMINI_API_KEY?: string;
  AI_CHAT_MODEL?: string;
};

export function getAIConfig(env: AIEnvironment = process.env) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  return {
    apiKey,
    model: env.AI_CHAT_MODEL?.trim() || DEFAULT_AI_MODEL,
  };
}

/** Create the provider client only when an AI route is actually invoked. */
export function getAIClient() {
  const { apiKey } = getAIConfig();
  client ??= new OpenAI({
    apiKey,
    baseURL: GEMINI_OPENAI_BASE_URL,
    defaultHeaders: { "x-goog-api-client": "mindforge-oai/0.1.0" },
  });
  return client;
}

export function getAIChatModel() {
  return getAIConfig().model;
}
