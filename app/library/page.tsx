"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, FileText, MessageSquare, Calendar, ChevronRight, Filter, X, Trash2, Edit, File, FileSearch, MessageCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  materials: Array<{ id: string; type: string; size: number }>;
  messages: Array<{ id: string }>;
  _count: { materials: number; messages: number };
}

interface SearchResult {
  type: "session" | "material" | "message";
  id: string;
  title?: string;
  snippet: string;
  role?: "user" | "assistant";
  sessionId?: string;
  sessionTitle?: string;
  materialCount?: number;
  messageCount?: number;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  url?: string;
}

export default function LibraryPage() {
  const router = useRouter();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "title" | "materials" | "messages">("date");
  const [globalSearch, setGlobalSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchType, setSearchType] = useState<"all" | "sessions" | "materials" | "messages">("all");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      const sorted = data.sessions.sort((a: Session, b: Session) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setSessions(sorted);
      setFilteredSessions(sorted);
    } catch (error) {
      console.error("Fetch sessions error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const performGlobalSearch = useCallback(async (query: string, type: "all" | "sessions" | "materials" | "messages") => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}&limit=50`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results);
    } catch (error) {
      console.error("Global search error:", error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (globalSearch && searchQuery.trim()) {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        performGlobalSearch(searchQuery, searchType);
      }, 300);
    } else if (globalSearch) {
      setSearchResults([]);
    }
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, globalSearch, searchType, performGlobalSearch]);

  useEffect(() => {
    let filtered = sessions;

    if (searchQuery && !globalSearch) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) => s.title.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "materials":
          return b._count.materials - a._count.materials;
        case "messages":
          return b._count.messages - a._count.messages;
        case "date":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    setFilteredSessions(filtered);
  }, [sessions, searchQuery, sortBy, globalSearch]);

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Delete this session? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      alert("Failed to delete session");
    }
  };

  const handleRename = async (sessionId: string, currentTitle: string) => {
    const newTitle = prompt("Enter new title:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      fetchSessions();
    } catch (error) {
      alert("Failed to rename session");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <span className="text-primary">Mind</span>
            <span className="text-foreground">Forge</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/library" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Library
            </Link>
            <Link href="/workspace" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              New Session
            </Link>
          </nav>
        </div>
      </header>

      <main className="container py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Library</h1>
              <p className="mt-1 text-muted-foreground">
                {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""} · All your study materials in one place
              </p>
            </div>
            <Link href="/workspace">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={globalSearch ? "Search sessions, materials, messages..." : "Search sessions..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border border-input bg-background px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={globalSearch}
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="materials">Sort by Materials</option>
                <option value="messages">Sort by Messages</option>
              </select>
              <Button
                variant={globalSearch ? "default" : "outline"}
                onClick={() => setGlobalSearch(!globalSearch)}
                className="gap-2"
              >
                <FileSearch className="h-4 w-4" />
                <span className="hidden sm:inline">{globalSearch ? "Session View" : "Global Search"}</span>
              </Button>
              {globalSearch && (
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as typeof searchType)}
                  className="border border-input bg-background px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="sessions">Sessions</option>
                  <option value="materials">Materials</option>
                  <option value="messages">Messages</option>
                </select>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          ) : globalSearch ? (
            <SearchResults
              results={searchResults}
              loading={searchLoading}
              query={searchQuery}
              onResultClick={(result) => router.push(result.url || "/library")}
            />
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No sessions found</h2>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? "Try adjusting your search" : "Start your first study session"}
              </p>
              <Link href="/workspace">
                <Button size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Session
                </Button>
              </Link>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </main>
    </div>
  );
}

function SessionCard({ session, onDelete, onRename }: { session: Session; onDelete: (id: string) => void; onRename: (id: string, title: string) => void }) {
  return (
    <Card className="h-full flex flex-col transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{session.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Updated {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRename(session.id, session.title)} title="Rename">
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => onDelete(session.id)} title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-3 mb-4 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{session._count.materials}</p>
            <p className="text-xs text-muted-foreground">Materials</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{session._count.messages}</p>
            <p className="text-xs text-muted-foreground">Messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Calendar className="h-3.5 w-3.5" />
          <span>Created {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
        </div>
        {session.materials.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">File types:</p>
            <div className="flex flex-wrap gap-1">
              {session.materials.slice(0, 4).map((m) => (
                <span key={m.id} className="px-2 py-0.5 text-xs bg-muted rounded">{m.type}</span>
              ))}
              {session.materials.length > 4 && (
                <span className="px-2 py-0.5 text-xs bg-muted rounded">
                  +{session.materials.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
        <Link href={`/workspace/${session.id}`} className="mt-auto">
          <Button className="w-full" size="sm">
            <MessageSquare className="mr-2 h-3.5 w-3.5" />
            Continue Session
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
 
function SearchResults({
  results,
  loading,
  query,
  onResultClick,
}: {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onResultClick: (result: SearchResult) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SearchResultSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <FileSearch className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-muted-foreground mb-6">
          No matches for &ldquo;{query}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {results.map((result) => (
          <SearchResultCard key={result.id} result={result} onClick={onResultClick} />
        ))}
      </div>
    </div>
  );
}

function SearchResultCard({ result, onClick }: { result: SearchResult; onClick: (result: SearchResult) => void }) {
  const getIcon = () => {
    switch (result.type) {
      case "session":
        return <FileText className="h-5 w-5 text-primary" />;
      case "material":
        return <File className="h-5 w-5 text-green-600" />;
      case "message":
        return <MessageCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (result.type) {
      case "session":
        return "Session";
      case "material":
        return "Material";
      case "message":
        return result.role === "user" ? "Your message" : "AI response";
      default:
        return "";
    }
  };

  return (
    <Card className="h-full flex flex-col cursor-pointer transition-shadow hover:shadow-lg" onClick={() => onClick(result)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {getIcon()}
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{result.title || "Untitled"}</CardTitle>
              <p className="text-xs text-muted-foreground">{getTypeLabel()}</p>
            </div>
          </div>
          {result.sessionTitle && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded truncate max-w-[150px]">
              {result.sessionTitle}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{result.snippet}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {result.type === "session" && (
            <>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {result.materialCount} materials
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {result.messageCount} messages
              </span>
            </>
          )}
          {result.type === "material" && result.size && (
            <span className="flex items-center gap-1">
              <File className="h-3.5 w-3.5" />
              {(result.size / 1024).toFixed(1)} KB
            </span>
          )}
          {result.createdAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SearchResultSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted animate-pulse rounded" />
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="h-12 bg-muted animate-pulse rounded mb-4" />
        <div className="flex items-center gap-4 text-xs">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
        <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-16 bg-muted animate-pulse rounded-lg" />
          <div className="h-16 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="h-3 w-1/3 bg-muted animate-pulse rounded mb-4" />
        <div className="flex flex-wrap gap-1 mb-4">
          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="mt-auto h-10 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}