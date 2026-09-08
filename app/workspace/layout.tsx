"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NEW_SESSION_EVENT } from "@/lib/browser-events";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

interface SessionItem {
  id: string;
  title: string;
  updatedAt: string;
}

function WorkspaceLayoutContent({ children }: WorkspaceLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsState, setSessionsState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadSessions() {
      setSessionsState("loading");
      try {
        const response = await fetch("/api/sessions", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Session list returned ${response.status}`);

        const data = (await response.json()) as { sessions: SessionItem[] };
        setSessions(data.sessions);
        setSessionsState("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load session list:", error);
        setSessions([]);
        setSessionsState("unavailable");
      }
    }

    void loadSessions();
    return () => controller.abort();
  }, [pathname]);

  const currentSessionId = pathname.split("/")[2];

  const handleNewSession = () => {
    if (pathname === "/workspace") {
      window.dispatchEvent(new Event(NEW_SESSION_EVENT));
      return;
    }
    router.push("/workspace");
  };

  const handleSelectSession = (id: string) => {
    router.push(`/workspace/${id}`);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        sessions={sessions}
        emptyMessage={
          sessionsState === "loading"
            ? "Loading sessions…"
            : sessionsState === "unavailable"
              ? "Sessions are unavailable while storage is offline."
              : undefined
        }
        currentSessionId={currentSessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card px-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Workspace</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">User</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <ErrorBoundary>
      <WorkspaceLayoutContent>{children}</WorkspaceLayoutContent>
    </ErrorBoundary>
  );
}
