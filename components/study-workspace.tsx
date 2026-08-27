"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Subject = { id: string; name: string; description: string | null; created_at: string };
type Material = {
  id: string;
  subject_id: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  processing_status: "pending" | "ready" | "failed";
  created_at: string;
};
type Message = { id?: string; role: "user" | "assistant"; content: string; created_at?: string };

type EvaluationResult = {
  score: number;
  feedback: string;
  correctPoints: string[];
  missingPoints: string[];
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudyWorkspace({ initialSubjects }: { initialSubjects: Subject[] }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [selectedId, setSelectedId] = useState(initialSubjects[0]?.id ?? "");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = useState<Record<number, EvaluationResult>>({});
  const [evaluatingIdx, setEvaluatingIdx] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "info" | "error" | "success" }>();
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);
  const [showMaterialsList, setShowMaterialsList] = useState(false);

  const selected = useMemo(() => subjects.find((s) => s.id === selectedId), [subjects, selectedId]);

  // Load materials and conversation history when subject selection changes
  useEffect(() => {
    if (!selectedId) return;
    let isCurrent = true;

    async function loadSubjectData() {
      try {
        // Load materials list
        const matRes = await request<{ materials: Material[] }>(`/api/materials?subjectId=${selectedId}`);
        if (isCurrent) setMaterials(matRes.materials);

        // Load conversation history
        const convRes = await request<{ conversation: { id: string } | null; messages: Message[] }>(
          `/api/conversations?subjectId=${selectedId}`
        );
        if (isCurrent) {
          if (convRes.conversation) {
            setConversationId(convRes.conversation.id);
            setMessages(convRes.messages);
          } else {
            setConversationId(undefined);
            setMessages([]);
          }
          setQuestions([]);
          setEvaluations({});
          setUserAnswers({});
        }
      } catch {
        if (isCurrent) {
          setNotice({ text: "Could not load data for this subject.", type: "error" });
        }
      }
    }

    loadSubjectData();
    return () => {
      isCurrent = false;
    };
  }, [selectedId]);

  async function createSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    setBusy(true);
    setNotice(undefined);
    try {
      const { subject } = await request<{ subject: Subject }>("/api/subjects", {
        method: "POST",
        body: JSON.stringify({ name, description: String(form.get("description") ?? "") }),
      });
      setSubjects((current) => [subject, ...current]);
      setSelectedId(subject.id);
      event.currentTarget.reset();
      setNotice({ text: "Subject created successfully.", type: "success" });
    } catch {
      setNotice({ text: "Could not create that subject.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubject() {
    if (!selectedId || !selected) return;
    if (!confirm(`Are you sure you want to delete "${selected.name}" and all its study materials?`)) return;

    setBusy(true);
    try {
      await request<{ success: boolean }>(`/api/subjects/${selectedId}`, { method: "DELETE" });
      const updated = subjects.filter((s) => s.id !== selectedId);
      setSubjects(updated);
      setSelectedId(updated[0]?.id ?? "");
      setNotice({ text: "Subject deleted.", type: "info" });
    } catch {
      setNotice({ text: "Failed to delete subject.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function uploadMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    form.set("subjectId", selectedId);
    setBusy(true);
    setNotice(undefined);
    try {
      const response = await fetch("/api/materials", { method: "POST", body: form });
      if (!response.ok) throw new Error();
      setNotice({ text: "Study material processed and indexed.", type: "success" });
      event.currentTarget.reset();

      // Refresh materials list
      const matRes = await request<{ materials: Material[] }>(`/api/materials?subjectId=${selectedId}`);
      setMaterials(matRes.materials);
    } catch {
      setNotice({ text: "Material processing failed. Check file type (PDF, DOCX, TXT, MD) and size.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteMaterial(materialId: string) {
    if (!confirm("Remove this study material?")) return;
    setBusy(true);
    try {
      await request(`/api/materials/${materialId}`, { method: "DELETE" });
      setMaterials((current) => current.filter((m) => m.id !== materialId));
      setNotice({ text: "Material deleted.", type: "info" });
    } catch {
      setNotice({ text: "Could not delete material.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    const prompt = String(form.get("prompt") ?? "").trim();
    if (!prompt) return;

    setBusy(true);
    setNotice(undefined);
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    event.currentTarget.reset();

    try {
      let id = conversationId;
      if (!id) {
        const created = await request<{ conversation: { id: string } }>("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ subjectId: selectedId }),
        });
        id = created.conversation.id;
        setConversationId(id);
      }
      const { message } = await request<{ message: Message }>(`/api/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      setMessages((current) => [...current, { role: "assistant", content: message.content }]);
    } catch {
      setMessages((current) => current.slice(0, -1));
      setNotice({ text: "I could not answer that question. Ensure you have processed study materials.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function makeQuestions() {
    if (!selectedId) return;
    setBusy(true);
    setNotice(undefined);
    try {
      const { questions: result } = await request<{ questions: { question: string }[] }>("/api/questions", {
        method: "POST",
        body: JSON.stringify({ subjectId: selectedId, count: 5 }),
      });
      setQuestions(result.map((item) => item.question));
      setEvaluations({});
      setUserAnswers({});
      setNotice({ text: "5 self-check practice questions generated!", type: "success" });
    } catch {
      setNotice({ text: "Please add and process study materials before generating questions.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function evaluateUserAnswer(idx: number, question: string) {
    const answer = userAnswers[idx]?.trim();
    if (!answer || !selectedId) return;

    setEvaluatingIdx(idx);
    try {
      const res = await request<{ evaluation: EvaluationResult }>("/api/questions/evaluate", {
        method: "POST",
        body: JSON.stringify({ subjectId: selectedId, question, answer }),
      });
      setEvaluations((current) => ({ ...current, [idx]: res.evaluation }));
    } catch {
      setNotice({ text: "Could not evaluate answer. Please try again.", type: "error" });
    } finally {
      setEvaluatingIdx(null);
    }
  }

  function toggleSpeech(text: string, msgIndex: number) {
    if (playingMsgIndex === msgIndex) {
      window.speechSynthesis.cancel();
      setPlayingMsgIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setPlayingMsgIndex(null);
    utterance.onerror = () => setPlayingMsgIndex(null);
    setPlayingMsgIndex(msgIndex);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="app-shell">
      {/* Header */}
      <header className="workspace-header">
        <div className="brand">
          <div className="logo-icon">🎓</div>
          <div>
            <p className="eyebrow">
              STUDY ROOM <span className="badge">Private RAG Workspace</span>
            </p>
            <h1>Study at your own pace</h1>
          </div>
        </div>
        <form action="/auth/logout" method="post">
          <button type="submit" className="button-logout">
            Sign out
          </button>
        </form>
      </header>

      <section className="grid-workspace">
        {/* Sidebar: Subjects & Materials */}
        <aside className="card sidebar-card">
          <div className="section-label">Your Subjects</div>

          <form onSubmit={createSubject} className="subject-form">
            <input name="name" maxLength={120} placeholder="e.g. Computer Science" required />
            <textarea name="description" maxLength={2000} placeholder="Subject focus or goals" rows={2} />
            <button type="submit" disabled={busy} className="button-primary">
              + Add Subject
            </button>
          </form>

          <div className="subject-list">
            {subjects.length === 0 && <p className="empty-text">No subjects yet. Create one above!</p>}
            {subjects.map((sub) => (
              <button
                key={sub.id}
                className={`subject-item ${sub.id === selectedId ? "active" : ""}`}
                onClick={() => setSelectedId(sub.id)}
              >
                <div className="subject-info">
                  <span className="subject-name">{sub.name}</span>
                  {sub.description && <span className="subject-desc">{sub.description}</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Panel: Current Subject & Tutor Chat */}
        <section className="card main-workspace-card">
          {selected ? (
            <>
              <div className="subject-header">
                <div>
                  <div className="section-label">Active Subject</div>
                  <h2>{selected.name}</h2>
                </div>
                <div className="header-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setShowMaterialsList(!showMaterialsList)}
                  >
                    📂 Materials ({materials.length})
                  </button>
                  <button type="button" className="button-danger" onClick={deleteSubject} disabled={busy}>
                    🗑️ Delete Subject
                  </button>
                </div>
              </div>

              {/* Upload & Materials Drawer */}
              <div className={`materials-panel ${showMaterialsList ? "open" : ""}`}>
                <form onSubmit={uploadMaterial} className="upload-form">
                  <label className="dropzone">
                    <span className="dropzone-text">📁 Upload Lecture Notes, Slides, PDF, or DOCX</span>
                    <input
                      name="file"
                      type="file"
                      accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      required
                    />
                  </label>
                  <button type="submit" disabled={busy} className="button-primary">
                    Upload & Index
                  </button>
                </form>

                {materials.length > 0 && (
                  <div className="materials-list">
                    <h4>Uploaded Study Materials</h4>
                    <ul>
                      {materials.map((mat) => (
                        <li key={mat.id} className="material-item">
                          <div className="material-meta">
                            <span className="file-icon">📄</span>
                            <span className="file-name">{mat.original_name}</span>
                            <span className="file-size">{formatBytes(mat.byte_size)}</span>
                            <span className={`status-badge ${mat.processing_status}`}>{mat.processing_status}</span>
                          </div>
                          <button
                            type="button"
                            className="button-icon-delete"
                            onClick={() => deleteMaterial(mat.id)}
                            title="Delete file"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Conversation Area */}
              <div className="chat-container">
                {messages.length === 0 ? (
                  <div className="chat-welcome">
                    <div className="welcome-icon">💬</div>
                    <h3>Start Grounded Study Conversation</h3>
                    <p>
                      Ask questions about your uploaded materials. The tutor will provide clear, verified explanations with exact source citations.
                    </p>
                  </div>
                ) : (
                  <div className="messages-list">
                    {messages.map((msg, idx) => (
                      <article key={idx} className={`message-bubble ${msg.role}`}>
                        <div className="message-header">
                          <strong>{msg.role === "user" ? "You" : "🤖 Study Partner"}</strong>
                          {msg.role === "assistant" && (
                            <button
                              type="button"
                              className={`button-audio ${playingMsgIndex === idx ? "playing" : ""}`}
                              onClick={() => toggleSpeech(msg.content, idx)}
                            >
                              {playingMsgIndex === idx ? "🔊 Stop" : "🔈 Listen"}
                            </button>
                          )}
                        </div>
                        <div className="message-content">{msg.content}</div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={sendMessage} className="prompt-form">
                <textarea
                  name="prompt"
                  maxLength={8000}
                  placeholder="Ask for an explanation, example, or clarification from your notes..."
                  required
                  rows={2}
                />
                <button type="submit" disabled={busy} className="button-send">
                  Ask Tutor ➔
                </button>
              </form>
            </>
          ) : (
            <div className="no-selection">
              <h3>No Subject Selected</h3>
              <p>Select a subject from the sidebar or create a new one to start studying.</p>
            </div>
          )}
        </section>

        {/* Practice Panel: Self-Check Quiz & AI Evaluator */}
        <aside className="card practice-card">
          <div className="section-label">Self-Check & Quiz</div>
          <h2>Interactive Practice</h2>
          <p className="supporting">Test your recall with AI-generated questions grounded in your notes.</p>

          <button onClick={makeQuestions} disabled={!selected || busy} className="button-quiz-generate">
            ⚡ Generate 5 Questions
          </button>

          {questions.length > 0 && (
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
                      className="button-evaluate"
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
          )}
        </aside>
      </section>

      {/* Toast Notice */}
      {notice && (
        <div className={`toast-notice ${notice.type}`} role="status">
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(undefined)}>
            ×
          </button>
        </div>
      )}
    </main>
  );
}
