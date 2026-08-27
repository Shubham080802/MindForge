"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PracticePanel } from "@/components/practice-panel";
import { request } from "@/lib/api";

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
type Message = { id?: string; role: "user" | "assistant"; content: string; images?: string[]; created_at?: string };

type EvaluationResult = {
  score: number;
  feedback: string;
  correctPoints: string[];
  missingPoints: string[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showToast(message: string, type: "success" | "error" | "info" = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <span class="toast-content">${message}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  toast.querySelector(".toast-close")?.addEventListener("click", () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}

const DEMO_MODE = true;

const DEMO_MATERIALS: Record<string, Material[]> = {
  "1": [
    { id: "m1", subject_id: "1", original_name: "lecture-notes-week1.pdf", mime_type: "application/pdf", byte_size: 245760, processing_status: "ready", created_at: "2024-01-15T10:00:00Z" },
    { id: "m2", subject_id: "1", original_name: "algorithms-cheatsheet.md", mime_type: "text/markdown", byte_size: 12288, processing_status: "ready", created_at: "2024-01-16T14:00:00Z" },
  ],
  "2": [
    { id: "m3", subject_id: "2", original_name: "deep-learning-lecture.pdf", mime_type: "application/pdf", byte_size: 1048576, processing_status: "ready", created_at: "2024-01-20T14:30:00Z" },
  ],
  "3": [
    { id: "m4", subject_id: "3", original_name: "linear-algebra-notes.docx", mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", byte_size: 512000, processing_status: "ready", created_at: "2024-02-01T09:15:00Z" },
  ],
};

const DEMO_RESPONSES = [
  "Great question! Based on your uploaded materials, here's a clear explanation:\n\n**Key concept:** The fundamental idea is that you build understanding incrementally. Start with the basics, then layer complexity.\n\n**From your notes:** Your lecture notes emphasize the importance of practice and repetition. The cheatsheet suggests focusing on the 20% of topics that cover 80% of use cases.\n\n**Quick example:** Think of it like learning a language — you don't memorize the dictionary, you start with common phrases.\n\nWould you like me to elaborate on any specific part?",
  "Here's how I'd approach this based on your materials:\n\n1. **Break it down** — Your notes suggest decomposing complex problems into smaller, manageable pieces.\n2. **Pattern match** — Look for similarities with examples you've already studied.\n3. **Verify** — Cross-check against the source material.\n\nThis aligns with the methodology outlined in week 1 of your lecture notes. The key insight is that consistency beats intensity.",
  "Based on your study materials, the answer connects to a few core principles:\n\n- **Principle 1:** Foundation first — ensure you understand the prerequisites.\n- **Principle 2:** Active recall — test yourself rather than re-reading.\n- **Principle 3:** Spaced repetition — review at increasing intervals.\n\nYour cheatsheet specifically highlights that most students struggle because they skip the foundation step. Take your time with the basics.",
];

const DEMO_QUESTIONS = [
  "Explain the difference between supervised and unsupervised learning in your own words.",
  "What are the key trade-offs when choosing between a hash table and a balanced tree?",
  "How would you derive the formula for matrix multiplication step by step?",
  "Describe a real-world scenario where you'd apply the concept of dynamic programming.",
  "What common misconception about this topic does your material warn against?",
];

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
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);
  const [showMaterialsList, setShowMaterialsList] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  const selected = useMemo(() => subjects.find((s) => s.id === selectedId), [subjects, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let isCurrent = true;

    async function loadSubjectData() {
      try {
        if (DEMO_MODE) {
          if (isCurrent) {
            setMaterials(DEMO_MATERIALS[selectedId] ?? []);
            setConversationId(undefined);
            try {
              const saved = localStorage.getItem(`mindforge-chat-${selectedId}`);
              if (saved) setMessages(JSON.parse(saved));
              else setMessages([]);
            } catch {
              setMessages([]);
            }
            setQuestions([]);
            setEvaluations({});
            setUserAnswers({});
          }
          return;
        }

        const matRes = await request<{ materials: Material[] }>(`/api/materials?subjectId=${selectedId}`);
        if (isCurrent) setMaterials(matRes.materials);

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
        if (isCurrent) showToast("Could not load data for this subject.", "error");
      }
    }

    loadSubjectData();
    return () => { isCurrent = false; };
  }, [selectedId]);

  useEffect(() => {
    if (DEMO_MODE && selectedId && messages.length > 0) {
      try {
        localStorage.setItem(`mindforge-chat-${selectedId}`, JSON.stringify(messages));
      } catch { /* ignore */ }
    }
  }, [messages, selectedId]);

  async function createSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    setBusy(true);
    try {
      if (DEMO_MODE) {
        const subject: Subject = {
          id: `demo-${Date.now()}`,
          name,
          description: String(form.get("description") ?? "") || null,
          created_at: new Date().toISOString(),
        };
        setSubjects((current) => [subject, ...current]);
        setSelectedId(subject.id);
        event.currentTarget.reset();
        showToast("Subject created successfully.", "success");
        setBusy(false);
        return;
      }
      const { subject } = await request<{ subject: Subject }>("/api/subjects", {
        method: "POST",
        body: JSON.stringify({ name, description: String(form.get("description") ?? "") }),
      });
      setSubjects((current) => [subject, ...current]);
      setSelectedId(subject.id);
      event.currentTarget.reset();
      showToast("Subject created successfully.", "success");
    } catch {
      showToast("Could not create that subject.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubjectById(id: string) {
    const sub = subjects.find((s) => s.id === id);
    if (!sub) return;
    if (!confirm(`Are you sure you want to delete "${sub.name}" and all its study materials?`)) return;

    if (DEMO_MODE) {
      const updated = subjects.filter((s) => s.id !== id);
      setSubjects(updated);
      if (selectedId === id) setSelectedId(updated[0]?.id ?? "");
      showToast("Subject deleted.", "info");
      return;
    }

    setBusy(true);
    try {
      await request<{ success: boolean }>(`/api/subjects/${id}`, { method: "DELETE" });
      const updated = subjects.filter((s) => s.id !== id);
      setSubjects(updated);
      if (selectedId === id) setSelectedId(updated[0]?.id ?? "");
      showToast("Subject deleted.", "info");
    } catch {
      showToast("Failed to delete subject.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSubject() {
    if (!selectedId || !selected) return;
    await deleteSubjectById(selectedId);
  }

  async function uploadMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    form.set("subjectId", selectedId);
    setBusy(true);
    try {
      const response = await fetch("/api/materials", { method: "POST", body: form });
      if (!response.ok) throw new Error();
      showToast("Study material processed and indexed.", "success");
      event.currentTarget.reset();

      const matRes = await request<{ materials: Material[] }>(`/api/materials?subjectId=${selectedId}`);
      setMaterials(matRes.materials);
    } catch {
      showToast("Material processing failed. Check file type (PDF, DOCX, TXT, MD) and size.", "error");
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
      showToast("Material deleted.", "info");
    } catch {
      showToast("Could not delete material.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    const prompt = String(form.get("prompt") ?? "").trim();
    if (!prompt && pendingImages.length === 0) return;

    const images = pendingImages;
    setBusy(true);
    setMessages((current) => [...current, { role: "user", content: prompt, images: images.length ? images : undefined }]);
    setPendingImages([]);
    event.currentTarget.reset();

    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));
        const response = images.length
          ? "I can see the image you've shared. Based on what's shown, here's my analysis:\n\nThe content appears to be related to your study materials. Let me break it down into key points and connect it to the concepts you've been learning.\n\n**Observation:** The visual shows structured information that aligns with your notes.\n\n**Key takeaway:** Focus on the relationships between the elements rather than memorizing individual parts.\n\nWould you like me to explain any specific part in more detail?"
          : (DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)] ??
            "Here's a thoughtful answer based on your study materials. Let me know if you'd like me to go deeper on any part.");
        setMessages((current) => [...current, { role: "assistant", content: response }]);
        setBusy(false);
        return;
      }

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
        body: JSON.stringify({ prompt, images }),
      });
      setMessages((current) => [...current, { role: "assistant", content: message.content }]);
    } catch {
      setMessages((current) => current.slice(0, -1));
      showToast("I could not answer that question. Ensure you have processed study materials.", "error");
    } finally {
      setBusy(false);
    }
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;
    const readers: Promise<string>[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      readers.push(
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") resolve(result);
            else reject(new Error("Failed to read image as data URL"));
          };
          reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
          reader.readAsDataURL(file);
        })
      );
    }
    Promise.all(readers)
      .then((dataUrls) => {
        setPendingImages((current) => [...current, ...dataUrls]);
      })
      .catch(() => {
        showToast("Could not read one or more images.", "error");
      });
    event.target.value = "";
  }

  function removePendingImage(index: number) {
    setPendingImages((current) => current.filter((_, i) => i !== index));
  }

  async function makeQuestions() {
    if (!selectedId) return;
    setBusy(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
        setQuestions(DEMO_QUESTIONS);
        setEvaluations({});
        setUserAnswers({});
        showToast("5 practice questions generated!", "success");
        setBusy(false);
        return;
      }

      const { questions: result } = await request<{ questions: { question: string }[] }>("/api/questions", {
        method: "POST",
        body: JSON.stringify({ subjectId: selectedId, count: 5 }),
      });
      setQuestions(result.map((item) => item.question));
      setEvaluations({});
      setUserAnswers({});
      showToast("5 practice questions generated!", "success");
    } catch {
      showToast("Please add and process study materials before generating questions.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function evaluateUserAnswer(idx: number, question: string) {
    const answer = userAnswers[idx]?.trim();
    if (!answer || !selectedId) return;

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
          correctPoints: [
            "Correctly identified the main principle",
            "Demonstrated understanding of the basic mechanism",
          ],
          missingPoints: score >= 80
            ? ["Minor detail about edge cases"]
            : ["The trade-offs between approaches", "A concrete real-world example"],
        };
        setEvaluations((current) => ({ ...current, [idx]: evaluation }));
        setEvaluatingIdx(null);
        return;
      }

      const res = await request<{ evaluation: EvaluationResult }>("/api/questions/evaluate", {
        method: "POST",
        body: JSON.stringify({ subjectId: selectedId, question, answer }),
      });
      setEvaluations((current) => ({ ...current, [idx]: res.evaluation }));
    } catch {
      showToast("Could not evaluate answer. Please try again.", "error");
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
    <div className="workspace-content" role="region" aria-label="Study workspace">
      <div className="workspace-grid">
        {/* Sidebar */}
        <aside className="workspace-sidebar" aria-label="Subjects and materials">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Subjects</h2>
            <button className="btn btn-primary btn-sm" onClick={() => { document.getElementById("subject-name")?.focus(); }} aria-label="Create new subject">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New</span>
            </button>
          </div>

          <div className="sidebar-section">
            <form onSubmit={createSubject} className="subject-form">
              <div className="form-group">
                <label htmlFor="subject-name" className="visually-hidden">Subject name</label>
                <input
                  type="text"
                  id="subject-name"
                  name="name"
                  maxLength={120}
                  placeholder="e.g. Computer Science"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="subject-desc" className="visually-hidden">Description (optional)</label>
                <textarea
                  id="subject-desc"
                  name="description"
                  maxLength={2000}
                  placeholder="Subject focus or goals"
                  rows={2}
                />
              </div>
              <button type="submit" disabled={busy} className="btn btn-primary btn-block">
                Create Subject
              </button>
            </form>
          </div>

          <ul className="subject-list" role="list" aria-label="Your subjects">
            {subjects.length === 0 ? (
              <li className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p>No subjects yet</p>
                <span>Create your first subject above</span>
              </li>
            ) : (
              subjects.map((sub) => (
                <li key={sub.id}>
                  <button
                    className={`subject-item ${sub.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(sub.id)}
                    aria-current={sub.id === selectedId ? "true" : "false"}
                  >
                    <div className="subject-info">
                      <span className="subject-name">{sub.name}</span>
                      {sub.description && <span className="subject-desc">{sub.description}</span>}
                    </div>
                    <button
                      type="button"
                      className="subject-delete"
                      onClick={(e) => { e.stopPropagation(); deleteSubjectById(sub.id); }}
                      aria-label={`Delete ${sub.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* Center: Chat */}
        <div className="workspace-center">
          {selected ? (
            <>
              <header className="workspace-subject-header">
                <div>
                  <span className="subject-badge">Active Subject</span>
                  <h1 className="subject-title">{selected.name}</h1>
                </div>
                <div className="subject-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowMaterialsList(!showMaterialsList)}
                    aria-expanded={showMaterialsList}
                    aria-controls="materials-panel"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Materials ({materials.length})</span>
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteSubjectById(selected.id)} disabled={busy}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </header>

          <section id="materials-panel" className={`materials-panel ${showMaterialsList ? "open" : ""}`} aria-label="Study materials">
            <form onSubmit={uploadMaterial} className="upload-form" encType="multipart/form-data">
              <label className="dropzone" htmlFor="file-upload">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="dropzone-text">Upload Lecture Notes, Slides, PDF, or DOCX</span>
                <span className="dropzone-hint">Drag & drop or click to browse</span>
                <input
                  id="file-upload"
                  name="file"
                  type="file"
                  accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  required
                  className="visually-hidden"
                />
              </label>
              <button type="submit" disabled={busy} className="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload & Index</span>
              </button>
            </form>

            {materials.length > 0 && (
              <div className="materials-list" role="list" aria-label="Uploaded materials">
                <h3 className="materials-list-title">Uploaded Study Materials</h3>
                <ul>
                  {materials.map((mat) => (
                    <li key={mat.id} className="material-item" role="listitem">
                      <div className="material-meta">
                        <span className="file-icon" aria-hidden="true">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                        </span>
                        <span className="file-name" title={mat.original_name}>{mat.original_name}</span>
                        <span className="file-size">{formatBytes(mat.byte_size)}</span>
                        <span className={`status-badge ${mat.processing_status}`}>{mat.processing_status}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-icon"
                        onClick={() => deleteMaterial(mat.id)}
                        aria-label={`Delete ${mat.original_name}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="chat-section" aria-label="Study conversation">
            <div className="chat-container">
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <div className="welcome-icon" aria-hidden="true">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h2>Start Grounded Study Conversation</h2>
                  <p>Ask questions about your uploaded materials. The tutor provides clear, verified explanations with exact source citations.</p>
                </div>
              ) : (
                <div className="messages-list" role="log" aria-live="polite" aria-label="Conversation">
                  {messages.map((msg, idx) => (
                    <article key={idx} className={`message message-${msg.role}`}>
                      <header className="message-header">
                        <strong>{msg.role === "user" ? "You" : "Study Partner"}</strong>
                        {msg.role === "assistant" && (
                          <button
                            type="button"
                            className={`btn btn-icon btn-ghost ${playingMsgIndex === idx ? "playing" : ""}`}
                            onClick={() => toggleSpeech(msg.content, idx)}
                            aria-label={playingMsgIndex === idx ? "Stop playback" : "Play message"}
                            aria-pressed={playingMsgIndex === idx}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              {playingMsgIndex === idx ? (
                                <g>
                                  <rect x="6" y="4" width="4" height="16" />
                                  <rect x="14" y="4" width="4" height="16" />
                                </g>
                              ) : (
                                <polygon points="5 3 19 12 5 21 5 3" />
                              )}
                            </svg>
                          </button>
                        )}
                      </header>
                      <div className="message-content">{msg.content}</div>
                      {msg.images && msg.images.length > 0 && (
                        <div className="message-images">
                          {msg.images.map((img, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={img} alt="Attached" className="message-image" />
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="prompt-form" aria-label="Send message">
              {pendingImages.length > 0 && (
                <div className="image-preview-row">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="image-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="Pending upload" />
                      <button
                        type="button"
                        className="image-preview-remove"
                        onClick={() => removePendingImage(i)}
                        aria-label="Remove image"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="prompt-input-row">
                <label className="attach-button" aria-label="Attach image">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="visually-hidden"
                  />
                </label>
                <label htmlFor="prompt-input" className="visually-hidden">Your question</label>
                <textarea
                  id="prompt-input"
                  name="prompt"
                  maxLength={8000}
                  placeholder="Ask for an explanation, example, or clarification from your notes..."
                  rows={2}
                  disabled={busy}
                  onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                  }}
                />
                <button type="submit" disabled={busy || !selectedId} className="btn btn-primary">
                  <span>Ask Tutor</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </form>
          </section>
        </>
          ) : (
            <div className="empty-workspace">
              <div className="empty-icon" aria-hidden="true">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h2>No Subject Selected</h2>
              <p>Select a subject from the sidebar or create a new one to start studying.</p>
            </div>
          )}
        </div>

        {/* Practice Panel */}
        <aside className="workspace-practice" aria-label="Practice quiz">
          <div className="practice-header">
            <h2 className="practice-title">Practice</h2>
          </div>
          <PracticePanel subjectId={selectedId} />
        </aside>
      </div>
    </div>
  );
}