"use client";

import { FormEvent, useMemo, useState } from "react";
import { DEMO_MODE } from "@/lib/config";
import { request } from "@/lib/api";
import { showToast } from "@/lib/toast";
import type { Subject } from "@/lib/types";

export function useSubjects(initialSubjects: Subject[]) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [selectedId, setSelectedId] = useState(initialSubjects[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => subjects.find((s) => s.id === selectedId), [subjects, selectedId]);

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

  return { subjects, selectedId, setSelectedId, selected, busy, createSubject, deleteSubjectById };
}
