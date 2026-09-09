"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Image, Send, Plus, X, File, Image as ImageIcon, MessageSquare, Loader2, Languages, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import { NEW_SESSION_EVENT } from "@/lib/browser-events";
import { ExplanationLanguagePicker } from "@/components/explanation-language-picker";
import { useStudyLanguage } from "@/hooks/use-study-language";
import { getStudyLanguage } from "@/lib/study-languages";
import { evaluateStudyScope } from "@/lib/study-scope";

export default function WorkspacePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [newSessionReady, setNewSessionReady] = useState(false);
  const [serviceState, setServiceState] = useState<"checking" | "ready" | "unavailable">("checking");
  const [scopeNotice, setScopeNotice] = useState<string | null>(null);
  const queryInputRef = useRef<HTMLTextAreaElement>(null);
  const { language, updateLanguage, isLoading: isLoadingLanguage, isSaving: isSavingLanguage, error: languageError } = useStudyLanguage();

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/health", { signal: controller.signal })
      .then(async (response) => {
        const readiness = await response.json().catch(() => null);
        setServiceState(response.ok && readiness?.status === "ok" ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) setServiceState("unavailable");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const resetDraft = () => {
      setQuery("");
      setFiles([]);
      setUploadProgress({});
      setNewSessionReady(true);
      queryInputRef.current?.focus();
    };

    window.addEventListener(NEW_SESSION_EVENT, resetDraft);
    return () => window.removeEventListener(NEW_SESSION_EVENT, resetDraft);
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
      "application/pdf": [".pdf"],
      "text/*": [".txt", ".md"],
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setUploadProgress({});
    files.forEach((file) => setUploadProgress((prev) => ({ ...prev, [file.name]: 0 })));

    const response = await fetch("/api/materials/upload", { credentials: "include",
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Upload failed");
    }

    const data = await response.json();
    return data.materials.map((m: any) => m.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && files.length === 0) return;
    const scope = evaluateStudyScope(query);
    if (!scope.allowed) {
      setScopeNotice(scope.message);
      queryInputRef.current?.focus();
      return;
    }
    setScopeNotice(null);
    setIsProcessing(true);

    try {
      const materialIds = await uploadFiles();

      const sessionRes = await fetch("/api/sessions", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: query.slice(0, 80) || "New Study Session",
          initialQuery: query,
          materialIds,
        }),
      });

      if (!sessionRes.ok) {
        const errorData = await sessionRes.json().catch(() => ({ message: "Failed to create session" }));
        throw new Error(errorData.message || "Failed to create session");
      }

      const { session } = await sessionRes.json();
      
      // Verify session exists before redirecting
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        const verifyRes = await fetch(`/api/sessions/${session.id}`, { credentials: "include" });
        if (verifyRes.ok) break;
        await new Promise(r => setTimeout(r, 200));
        retries++;
      }
      
      router.push(`/workspace/${session.id}`);
      router.refresh();
    } catch (error) {
      console.error("Submit error:", error);
      alert(error instanceof Error ? error.message : "Failed to start session");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">New Study Session</h1>
        <p className="mt-2 text-muted-foreground">
          Upload materials, ask questions, and get AI-powered explanations
        </p>
        {newSessionReady && (
          <p className="mt-2 text-sm text-primary" role="status">
            New session ready. Add a topic or attach source material.
          </p>
        )}
      </div>

      {serviceState === "unavailable" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100" role="alert">
          Study services are temporarily unavailable. Your selected files remain on this device and cannot be processed until storage and AI services are online.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><Languages className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <CardTitle>Choose your professor&apos;s language</CardTitle>
                <CardDescription className="mt-1">Professor MindForge will explain this session in your selected language.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ExplanationLanguagePicker
              id="workspace-explanation-language"
              value={language}
              onChange={(nextLanguage) => void updateLanguage(nextLanguage)}
              disabled={isProcessing || isLoadingLanguage || isSavingLanguage}
            />
            <p className="mt-2 text-xs text-muted-foreground">Current choice: {getStudyLanguage(language).name}. You can change it again inside the session.</p>
            {languageError && <p className="mt-2 text-xs text-destructive" role="alert">{languageError}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input Materials</CardTitle>
            <CardDescription>
              Upload documents, images, or type your question directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="query">Your Question / Topic</Label>
                <Textarea
                  ref={queryInputRef}
                  id="query"
                  placeholder="What would you like to learn about? Describe the topic, ask a question, or paste text..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (scopeNotice) setScopeNotice(null);
                  }}
                  rows={4}
                  className="resize-none"
                  disabled={isProcessing}
                />
                <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>Study-only mode accepts learning questions, concepts, assignments, research, and your uploaded materials. Utility requests such as live weather or trip planning are blocked.</span>
                </div>
                {scopeNotice && <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100" role="alert">{scopeNotice}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="study-materials">Attach Files (Optional)</Label>
              <div
                {...getRootProps()}
                className={cn(
                  "relative rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <input
                  {...getInputProps({
                    id: "study-materials",
                    "aria-label": "Attach Files (Optional)",
                  })}
                />
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {isDragActive
                        ? "Drop files here..."
                        : "Drag & drop files, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, TXT, MD, PNG, JPG, WEBP · Max 10MB each · Up to 5 files
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Attached Files</Label>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
                    >
                      <FileIcon mimeType={file.type} className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      {uploadProgress[file.name] !== undefined && (
                        <span className="text-xs text-primary">
                          {uploadProgress[file.name]}%
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="ml-auto p-1 text-muted-foreground hover:text-destructive"
                        aria-label="Remove file"
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={serviceState !== "ready" || isProcessing || isSavingLanguage || (!query.trim() && files.length === 0)}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : serviceState === "checking" ? (
            "Checking study services…"
          ) : serviceState === "unavailable" ? (
            "Study services unavailable"
          ) : (
            "Analyze & Start Session"
          )}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          AI requests send your prompt and relevant extracted material to Gemini&apos;s free tier,
          where Google may use submitted content to improve its products. See the Privacy Policy
          before submitting sensitive material.
        </p>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <FeaturePreview
          icon={<FileText className="h-5 w-5" />}
          title="Documents"
          description="PDF, TXT, Markdown files"
        />
        <FeaturePreview
          icon={<ImageIcon className="h-5 w-5" />}
          title="Images"
          description="PNG, JPG, WebP, GIF"
        />
        <FeaturePreview
          icon={<MessageSquare className="h-5 w-5" />}
          title="Text Input"
          description="Direct text & questions"
        />
      </div>
    </div>
  );
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className={className} />;
  if (mimeType === "application/pdf") return <FileText className={className} />;
  return <FileText className={className} />;
}

function FeaturePreview({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card/50">
      <div className="mb-2 text-primary">{icon}</div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
