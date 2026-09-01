"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { X, Download, FileText, Image as LucideImage, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Material {
  id: string;
  url: string;
  type: string;
  size: number;
  mimeType: string;
  extractedText: string | null;
  createdAt: string;
}

interface PDFViewerDialogProps {
  material: Material | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFViewerDialog({ material, open, onOpenChange }: PDFViewerDialogProps) {
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
              <DialogTitle className="truncate text-lg font-semibold">{material.url.split("/").pop() || "Document"}</DialogTitle>
              <p className="text-xs text-muted-foreground">{material.mimeType} · {Math.round(material.size / 1024)} KB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="h-[70vh] w-full">
          {material.mimeType === "application/pdf" ? (
            <iframe
              src={`${material.url}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              title="PDF Viewer"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : material.mimeType.startsWith("image/") ? (
            <img
              src={material.url}
              alt={material.url.split("/").pop() || "Image"}
              className="w-full h-full object-contain p-4"
            />
          ) : (
            <div className="p-6 h-full overflow-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">
                {material.extractedText || "No text content available"}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}