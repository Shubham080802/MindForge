"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, History, ChevronLeft, ChevronRight } from "lucide-react";
import { formatRelativeTime, generateSessionTitle } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SessionItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  sessions: SessionItem[];
  currentSessionId?: string;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  sessions,
  currentSessionId,
  onNewSession,
  onSelectSession,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col h-full border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/workspace" className="flex items-center gap-2 font-semibold text-lg">
            <span className="text-primary">Mind</span>
            <span className="text-foreground">Forge</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="p-4 border-b">
          <Button
            className={cn("w-full justify-start gap-2", collapsed && "justify-center")}
            onClick={onNewSession}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>New Session</span>}
          </Button>
        </div>

        <ScrollArea className="flex-1 p-2">
          {!collapsed ? (
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No sessions yet. Create your first study session!
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                      "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      session.id === currentSessionId
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:text-foreground"
                    )}
                  >
                    <div className="truncate font-medium">{session.title}</div>
                    <div className="truncate text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(session.updatedAt)}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewSession}
                title="New Session"
                aria-label="New Session"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <div className="flex-1 overflow-hidden" />
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="border-t p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-sm font-medium">U</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">User</p>
              <p className="text-xs text-muted-foreground truncate">user@example.com</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}