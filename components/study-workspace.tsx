"use client";

import { useState } from "react";
import { PracticePanel } from "@/components/practice-panel";
import { useSubjects } from "@/hooks/useSubjects";
import { useMaterials } from "@/hooks/useMaterials";
import { useChat } from "@/hooks/useChat";
import { useConfirm } from "@/hooks/useConfirm";
import { showToast } from "@/lib/toast";
import type { Subject } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudyWorkspace({ initialSubjects }: { initialSubjects: Subject[] }) {
  const { confirm, dialog } = useConfirm();
  const { subjects, selectedId, setSelectedId, selected, busy: subjectsBusy, createSubject, deleteSubjectById } =
    useSubjects(initialSubjects, confirm);
  const { materials, busy: materialsBusy, uploadMaterial, deleteMaterial } = useMaterials(selectedId, confirm);
  const {
    messages,
    pendingImages,
    busy: chatBusy,
    playingMsgIndex,
    sendMessage,
    handleImageSelect,
    removePendingImage,
    toggleSpeech,
  } = useChat(selectedId);

  const [showMaterialsList, setShowMaterialsList] = useState(false);

  const busy = subjectsBusy || materialsBusy || chatBusy;

  function exportChatHistory() {
    if (!messages || messages.length === 0) {
      showToast("No study conversation messages to export yet.", "info");
      return;
    }
    const markdownContent = [
      `# Study Notes: ${selected?.name ?? "Subject"}`,
      `*Generated on ${new Date().toLocaleDateString()} by MindForge Study Agent*`,
      `\n---\n`,
      ...messages.map(
        (m) => `### ${m.role === "user" ? "🙋 Learner Question" : "🤖 Tutor Response"}\n\n${m.content}\n`
      ),
    ].join("\n\n");

    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = `${(selected?.name ?? "study-notes").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-notes.md`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported study conversation to ${filename}`, "success");
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
                <li key={sub.id} className="subject-item">
                  <button
                    type="button"
                    className={`subject-select ${sub.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(sub.id)}
                    aria-current={sub.id === selectedId ? "true" : "false"}
                  >
                    <div className="subject-info">
                      <span className="subject-name">{sub.name}</span>
                      {sub.description && <span className="subject-desc">{sub.description}</span>}
                    </div>
                  </button>
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
                    onClick={exportChatHistory}
                    title="Export study conversation as Markdown file"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Export Notes</span>
                  </button>
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
                    <article key={msg.id ?? idx} className={`message message-${msg.role}`}>
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
      {dialog}
    </div>
  );
}
