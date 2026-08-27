"use client";

import { useEffect, useState } from "react";
import { FormEvent } from "react";
import { DEMO_MODE } from "@/lib/config";
import { request } from "@/lib/api";
import { showToast } from "@/lib/toast";
import type { Material } from "@/lib/types";

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

export function useMaterials(selectedId: string | undefined, confirm: (message: string) => Promise<boolean>) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    const id = selectedId;
    let isCurrent = true;
    async function load() {
      try {
        if (DEMO_MODE) {
          if (isCurrent) setMaterials(DEMO_MATERIALS[id] ?? []);
          return;
        }
        const res = await request<{ materials: Material[] }>(`/api/materials?subjectId=${selectedId}`);
        if (isCurrent) setMaterials(res.materials);
      } catch {
        if (isCurrent) showToast("Could not load materials for this subject.", "error");
      }
    }
    load();
    return () => {
      isCurrent = false;
    };
  }, [selectedId]);

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
    if (!(await confirm("Remove this study material?"))) return;
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

  return { materials, busy, uploadMaterial, deleteMaterial };
}
