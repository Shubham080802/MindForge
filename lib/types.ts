export type Subject = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Material = {
  id: string;
  subject_id: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  processing_status: "pending" | "ready" | "failed";
  created_at: string;
};

export type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  created_at?: string;
};

export type EvaluationResult = {
  score: number;
  feedback: string;
  correctPoints: string[];
  missingPoints: string[];
};
