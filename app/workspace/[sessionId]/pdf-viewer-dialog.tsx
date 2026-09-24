"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Download, FileText, Image as LucideImage, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

interface PDFViewerDialogProps {
  material: Material | null;
  source?: { id?: string; start?: number; end?: number; excerpt?: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFViewerDialog({ material, source, open, onOpenChange }: PDFViewerDialogProps) {
  const highlightedText = React.useRef<HTMLElement | null>(null);
  const text = material?.extractedText ?? "";
  const hasRange = Boolean(source && Number.isInteger(source.start) && Number.isInteger(source.end)
    && source.start! >= 0 && source.end! > source.start! && source.end! <= text.length);
  const excerpt = hasRange ? text.slice(source!.start!, source!.end!) : source?.excerpt;

  React.useEffect(() => {
    if (open && hasRange && material?.mimeType !== "application/pdf") {
      highlightedText.current?.scrollIntoView({ block: "center" });
    }
  }, [open, hasRange, material?.id, material?.mimeType, source?.start]);

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", material.mimeType.startsWith("image/") ? "bg-green-100" : material.mimeType === "application/pdf" ? "bg-red-100" : "bg-blue-100")}>
              {material.mimeType.startsWith("image/") && <LucideImage className="h-5 w-5 text-green-600" />}
              {material.mimeType === "application/pdf" && <FileText className="h-5 w-5 text-red-600" />}
              {!material.mimeType.startsWith("image/") && material.mimeType !== "application/pdf" && <FileText className="h-5 w-5 text-blue-600" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-semibold">{material.fileName}</DialogTitle>
              <p className="text-xs text-muted-foreground">{material.mimeType} · {Math.round(material.size / 1024)} KB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
              <a href={material.url} download aria-label={`Download ${material.fileName}`}><Download className="h-4 w-4" /></a>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex h-[70vh] w-full flex-col overflow-hidden">
          {excerpt && (
            <section className="max-h-44 shrink-0 overflow-y-auto border-b bg-primary/5 p-4" aria-label="Referenced passage">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {source?.id ? `Source ${source.id}` : "Attached file preview"} · Extracted passage
              </p>
              <blockquote className="whitespace-pre-wrap text-sm leading-6">{excerpt}</blockquote>
            </section>
          )}
          {material.mimeType === "application/pdf" ? (
            <iframe
              src={`${material.url}#toolbar=1&navpanes=0&scrollbar=1`}
              className="min-h-0 w-full flex-1 border-0"
              title={`Original PDF: ${material.fileName}`}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : material.mimeType.startsWith("image/") ? (
            // The authenticated download route intentionally cannot be fetched by the image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={material.url}
              alt={material.fileName}
              className="min-h-0 w-full flex-1 object-contain p-4"
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-auto p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">
                {text ? hasRange ? <>
                  {text.slice(0, source!.start!)}
                  <mark ref={highlightedText} className="rounded bg-yellow-200 text-foreground dark:bg-yellow-700">{text.slice(source!.start!, source!.end!)}</mark>
                  {text.slice(source!.end!)}
                </> : text : "No text content available"}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
