"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, FileText, Image as LucideImage, Mic, Volume2, VolumeX, Copy, Download, MoreHorizontal, Trash2, Edit, FileDown, MessageSquare, Sparkles, BookOpen, Brain, Languages, Share2, Settings, ChevronLeft, ChevronRight, X, User as LucideUser, Upload, Eye, FileSearch } from "lucide-react";
import { UserDropdown } from "@/components/ui/user-dropdown";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { PDFViewerDialog } from "./pdf-viewer-dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Material {
  id: string;
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
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [studyToolResult, setStudyToolResult] = useState<{ tool: string; result: any } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<"markdown" | "json" | "pdf" | null>(null);
  const [storedToolResults, setStoredToolResults] = useState<Record<string, any>>({});
  const [exportProgress, setExportProgress] = useState<{ active: boolean; format?: string }>({ active: false });

  const generateStudyTool = async (tool: string) => {
    setIsGenerating(true);
    setStudyToolResult(null);

    try {
      const res = await fetch(`/api/study-tools/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", credentials: "include" },
        body: JSON.stringify({ tool, content: "" }),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const data = await res.json();
      setStudyToolResult({ tool, result: data.result });
      setStoredToolResults((prev) => ({ ...prev, [tool]: data.result }));
    } catch (error) {
      console.error("Study tool error:", error);
      alert("Failed to generate study tool");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: "markdown" | "json" | "pdf", toolName?: string) => {
    setExportFormat(null);
    setExportProgress({ active: true, format });
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", credentials: "include" },
        body: JSON.stringify({
          sessionId,
          format,
          toolResults: storedToolResults,
          toolName,
        }),
      });

      if (!res.ok) throw new Error("Export failed");

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
      alert("Failed to export");
    } finally {
      setExportProgress({ active: false });
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch session");
      const data = await res.json();
      setSession(data.session);
      setMessages(data.session.messages || []);
    } catch (error) {
      console.error("Fetch session error:", error);
      router.push("/workspace");
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input, stream: true }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessageId = crypto.randomUUID();
      let fullContent = "";

      // Add placeholder assistant message
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content && !data.done) {
                  fullContent += data.content;
                  setMessages((prev) => 
                    prev.map((m) => 
                      m.id === assistantMessageId 
                        ? { ...m, content: fullContent }
                        : m
                    )
                  );
                } else if (data.done && data.message) {
                  // Final message with metadata
                  setMessages((prev) => 
                    prev.map((m) => 
                      m.id === assistantMessageId 
                        ? { ...data.message, content: fullContent }
                        : m
                    )
                  );
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Send message error:", error);
      alert("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakMessage = async (messageId: string, text: string) => {
    if (speakingMessageId === messageId && audioRef.current?.paused === false) {
      audioRef.current.pause();
      audioRef.current = null;
      setSpeakingMessageId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setSpeakingMessageId(messageId);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", credentials: "include" },
        body: JSON.stringify({ text: text.slice(0, 4096) }),
      });

      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeakingMessageId(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setSpeakingMessageId(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setSpeakingMessageId(null);
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
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Share2 className="h-4 w-4" />
            </Button>
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

            <div className="p-4 border-t">
              <Button variant="outline" className="w-full" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Add More Files
              </Button>
            </div>
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

          {/* Chat Tab */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mb-4 text-primary/50" />
                    <h3 className="text-lg font-medium">Start a conversation</h3>
                    <p className="text-sm mt-1">Ask questions about your uploaded materials</p>
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
                        <span>AI is thinking...</span>
                      </div>
                    )}
                    {studyToolResult && (
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold capitalize">{studyToolResult.tool} Result</h3>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleExport("pdf", studyToolResult.tool)} disabled={exportProgress.active}>
                              <FileText className="h-4 w-4" />
                              <span className="hidden sm:inline">PDF</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleExport("markdown", studyToolResult.tool)} disabled={exportProgress.active}>
                              <FileDown className="h-4 w-4" />
                              <span className="hidden sm:inline">MD</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleExport("json", studyToolResult.tool)} disabled={exportProgress.active}>
                              <FileText className="h-4 w-4" />
                              <span className="hidden sm:inline">JSON</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setStudyToolResult(null)} disabled={exportProgress.active}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">{JSON.stringify(studyToolResult.result, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>

              <Separator />
              <div className="p-4">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about your materials..."
                    rows={1}
                    className="flex-1 resize-none min-h-[44px] max-h-32"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="lg" disabled={!input.trim() || isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Powered by AI · Responses based on your uploaded materials
                </p>
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
              <StudyToolCard
                icon={<Brain className="h-6 w-6" />}
                title="Generate Summary"
                description="Create a concise summary of all your materials"
                action="Generate"
                onClick={() => generateStudyTool("summary")}
              />
              <StudyToolCard
                icon={<BookOpen className="h-6 w-6" />}
                title="Key Concepts"
                description="Extract important terms, definitions, and concepts"
                action="Extract"
                onClick={() => generateStudyTool("concepts")}
              />
              <StudyToolCard
                icon={<MessageSquare className="h-6 w-6" />}
                title="Practice Questions"
                description="Generate quiz questions to test your understanding"
                action="Create Quiz"
                onClick={() => generateStudyTool("quiz")}
              />
              <StudyToolCard
                icon={<Languages className="h-6 w-6" />}
                title="Multilingual Explanation"
                description="Get explanations in 50+ languages with voice"
                action="Translate"
                onClick={() => generateStudyTool("translate")}
              />
              <StudyToolCard
                icon={<FileDown className="h-6 w-6" />}
                title="Export Notes"
                description="Download chat history and notes as PDF, Markdown, or JSON"
                action="Export"
                onClick={() => setExportFormat("markdown")}
              />
              {exportFormat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setExportFormat(null)}>
                  <div className="bg-card rounded-lg p-4 w-full max-w-sm shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <h3 className="font-semibold mb-4">Choose Export Format</h3>
                    <div className="space-y-2">
                      <Button className="w-full justify-start" variant="outline" onClick={() => handleExport("json")} disabled={exportProgress.active}>
                        <FileText className="mr-2 h-4 w-4" />
                        JSON
                      </Button>
                      <Button className="w-full justify-start" variant="outline" onClick={() => handleExport("markdown")} disabled={exportProgress.active}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Markdown
                      </Button>
                      <Button className="w-full justify-start" variant="outline" onClick={() => handleExport("pdf")} disabled={exportProgress.active}>
                        <FileText className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                    {Object.keys(storedToolResults).length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium mb-2">Export Individual Tool</h4>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {Object.entries(storedToolResults).map(([tool]) => (
                            <Button
                              key={tool}
                              className="w-full justify-start text-xs"
                              variant="ghost"
                              onClick={() => handleExport("pdf", tool)}
                              disabled={exportProgress.active}
                            >
                              {tool.charAt(0).toUpperCase() + tool.slice(1)} (PDF)
                            </Button>
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
);
}

function MessageBubble({ message, onSpeak, speakingId }: { message: Message; onSpeak: (id: string, text: string) => void; speakingId: string | null }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "")}>
      {!isUser && <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Sparkles className="h-4 w-4 text-primary" /></div>}
      <div className={cn("max-w-[70%] flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
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
              onClick={() => onSpeak(message.id, message.content)}
            >
              {speakingId === message.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          )}
          {!isUser && (
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        {message.sources?.length && (
          <div className="mt-2 ml-10 flex flex-wrap gap-1">
            {message.sources.map((source, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                Source {i + 1}
              </span>
            ))}
          </div>
        )}
      </div>
      {isUser && <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><LucideUser className="h-4 w-4" /></div>}
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
              <p className="font-medium truncate text-sm">{material.url.split("/").pop() || "File"}</p>
              <p className="text-xs text-muted-foreground">{formatSize(material.size)} · {material.mimeType}</p>
            </div>
          </div>
          {detailed && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); }}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      {detailed && material.extractedText && (
        <CardContent className="pt-0">
          <div className="max-h-48 overflow-y-auto p-3 bg-muted/50 rounded-lg text-sm font-mono text-muted-foreground whitespace-pre-wrap">
            {material.extractedText.slice(0, 500)}{material.extractedText.length > 500 ? "..." : ""}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm">
              <FileDown className="mr-1 h-3 w-3" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); }}>
              <Edit className="mr-1 h-3 w-3" />
              View Text
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function StudyToolCard({ icon, title, description, action, onClick }: { icon: React.ReactNode; title: string; description: string; action: string; onClick: () => void }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button onClick={onClick}>{action}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// API route will be created separately