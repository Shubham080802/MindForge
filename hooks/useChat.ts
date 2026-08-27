"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { FormEvent } from "react";
import { DEMO_MODE } from "@/lib/config";
import { request } from "@/lib/api";
import { showToast } from "@/lib/toast";
import type { Message } from "@/lib/types";

const DEMO_RESPONSES = [
  "Great question! Based on your uploaded materials, here's a clear explanation:\n\n**Key concept:** The fundamental idea is that you build understanding incrementally. Start with the basics, then layer complexity.\n\n**From your notes:** Your lecture notes emphasize the importance of practice and repetition. The cheatsheet suggests focusing on the 20% of topics that cover 80% of use cases.\n\n**Quick example:** Think of it like learning a language — you don't memorize the dictionary, you start with common phrases.\n\nWould you like me to elaborate on any specific part?",
  "Here's how I'd approach this based on your materials:\n\n1. **Break it down** — Your notes suggest decomposing complex problems into smaller, manageable pieces.\n2. **Pattern match** — Look for similarities with examples you've already studied.\n3. **Verify** — Cross-check against the source material.\n\nThis aligns with the methodology outlined in week 1 of your lecture notes. The key insight is that consistency beats intensity.",
  "Based on your study materials, the answer connects to a few core principles:\n\n- **Principle 1:** Foundation first — ensure you understand the prerequisites.\n- **Principle 2:** Active recall — test yourself rather than re-reading.\n- **Principle 3:** Spaced repetition — review at increasing intervals.\n\nYour cheatsheet specifically highlights that most students struggle because they skip the foundation step. Take your time with the basics.",
];

export function useChat(selectedId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [playingMsgIndex, setPlayingMsgIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    let isCurrent = true;
    async function load() {
      try {
        if (DEMO_MODE) {
          if (isCurrent) {
            setConversationId(undefined);
            try {
              const saved = localStorage.getItem(`mindforge-chat-${selectedId}`);
              setMessages(saved ? (JSON.parse(saved) as Message[]) : []);
            } catch {
              setMessages([]);
            }
          }
          return;
        }
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
        }
      } catch {
        if (isCurrent) showToast("Could not load data for this subject.", "error");
      }
    }
    load();
    return () => {
      isCurrent = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (DEMO_MODE && selectedId && messages.length > 0) {
      try {
        localStorage.setItem(`mindforge-chat-${selectedId}`, JSON.stringify(messages));
      } catch {
        /* ignore quota errors */
      }
    }
  }, [messages, selectedId]);

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

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
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

  return {
    messages,
    pendingImages,
    conversationId,
    busy,
    playingMsgIndex,
    sendMessage,
    handleImageSelect,
    removePendingImage,
    toggleSpeech,
  };
}
