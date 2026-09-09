import { describe, expect, it } from "vitest";
import { evaluateStudyScope, hasClearLearningIntent, STUDY_SCOPE_MESSAGE } from "@/lib/study-scope";

describe("study-only scope", () => {
  it.each([
    "How is the weather today?",
    "I want to go to Paris, look for places to visit",
    "Plan a three day trip to Rome",
    "Book me a hotel in Madrid",
    "Give me directions to the airport",
  ])("rejects utility request: %s", (prompt) => {
    expect(evaluateStudyScope(prompt)).toEqual({ allowed: false, message: STUDY_SCOPE_MESSAGE });
  });

  it.each([
    "Explain how weather forecasting models work",
    "For my geography assignment, compare the climates of Delhi and Mumbai",
    "Using Material 1, analyze the economic effects of tourism",
    "Teach me supervised learning with a simple example",
  ])("allows genuine learning request: %s", (prompt) => {
    expect(evaluateStudyScope(prompt)).toEqual({ allowed: true });
  });

  it("sends ambiguous requests to the strict semantic classifier", () => {
    expect(hasClearLearningIntent("What is machine learning?")).toBe(false);
    expect(hasClearLearningIntent("Teach me machine learning")).toBe(true);
  });
});
