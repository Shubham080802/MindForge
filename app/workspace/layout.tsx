"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sessions = [
    { id: "1", title: "Machine Learning Basics", updatedAt: "2024-01-15T10:30:00Z" },
    { id: "2", title: "React Hooks Deep Dive", updatedAt: "2024-01-14T14:20:00Z" },
    { id: "3", title: "Database Design Patterns", updatedAt: "2024-01-13T09:15:00Z" },
  ];

  const currentSessionId = pathname.split("/")[2];

  const handleNewSession = () => {
    const newId = crypto.randomUUID();
    router.push(`/workspace/${newId}`);
  };

  const handleSelectSession = (id: string) => {
    router.push(`/workspace/${id}`);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        collapsed={false}
        onToggleCollapse={() => {}}
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