import OpenAI from "openai";

let client: OpenAI | undefined;

/** Create the provider client only when an AI route is actually invoked. */
export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  client ??= new OpenAI({ apiKey });
  return client;
}
