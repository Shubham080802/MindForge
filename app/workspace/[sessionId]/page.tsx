"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, FileText, Image as LucideImage, Mic, Volume2, VolumeX, Copy, Download, Trash2, Edit, FileDown, MessageSquare, Sparkles, BookOpen, Brain, Languages, Settings, ChevronLeft, ChevronRight, X, User as LucideUser, Eye, FileSearch, GraduationCap, ShieldCheck, CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw } from "lucide-react";
import { UserDropdown } from "@/components/ui/user-dropdown";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { PDFViewerDialog } from "./pdf-viewer-dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useKeyboardShortcuts, useSessionShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { readAIStream } from "@/lib/sse-stream";
import { getStudyLanguage, type StudyLanguageCode } from "@/lib/study-languages";
import { ExplanationLanguagePicker } from "@/components/explanation-language-picker";
import { useStudyLanguage } from "@/hooks/use-study-language";
import { evaluateStudyScope } from "@/lib/study-scope";
import { shouldSubmitComposer } from "@/lib/chat-composer";
import { getSpeechAudioUrl, playNativeAudio } from "@/lib/browser-audio";
import { prepareSpeechText, splitSpeechText } from "@/lib/speech-text";
import {
  buildPracticeDiscussionPrompt,
  buildStudyToolFollowUp,
  evaluatePracticeAnswer,
  studyToolLabel,
  type ConceptResult,
  type ExportableStudyToolName,
  type PracticeAnswerEvaluation,
  type QuizQuestion,
  type QuizResult,
  type StudyToolName,
  type StudyToolResult,
  type SummaryResult,
  type TranslationResult,
} from "@/lib/study-tools";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Material {
  id: string;
  fileName: string;
  url: string;
  type: string;
  size: number;
  mimeType: string;
  extractedText: string | null;
  createdAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ materialId: string; excerpt: string }>;
  metadata?: {
    sources?: Array<{ materialId: string; excerpt: string }>;
    language?: StudyLanguageCode;
  };
  createdAt: string;
}

interface SessionData {
  id: string;
  title: string;
  createdAt: string;
  materials: Material[];
  messages: Message[];
  _count: { messages: number; materials: number };
}

interface StudyToolResultState {
  tool: ExportableStudyToolName;
  resultKey: string;
  result: StudyToolResult;
  language: StudyLanguageCode;
}

interface PracticeSession {
  questions: QuizQuestion[];
  currentIndex: number;
  answer: string;
  feedback: PracticeAnswerEvaluation | null;
  score: number;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "materials" | "study">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [chatNotice, setChatNotice] = useState<string | null>(null);
  const { language: explanationLanguage, updateLanguage, isLoading: isLoadingLanguage, isSaving: isSavingLanguage, error: languageError } = useStudyLanguage();
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [studyToolResult, setStudyToolResult] = useState<StudyToolResultState | null>(null);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<"markdown" | "json" | "pdf" | null>(null);
  const [storedToolResults, setStoredToolResults] = useState<Record<string, any>>({});
  const [exportProgress, setExportProgress] = useState<{ active: boolean; format?: string }>({ active: false });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      speechRequestRef.current?.abort();
    };
  }, []);

  // Keyboard shortcuts for session page
  useKeyboardShortcuts(
    useSessionShortcuts(textareaRef, () => sendMessage({ preventDefault: () => {} } as React.FormEvent), () => speakLastMessage(), () => router.push("/workspace"))
  );

  const generateStudyTool = async (tool: StudyToolName) => {
    setIsGenerating(true);
    setStudyToolResult(null);

    try {
      const res = await fetch(`/api/study-tools/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tool, targetLanguage: explanationLanguage }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to generate" }));
        throw new Error(errorData.message || "Failed to generate");
      }

      const data = await res.json() as { result: StudyToolResult; language: StudyLanguageCode };
      if (tool === "quiz") {
        const quiz = data.result as QuizResult;
        setPracticeSession({ questions: quiz.questions, currentIndex: 0, answer: "", feedback: null, score: 0 });
        setActiveTab("chat");
        setChatNotice(null);
        return;
      }

      const resultKey = tool === "translate" ? `translate-${explanationLanguage}` : tool;
      setStudyToolResult({ tool, resultKey, result: data.result, language: data.language });
      setStoredToolResults((prev) => ({ ...prev, [resultKey]: data.result }));
    } catch (error) {
      console.error("Study tool error:", error);
      alert(error instanceof Error ? error.message : "Failed to generate study tool");
    } finally {
      setIsGenerating(false);
    }
  };

  const continueStudyToolInChat = (toolResult: StudyToolResultState) => {
    setInput(buildStudyToolFollowUp(toolResult.tool, toolResult.result));
    setActiveTab("chat");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const checkPracticeAnswer = () => {
    setPracticeSession((current) => {
      if (!current || current.feedback || !current.answer.trim()) return current;
      const question = current.questions[current.currentIndex];
      if (!question) return current;
      const feedback = evaluatePracticeAnswer(question, current.answer);
      return {
        ...current,
        feedback,
        score: current.score + (feedback.verdict === "correct" ? 1 : 0),
      };
    });
  };

  const advancePractice = () => {
    setPracticeSession((current) => current ? {
      ...current,
      currentIndex: current.currentIndex + 1,
      answer: "",
      feedback: null,
    } : null);
  };

  const discussPracticeQuestion = (question: QuizQuestion, answer: string) => {
    setInput(buildPracticeDiscussionPrompt(question, answer));
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleExport = async (format: "markdown" | "json" | "pdf", toolName?: string) => {
    setExportFormat(null);
    setExportProgress({ active: true, format });
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId,
          format,
          toolResults: storedToolResults,
          toolName,
        }),
      });

      if (!res.ok) {
        const failure = await res.json().catch(() => ({}));
        throw new Error(failure.message || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = format === "pdf" ? "pdf" : format;
      a.download = `mindforge-export-${Date.now()}${toolName ? `-${toolName}` : ""}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(error instanceof Error ? error.message : "Failed to export");
    } finally {
      setExportProgress({ active: false });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { credentials: "include" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(errorData.message || `Failed to fetch session (${res.status})`);
      }
      const data = await res.json();
      setSession(data.session);
      setMessages(data.session.messages || []);
    } catch (error) {
      console.error("Fetch session error:", error);
      // Don't redirect immediately - show error instead
      alert(`Failed to load session: ${error instanceof Error ? error.message : "Unknown error"}`);
      router.push("/workspace");
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const speakLastMessage = () => {
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      speakMessage(lastAssistantMessage.id, lastAssistantMessage.content, lastAssistantMessage.metadata?.language || "en");
    }
  };

  const submitMessage = async (rawContent: string, clearComposer = false) => {
    const content = rawContent.trim();
    if (!content || isLoading) return;
    // A session with material is judged against that material on the server.
    const scope = evaluateStudyScope(content, { hasMaterials: Boolean(session?.materials?.length) });
    if (!scope.allowed) {
      setChatNotice(scope.message);
      textareaRef.current?.focus();
      return;
    }
    setChatNotice(null);
    const responseLanguage = explanationLanguage;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (clearComposer) setInput("");
    setIsLoading(true);
    const assistantMessageId = crypto.randomUUID();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, stream: true, language: responseLanguage }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to send message" }));
        throw new Error(errorData.message || "Failed to send message");
      }

      if (!res.body) throw new Error("The AI response stream was unavailable");

      // Add placeholder assistant message
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        metadata: { language: responseLanguage },
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const result = await readAIStream(res.body, (fullContent) => {
        setMessages((prev) => prev.map((message) =>
          message.id === assistantMessageId ? { ...message, content: fullContent } : message
        ));
      });
      if (!result.content.trim()) throw new Error("The AI returned an empty response");
      if (result.message) {
        setMessages((prev) => prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, ...result.message, content: result.content } as Message
            : message
        ));
      }
    } catch (error) {
      console.error("Send message error:", error);
      setMessages((prev) => prev.filter((message) => message.id !== assistantMessageId && message.id !== userMessage.id));
      setChatNotice(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    void submitMessage(input, true);
  };

  const stopSpeech = () => {
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;
    const audio = speechAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setSpeakingMessageId(null);
    setSpeechNotice(null);
  };

  const speakMessage = async (messageId: string, text: string, languageCode: StudyLanguageCode) => {
    const language = getStudyLanguage(languageCode);

    if (speakingMessageId === messageId) {
      stopSpeech();
      return;
    }

    stopSpeech();

    const audio = speechAudioRef.current;
    const chunks = splitSpeechText(prepareSpeechText(text));
    if (!audio || chunks.length === 0) {
      setSpeechNotice("This response has no readable audio content.");
      return;
    }

    const controller = new AbortController();
    speechRequestRef.current = controller;
    setSpeakingMessageId(messageId);
    setSpeechNotice(`Preparing ${language.name} professor audio…`);

    // Generating a chunk takes far longer than fetching one, so the next chunk
    // is warmed while the current one plays. It must not start any earlier:
    // a serverless instance serves one request at a time, so a prefetch issued
    // alongside the current chunk queues that chunk behind a full generation
    // and delays the very audio the listener is waiting for.
    const warmChunk = (index: number) => {
      if (index >= chunks.length) return;
      void fetch(getSpeechAudioUrl(sessionId, messageId, index), {
        credentials: "include",
        signal: controller.signal,
      }).catch(() => {});
    };

    try {
      for (let chunkIndex = 0; chunkIndex < chunks.length && !controller.signal.aborted; chunkIndex += 1) {
        setSpeechNotice(chunks.length > 1
          ? `Preparing ${language.name} audio · Part ${chunkIndex + 1} of ${chunks.length}…`
          : `Preparing ${language.name} professor audio…`);
        await playNativeAudio(
          audio,
          getSpeechAudioUrl(sessionId, messageId, chunkIndex),
          controller.signal,
          () => {
            setSpeechNotice(`Reading in ${language.name} · Part ${chunkIndex + 1} of ${chunks.length}`);
            warmChunk(chunkIndex + 1);
          },
        );
      }

      if (!controller.signal.aborted && speechRequestRef.current === controller) {
        setSpeakingMessageId(null);
        setSpeechNotice(`Finished reading in ${language.name}.`);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setSpeakingMessageId(null);
      setSpeechNotice(error instanceof Error ? error.message : `${language.name} audio could not be played`);
    } finally {
      if (speechRequestRef.current === controller) speechRequestRef.current = null;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <>
        <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/library")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg truncate max-w-xs">{session.title}</h1>
              <p className="text-xs text-muted-foreground">
                {session._count.materials} materials · {session._count.messages} messages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {exportProgress.active && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Exporting {exportProgress.format?.toUpperCase()}...</span>
              </div>
            )}
            <DarkModeToggle />
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Materials */}
        {sidebarOpen && (
          <aside className="w-72 border-r bg-card flex flex-col hidden lg:flex">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Materials</h2>
                <span className="text-xs text-muted-foreground">{session.materials.length} files</span>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 space-y-3">
              {session.materials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No materials uploaded</p>
              ) : (
                session.materials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    onClick={() => setSelectedMaterial(material)}
                  />
                ))
              )}
            </ScrollArea>

          </aside>
        )}

        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Tab Navigation */}
          <div className="border-b bg-muted/30">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "chat" | "materials" | "study")} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chat">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="materials">
                  <FileText className="mr-2 h-4 w-4" />
                  Materials
                </TabsTrigger>
                <TabsTrigger value="study">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Study Tools
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {activeTab === "chat" && (
            <section className="flex flex-col gap-3 border-b bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Professor conversation controls">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">Professor MindForge</p>
                  <p className="text-xs text-muted-foreground">Source-grounded tutoring that explains, responds, and checks your understanding.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <ExplanationLanguagePicker
                  id="explanation-language"
                  value={explanationLanguage}
                  onChange={(nextLanguage) => {
                    setSpeechNotice(null);
                    void updateLanguage(nextLanguage);
                  }}
                  disabled={isLoading || isLoadingLanguage || isSavingLanguage}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading || isSavingLanguage || !messages.some((message) => message.role === "assistant")}
                  onClick={() => void submitMessage(`Please re-explain your previous answer in ${getStudyLanguage(explanationLanguage).name}. Keep it conversational and grounded in my materials.`)}
                >
                  <Languages className="mr-2 h-4 w-4" />
                  Re-explain last answer
                </Button>
              </div>
              {languageError && <p className="w-full text-xs text-destructive" role="alert">{languageError}</p>}
            </section>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mb-4 text-primary/50" />
                    <h3 className="text-lg font-medium">Meet your professor</h3>
                    <p className="text-sm mt-1">Ask a question, request an example, or test your understanding.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        onSpeak={speakMessage}
                        speakingId={speakingMessageId}
                      />
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Professor MindForge is preparing an explanation...</span>
                      </div>
                    )}
                  </>
                )}
                {practiceSession && (
                  <PracticeCoach
                    session={practiceSession}
                    languageName={getStudyLanguage(explanationLanguage).name}
                    onAnswerChange={(answer) => setPracticeSession((current) => current ? { ...current, answer } : null)}
                    onCheck={checkPracticeAnswer}
                    onNext={advancePractice}
                    onDiscuss={discussPracticeQuestion}
                    onRestart={() => setPracticeSession((current) => current ? { ...current, currentIndex: 0, answer: "", feedback: null, score: 0 } : null)}
                    onClose={() => setPracticeSession(null)}
                  />
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>

              <Separator />
              <div className="p-4">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (chatNotice) setChatNotice(null);
                    }}
                    onKeyDown={(event) => {
                      if (!shouldSubmitComposer({
                        key: event.key,
                        shiftKey: event.shiftKey,
                        isComposing: event.nativeEvent.isComposing,
                      })) return;

                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }}
                    placeholder={`Ask Professor MindForge in ${getStudyLanguage(explanationLanguage).name}...`}
                    rows={1}
                    className="flex-1 resize-none min-h-[44px] max-h-32"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="lg" aria-label="Send message" disabled={!input.trim() || isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Press Enter to send · Shift+Enter for a new line
                </p>
                <div className="mt-2 flex items-start justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>Study-only mode: ask about learning, assignments, skills, or your materials. Weather, travel planning, bookings, and other utility requests are blocked.</span>
                </div>
                {chatNotice && <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-center text-sm text-amber-900 dark:text-amber-100" role="alert">{chatNotice}</p>}
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Answers use {getStudyLanguage(explanationLanguage).name} · Multilingual read-aloud uses Gemini professor audio
                </p>
                {speechNotice && <p className="mt-1 text-center text-xs text-amber-700 dark:text-amber-300" role="status">{speechNotice}</p>}
                <audio
                  ref={speechAudioRef}
                  controls
                  controlsList="nodownload"
                  aria-label="Professor audio player"
                  className={cn("mx-auto mt-2 h-10 w-full max-w-md", speakingMessageId ? "block" : "hidden")}
                />
                <p className="mt-1 text-center text-xs text-muted-foreground">Gemini free tier · Relevant material is sent to Google and may be used to improve its products</p>
              </div>
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === "materials" && (
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {session.materials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    detailed
                    onClick={() => setSelectedMaterial(material)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Study Tools Tab */}
          {activeTab === "study" && (
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
              <StudyToolSection
                title="Learn & discuss"
                description="Create a useful study note, then bring it into your conversation with Professor MindForge."
              >
                <StudyToolCard
                  icon={<Brain className="h-6 w-6" />}
                  title="Generate Summary"
                  description="Turn the material into a readable overview you can discuss or save"
                  action="Create summary"
                  onClick={() => generateStudyTool("summary")}
                  disabled={isGenerating}
                />
                <StudyToolCard
                  icon={<BookOpen className="h-6 w-6" />}
                  title="Key Concepts"
                  description="Extract important terms and explore how they connect in chat"
                  action="Find concepts"
                  onClick={() => generateStudyTool("concepts")}
                  disabled={isGenerating}
                />
                <StudyToolCard
                  icon={<Languages className="h-6 w-6" />}
                  title="Multilingual Explanation"
                  description={`Create a teaching note in ${getStudyLanguage(explanationLanguage).name}`}
                  action={`Explain in ${getStudyLanguage(explanationLanguage).name}`}
                  onClick={() => generateStudyTool("translate")}
                  disabled={isGenerating}
                />
              </StudyToolSection>

              <StudyToolSection
                title="Practice in chat"
                description="Professor MindForge asks one question at a time and gives immediate feedback."
              >
                <StudyToolCard
                  icon={<MessageSquare className="h-6 w-6" />}
                  title="Interactive Practice"
                  description="Mix multiple-choice, true/false, and short-answer questions from your materials"
                  action={practiceSession ? "Start a new round" : "Start practice"}
                  onClick={() => generateStudyTool("quiz")}
                  disabled={isGenerating}
                />
              </StudyToolSection>

              <StudyToolSection
                title="Export & keep"
                description="Download only when you want a lasting copy. Markdown is best for editable notes; PDF is best for sharing."
              >
                <StudyToolCard
                  icon={<FileDown className="h-6 w-6" />}
                  title="Export Learning Record"
                  description="Choose chat history, generated notes, and a deliberate download format"
                  action="Choose export"
                  onClick={() => setExportFormat("markdown")}
                />
              </StudyToolSection>
              {isGenerating && (
                <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/40 p-6 text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating study tool…</span>
                </div>
              )}
              {studyToolResult && (
                <StudyToolResultPanel
                  toolResult={studyToolResult}
                  exporting={exportProgress.active}
                  onUseInChat={() => continueStudyToolInChat(studyToolResult)}
                  onExport={(format) => handleExport(format, studyToolResult.resultKey)}
                  onClose={() => setStudyToolResult(null)}
                />
              )}
              {exportFormat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setExportFormat(null)}>
                  <div className="bg-card rounded-lg p-5 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-4">
                      <h3 className="font-semibold">Export learning record</h3>
                      <p className="mt-1 text-sm text-muted-foreground">The full export includes your conversation and any generated learning notes.</p>
                    </div>
                    <div className="space-y-2">
                      <Button className="w-full justify-between" onClick={() => handleExport("markdown")} disabled={exportProgress.active}>
                        <span className="flex items-center"><FileDown className="mr-2 h-4 w-4" />Markdown</span>
                        <span className="text-xs opacity-80">Recommended · editable</span>
                      </Button>
                      <Button className="w-full justify-between" variant="outline" onClick={() => handleExport("pdf")} disabled={exportProgress.active}>
                        <span className="flex items-center"><FileText className="mr-2 h-4 w-4" />PDF</span>
                        <span className="text-xs text-muted-foreground">Best for sharing</span>
                      </Button>
                      <Button className="w-full justify-between" variant="outline" onClick={() => handleExport("json")} disabled={exportProgress.active}>
                        <span className="flex items-center"><FileText className="mr-2 h-4 w-4" />JSON</span>
                        <span className="text-xs text-muted-foreground">Structured data</span>
                      </Button>
                    </div>
                    {Object.keys(storedToolResults).length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium mb-2">Individual learning notes</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {Object.entries(storedToolResults).map(([tool]) => (
                            <div key={tool} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2">
                              <span className="text-sm">{studyToolLabel(tool)}</span>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleExport("markdown", tool)} disabled={exportProgress.active}>MD</Button>
                                <Button size="sm" variant="ghost" onClick={() => handleExport("pdf", tool)} disabled={exportProgress.active}>PDF</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button className="w-full mt-4" variant="ghost" onClick={() => setExportFormat(null)} disabled={exportProgress.active}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Mobile Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden fixed bottom-4 right-4 z-50"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <FileText className="h-6 w-6" />
        </Button>
      </div>
    </div>

    <PDFViewerDialog
      material={selectedMaterial}
      open={!!selectedMaterial}
      onOpenChange={(open) => {
        if (!open) setSelectedMaterial(null);
      }}
    />
    </>
    </ErrorBoundary>
  );
}

function MessageBubble({ message, onSpeak, speakingId }: { message: Message; onSpeak: (id: string, text: string, language: StudyLanguageCode) => void; speakingId: string | null }) {
  const isUser = message.role === "user";
  const language = getStudyLanguage(message.metadata?.language || "en");
  const sources = message.sources || message.metadata?.sources;

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "")}>
      {!isUser && <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0" aria-hidden="true"><GraduationCap className="h-4 w-4 text-primary-foreground" /></div>}
      <div className={cn("max-w-[85%] sm:max-w-[75%] flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-1 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{isUser ? "Student" : "Professor MindForge"}</span>
            {!isUser && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{language.name}</span>}
          </div>
          {!isUser && (
            <Button
              variant={speakingId === message.id ? "default" : "outline"}
              size="sm"
              className="h-10 px-4 text-sm font-semibold shadow-sm"
              aria-label={speakingId === message.id ? "Stop reading response" : `Read ${language.name} response aloud`}
              onClick={() => onSpeak(message.id, message.content, language.code)}
            >
              {speakingId === message.id ? <VolumeX className="mr-2 h-5 w-5" /> : <Volume2 className="mr-2 h-5 w-5" />}
              {speakingId === message.id ? "Stop reading" : "Read aloud"}
            </Button>
          )}
        </div>
        <div
          className={cn(
            "px-4 py-2 rounded-2xl",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-muted rounded-tl-none"
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              aria-label="Copy response"
              onClick={() => navigator.clipboard.writeText(message.content)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!!sources?.length && (
          <div className="mt-2 ml-10 flex flex-wrap gap-1">
            {sources.map((source, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                Source {i + 1}
              </span>
            ))}
          </div>
        )}
      </div>
      {isUser && <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0" aria-hidden="true"><LucideUser className="h-4 w-4" /></div>}
    </div>
  );
}

function MaterialCard({ material, detailed = false, onClick }: { material: Material; detailed?: boolean; onClick?: () => void }) {
  const isImage = material.mimeType.startsWith("image/");
  const isPDF = material.type === "pdf";

  return (
    <Card className={cn(detailed ? "h-full" : "")} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <CardHeader className={detailed ? "pb-2" : "pb-1"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", isImage ? "bg-green-100" : isPDF ? "bg-red-100" : "bg-blue-100")}>
              {isImage && <LucideImage className="h-5 w-5 text-green-600" aria-hidden="true" />}
              {isPDF && <FileText className="h-5 w-5 text-red-600" />}
              {!isImage && !isPDF && <FileText className="h-5 w-5 text-blue-600" />}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-sm">{material.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatSize(material.size)} · {material.mimeType}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      {detailed && material.extractedText && (
        <CardContent className="pt-0">
          <div className="max-h-48 overflow-y-auto p-3 bg-muted/50 rounded-lg text-sm font-mono text-muted-foreground whitespace-pre-wrap">
            {material.extractedText.slice(0, 500)}{material.extractedText.length > 500 ? "..." : ""}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" asChild>
              <a href={material.url} download onClick={(event) => event.stopPropagation()}>
                <FileDown className="mr-1 h-3 w-3" />
                Download
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); onClick?.(); }}>
              <Edit className="mr-1 h-3 w-3" />
              View Text
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function StudyToolSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`study-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <div className="mb-3">
        <h2 id={`study-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function StudyToolResultPanel({
  toolResult,
  exporting,
  onUseInChat,
  onExport,
  onClose,
}: {
  toolResult: StudyToolResultState;
  exporting: boolean;
  onUseInChat: () => void;
  onExport: (format: "markdown" | "pdf") => void;
  onClose: () => void;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm" aria-label={`${studyToolLabel(toolResult.tool)} result`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ready to learn</p>
          <h3 className="text-lg font-semibold">
            {toolResult.tool === "translate"
              ? `${getStudyLanguage(toolResult.language).name} explanation`
              : studyToolLabel(toolResult.tool)}
          </h3>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close study tool result" onClick={onClose} disabled={exporting}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {toolResult.tool === "summary" && <SummaryView result={toolResult.result as SummaryResult} />}
      {toolResult.tool === "concepts" && <ConceptsView result={toolResult.result as ConceptResult} />}
      {toolResult.tool === "translate" && <TranslationView result={toolResult.result as TranslationResult} />}

      <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
        <Button onClick={onUseInChat}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Continue in chat
        </Button>
        <Button variant="outline" onClick={() => onExport("markdown")} disabled={exporting}>
          <FileDown className="mr-2 h-4 w-4" />
          Save Markdown
        </Button>
        <Button variant="ghost" onClick={() => onExport("pdf")} disabled={exporting}>
          <FileText className="mr-2 h-4 w-4" />
          Save PDF
        </Button>
      </div>
    </section>
  );
}

function SummaryView({ result }: { result: SummaryResult }) {
  return (
    <div className="space-y-5 text-sm">
      <div>
        <h4 className="font-semibold">{result.title}</h4>
        <p className="mt-2 whitespace-pre-wrap leading-6 text-muted-foreground">{result.summary}</p>
      </div>
      <div>
        <h4 className="font-medium">Key points</h4>
        <ul className="mt-2 space-y-2">
          {result.keyPoints.map((point, index) => (
            <li key={`${point}-${index}`} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{point}</li>
          ))}
        </ul>
      </div>
      {Object.keys(result.definitions).length > 0 && (
        <div>
          <h4 className="font-medium">Definitions</h4>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {Object.entries(result.definitions).map(([term, definition]) => (
              <div key={term} className="rounded-lg bg-muted/60 p-3"><dt className="font-medium">{term}</dt><dd className="mt-1 text-muted-foreground">{definition}</dd></div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function ConceptsView({ result }: { result: ConceptResult }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {result.concepts.map((concept) => (
        <article key={concept.term} className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold">{concept.term}</h4>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">{concept.importance}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{concept.definition}</p>
          {concept.relatedTerms.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Related: {concept.relatedTerms.join(", ")}</p>}
        </article>
      ))}
    </div>
  );
}

function TranslationView({ result }: { result: TranslationResult }) {
  return <div className="rounded-lg bg-muted/40 p-4 text-sm leading-7 whitespace-pre-wrap">{result.translatedContent}</div>;
}

function PracticeCoach({
  session,
  languageName,
  onAnswerChange,
  onCheck,
  onNext,
  onDiscuss,
  onRestart,
  onClose,
}: {
  session: PracticeSession;
  languageName: string;
  onAnswerChange: (answer: string) => void;
  onCheck: () => void;
  onNext: () => void;
  onDiscuss: (question: QuizQuestion, answer: string) => void;
  onRestart: () => void;
  onClose: () => void;
}) {
  const question = session.questions[session.currentIndex];
  if (!question) {
    return (
      <div className="mx-auto my-4 w-full max-w-2xl rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center" role="status">
        <Trophy className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-3 text-xl font-semibold">Practice complete</h3>
        <p className="mt-1 text-muted-foreground">You scored {session.score} out of {session.questions.length}. Short answers marked for review are learning opportunities, not failures.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={onRestart}><RotateCcw className="mr-2 h-4 w-4" />Practice again</Button>
          <Button variant="outline" onClick={onClose}>Finish</Button>
        </div>
      </div>
    );
  }

  const choices = question.type === "true_false"
    ? (question.options.length ? question.options : ["True", "False"])
    : question.options;
  const isLast = session.currentIndex === session.questions.length - 1;

  return (
    <section className="mx-auto my-4 w-full max-w-2xl rounded-2xl border border-primary/30 bg-card p-5 shadow-sm" aria-label="Interactive practice">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Professor practice · {languageName}</p>
          <p className="mt-1 text-sm text-muted-foreground">Question {session.currentIndex + 1} of {session.questions.length} · <span className="capitalize">{question.difficulty}</span></p>
        </div>
        <Button variant="ghost" size="icon" aria-label="End practice" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-7">{question.question}</h3>

      {question.type === "short_answer" ? (
        <Input
          className="mt-4"
          aria-label="Your practice answer"
          placeholder="Write your answer…"
          value={session.answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && session.answer.trim() && !session.feedback) onCheck();
          }}
          disabled={Boolean(session.feedback)}
        />
      ) : (
        <div className="mt-4 grid gap-2">
          {choices.map((choice, index) => (
            <Button
              key={`${choice}-${index}`}
              type="button"
              variant={session.answer === choice ? "default" : "outline"}
              className="h-auto min-h-11 justify-start whitespace-normal py-2 text-left"
              onClick={() => onAnswerChange(choice)}
              disabled={Boolean(session.feedback)}
            >
              {question.type === "multiple_choice" && <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span>}
              {choice}
            </Button>
          ))}
        </div>
      )}

      {!session.feedback ? (
        <Button className="mt-4" onClick={onCheck} disabled={!session.answer.trim()}>
          Check answer
        </Button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className={cn(
            "rounded-lg border p-4",
            session.feedback.verdict === "correct" ? "border-green-500/40 bg-green-500/10" : session.feedback.verdict === "incorrect" ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10",
          )} role="status">
            <div className="flex items-center gap-2 font-semibold">
              {session.feedback.verdict === "correct" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : session.feedback.verdict === "incorrect" ? <XCircle className="h-5 w-5 text-red-600" /> : <BookOpen className="h-5 w-5 text-amber-600" />}
              {session.feedback.verdict === "correct" ? "Exactly right" : session.feedback.verdict === "incorrect" ? "Not quite yet" : "Compare and learn"}
            </div>
            {session.feedback.verdict !== "correct" && <p className="mt-2 text-sm"><span className="font-medium">Expected answer:</span> {session.feedback.expectedAnswer}</p>}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.explanation}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNext}>{isLast ? "See my result" : "Next question"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => onDiscuss(question, session.answer)}><MessageSquare className="mr-2 h-4 w-4" />Ask professor</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function StudyToolCard({ icon, title, description, action, onClick, disabled = false }: { icon: React.ReactNode; title: string; description: string; action: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button className="sm:shrink-0" onClick={onClick} disabled={disabled}>{action}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// API route will be created separately
