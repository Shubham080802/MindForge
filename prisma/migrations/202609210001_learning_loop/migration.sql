-- Persist generated learning notes and resumable practice independently from chat messages.
CREATE TABLE "StudyArtifact" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeRound" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PracticeRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeQuestion" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "concept" TEXT,
    CONSTRAINT "PracticeQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeResponse" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudyArtifact_sessionId_createdAt_idx" ON "StudyArtifact"("sessionId", "createdAt");
CREATE INDEX "StudyArtifact_sessionId_kind_language_idx" ON "StudyArtifact"("sessionId", "kind", "language");
CREATE INDEX "PracticeRound_sessionId_createdAt_idx" ON "PracticeRound"("sessionId", "createdAt");
CREATE INDEX "PracticeRound_sessionId_completedAt_idx" ON "PracticeRound"("sessionId", "completedAt");
CREATE UNIQUE INDEX "PracticeQuestion_roundId_position_key" ON "PracticeQuestion"("roundId", "position");
CREATE INDEX "PracticeQuestion_roundId_idx" ON "PracticeQuestion"("roundId");
CREATE UNIQUE INDEX "PracticeResponse_questionId_key" ON "PracticeResponse"("questionId");
CREATE INDEX "PracticeResponse_verdict_idx" ON "PracticeResponse"("verdict");

ALTER TABLE "StudyArtifact" ADD CONSTRAINT "StudyArtifact_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeRound" ADD CONSTRAINT "PracticeRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "PracticeRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeResponse" ADD CONSTRAINT "PracticeResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The application reaches these tables only through authenticated server routes.
-- Deny direct anon/authenticated Supabase API access by default.
ALTER TABLE "StudyArtifact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticeRound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticeQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticeResponse" ENABLE ROW LEVEL SECURITY;
