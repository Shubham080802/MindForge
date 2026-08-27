"use client";

import { useState } from "react";
import { request } from "@/lib/api";

const DEMO_QUESTIONS = [
  "Explain the difference between supervised and unsupervised learning in your own words.",
  "What are the key trade-offs when choosing between a hash table and a balanced tree?",
  "How would you derive the formula for matrix multiplication step by step?",
  "Describe a real-world scenario where you'd apply the concept of dynamic programming.",
  "What common misconception about this topic does your material warn against?",
];

type EvaluationResult = {
  score: number;
  feedback: string;
  correctPoints: string[];
  missingPoints: string[];
};

const DEMO_MODE = true;

export function PracticePanel({ subjectId }: { subjectId: string }) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = useState<Record<number, EvaluationResult>>({});
  const [evaluatingIdx, setEvaluatingIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function makeQuestions() {
    if (!subjectId) return;
    setBusy(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
        setQuestions(DEMO_QUESTIONS);
        setEvaluations({});
        setUserAnswers({});
      } else {
        const { questions: result } = await request<{ questions: { question: string }[] }>("/api/questions", {
          method: "POST",
          body: JSON.stringify({ subjectId, count: 5 }),
        });
        setQuestions(result.map((item) => item.question));
        setEvaluations({});
        setUserAnswers({});
      }
    } catch {
      alert("Please add and process study materials before generating questions.");
    } finally {
      setBusy(false);
    }
  }

  async function evaluateUserAnswer(idx: number, question: string) {
    const answer = userAnswers[idx]?.trim();
    if (!answer || !subjectId) return;

    setEvaluatingIdx(idx);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
        const score = 65 + Math.floor(Math.random() * 30);
        const evaluation: EvaluationResult = {
          score,
          feedback: score >= 80
            ? "Excellent work! You've captured the core concepts accurately."
            : "Good effort! You're on the right track but missed a few key points. Review the materials on the fundamentals.",
          correctPoints: ["Correctly identified the main principle", "Demonstrated understanding of the basic mechanism"],
          missingPoints: score >= 80 ? ["Minor detail about edge cases"] : ["The trade-offs between approaches", "A concrete real-world example"],
        };
        setEvaluations((current) => ({ ...current, [idx]: evaluation }));
      } else {
        const res = await request<{ evaluation: EvaluationResult }>("/api/questions/evaluate", {
          method: "POST",
          body: JSON.stringify({ subjectId, question, answer }),
        });
        setEvaluations((current) => ({ ...current, [idx]: res.evaluation }));
      }
    } catch {
      alert("Could not evaluate answer. Please try again.");
    } finally {
      setEvaluatingIdx(null);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="practice-panel">
        <button onClick={makeQuestions} disabled={!subjectId || busy} className="btn btn-primary btn-block">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span>{busy ? "Generating…" : "Generate 5 Questions"}</span>
        </button>
        <p className="practice-empty" style={{ marginTop: 24 }}>
          Click above to generate practice questions from your notes.
        </p>
      </div>
    );
  }

  return (
    <div className="practice-panel">
      <button onClick={makeQuestions} disabled={!subjectId || busy} className="btn btn-secondary btn-sm" style={{ marginBottom: 16, width: "100%" }}>
        <span>{busy ? "Generating…" : "Regenerate Questions"}</span>
      </button>

      <div className="quiz-container">
        {questions.map((q, idx) => {
          const evalRes = evaluations[idx];
          return (
            <div key={idx} className="quiz-card">
              <p className="quiz-question">
                <strong>Q{idx + 1}:</strong> {q}
              </p>
              <textarea
                value={userAnswers[idx] ?? ""}
                onChange={(e) => setUserAnswers({ ...userAnswers, [idx]: e.target.value })}
                placeholder="Write your answer..."
                rows={2}
                className="quiz-input"
              />
              <button
                type="button"
                onClick={() => evaluateUserAnswer(idx, q)}
                disabled={evaluatingIdx === idx || !userAnswers[idx]?.trim()}
                className="btn btn-evaluate"
                style={{ alignSelf: "flex-end" }}
              >
                {evaluatingIdx === idx ? "Evaluating..." : "Check Answer"}
              </button>

              {evalRes && (
                <div className="eval-result">
                  <div className="eval-score-row">
                    <span>Score:</span>
                    <span className={`score-badge ${evalRes.score >= 70 ? "high" : "low"}`}>
                      {evalRes.score}%
                    </span>
                  </div>
                  <p className="eval-feedback">{evalRes.feedback}</p>
                  {evalRes.correctPoints?.length > 0 && (
                    <div className="eval-points">
                      <strong>✓ Key Points Covered:</strong>
                      <ul>
                        {evalRes.correctPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {evalRes.missingPoints?.length > 0 && (
                    <div className="eval-points missing">
                      <strong>! Concepts to Review:</strong>
                      <ul>
                        {evalRes.missingPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
