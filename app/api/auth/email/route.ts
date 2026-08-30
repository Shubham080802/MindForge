import { emailHandlers } from "@/lib/auth/email";

export const runtime = "nodejs";

export const { GET, POST } = emailHandlers;