import { describe, expect, it } from "vitest";
import {
  countAcademicSignals,
  evaluateStudyScope,
  hasClearLearningIntent,
  hasStrongAcademicSignals,
  STUDY_SCOPE_MESSAGE,
  UTILITY_PROMPT_MAX_LENGTH,
} from "@/lib/study-scope";

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

  it("sends ambiguous requests to the semantic classifier", () => {
    expect(hasClearLearningIntent("What is machine learning?")).toBe(false);
    expect(hasClearLearningIntent("Teach me machine learning")).toBe(true);
  });
});

// Each of these was blocked outright by keyword rules before the fix: they
// describe businesses whose subject is restaurants, travel and hotels.
describe("research and case studies", () => {
  it.each([
    "Airbnb growth case: hosts recommend restaurants to guests and help them find places to visit. What went wrong for hosts in 2020?",
    "Swiggy operations: customers order food from restaurants near them. Evaluate the unit economics.",
    "Zomato's challenge: how do diners book a table at partner restaurants, and why did partners leave?",
    "Uber surge pricing research: what happens to traffic in Bangalore when it rains?",
  ])("is not blocked by keywords: %s", (prompt) => {
    expect(evaluateStudyScope(prompt)).toEqual({ allowed: true });
  });

  it.each([
    "Give me the SWOT of the company in this case study",
    "What are the findings of this research?",
    "Critique the methodology of this dissertation",
  ])("is recognised as learning without a model call: %s", (prompt) => {
    expect(hasClearLearningIntent(prompt)).toBe(true);
  });

  it("leaves keyword rules to short requests and judges longer text semantically", () => {
    const pasted = `Book a table ${"at the flagship restaurant ".repeat(12)}`.trim();

    expect(pasted.length).toBeGreaterThan(UTILITY_PROMPT_MAX_LENGTH);
    expect(evaluateStudyScope(pasted)).toEqual({ allowed: true });
  });

  it("steps aside entirely when the learner has attached material", () => {
    expect(evaluateStudyScope("Book me a hotel in Madrid", { hasMaterials: true })).toEqual({ allowed: true });
  });
});

describe("academic signals in material", () => {
  it("recognises a research paper by its structure", () => {
    const paper = "Abstract. This study examines tourism demand. Introduction ... Methodology ... Findings ... References: Smith et al. 2021.";

    expect(countAcademicSignals(paper)).toBeGreaterThanOrEqual(3);
    expect(hasStrongAcademicSignals(paper)).toBe(true);
  });

  it("recognises a business case study by its structure", () => {
    const caseStudy = "Case Study: The Oberoi Group. Executive Summary ... Stakeholders ... SWOT ... Recommendations ... Discussion Questions";

    expect(hasStrongAcademicSignals(caseStudy)).toBe(true);
  });

  it.each([
    "Booking confirmed. Hotel Plaza, Madrid. Check-in 12 June. Total 240 EUR. Reference ABX921.",
    "Margherita pizza 9.50\nPasta arrabbiata 11.00\nTiramisu 6.00\nService not included",
  ])("does not mistake transactional text for study material: %s", (text) => {
    expect(hasStrongAcademicSignals(text)).toBe(false);
  });
});
