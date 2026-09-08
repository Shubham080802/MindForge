"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      // Allow Escape to close dialogs even in inputs
      if (event.key !== "Escape") return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
      const altMatch = !!shortcut.altKey === event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Predefined shortcut sets
export function useGlobalShortcuts(onSearch: () => void) {
  const router = useRouter();
  const pathname = usePathname();

  const shortcuts: ShortcutConfig[] = [
    {
      key: "k",
      metaKey: true,
      action: onSearch,
      description: "Open search",
    },
    {
      key: "/",
      metaKey: true,
      action: onSearch,
      description: "Open search (alt)",
    },
    {
      key: "Escape",
      action: () => {
        // Close any open dialogs/modals - handled by components
      },
      description: "Close dialog",
    },
  ];

  // Add workspace-specific shortcuts when in workspace
  if (pathname?.startsWith("/workspace/")) {
    shortcuts.push(
      {
        key: "n",
        metaKey: true,
        action: () => router.push("/workspace"),
        description: "New session",
      },
      {
        key: "l",
        metaKey: true,
        action: () => router.push("/library"),
        description: "Go to library",
      }
    );
  }

  return shortcuts;
}

export function useSessionShortcuts(
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
  onSend: () => void,
  onSpeak: () => void,
  onNewSession: () => void
) {
  return [
    {
      key: "Enter",
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      action: onSend,
      description: "Send message",
      preventDefault: false, // Allow default (new line) with Shift+Enter
    },
    {
      key: "Enter",
      metaKey: false,
      ctrlKey: true,
      action: onSend,
      description: "Send message (Ctrl+Enter)",
      preventDefault: true,
    },
    {
      key: "s",
      metaKey: true,
      action: onSpeak,
      description: "Speak last response",
    },
    {
      key: "n",
      metaKey: true,
      shiftKey: true,
      action: onNewSession,
      description: "New session",
    },
    {
      key: "k",
      metaKey: true,
      action: () => {
        inputRef.current?.focus();
      },
      description: "Focus input",
    },
    {
      key: "Escape",
      action: () => {
        inputRef.current?.blur();
      },
      description: "Blur input / close dialogs",
    },
  ] as ShortcutConfig[];
}
