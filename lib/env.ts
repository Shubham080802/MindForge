import { z } from "zod";
import { DEMO_MODE } from "@/lib/config";

const serverSchema = z.object({
  APP_ORIGIN: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_OAUTH_PROVIDER: z.string().regex(/^[a-z_]+$/),
  OPENAI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1),
  EMBEDDING_MODEL: z.string().min(1),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(52_428_800),
  RATE_LIMIT_REQUESTS: z.coerce.number().int().positive().max(1_000),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().max(3_600),
});

type Env = z.infer<typeof serverSchema>;

const raw = {
  APP_ORIGIN: process.env.APP_ORIGIN,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_OAUTH_PROVIDER: process.env.SUPABASE_OAUTH_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
  RATE_LIMIT_REQUESTS: process.env.RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS: process.env.RATE_LIMIT_WINDOW_SECONDS,
};

const demoEnv: Env = {
  APP_ORIGIN: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "demo",
  SUPABASE_OAUTH_PROVIDER: "github",
  OPENAI_API_KEY: "demo",
  AI_MODEL: "demo",
  EMBEDDING_MODEL: "demo",
  EMBEDDING_DIMENSIONS: 1536,
  UPSTASH_REDIS_REST_URL: "https://demo.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "demo",
  MAX_UPLOAD_BYTES: 10_000_000,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW_SECONDS: 60,
};

export const env = DEMO_MODE ? demoEnv : serverSchema.parse(raw);
