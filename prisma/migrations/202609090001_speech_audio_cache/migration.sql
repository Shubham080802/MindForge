CREATE TABLE "SpeechAudio" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "audio" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpeechAudio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpeechAudio_messageId_chunkIndex_model_key"
ON "SpeechAudio"("messageId", "chunkIndex", "model");

CREATE INDEX "SpeechAudio_messageId_idx" ON "SpeechAudio"("messageId");

ALTER TABLE "SpeechAudio" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "SpeechAudio" ADD CONSTRAINT "SpeechAudio_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
