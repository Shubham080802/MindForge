"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Palette, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme = "system", setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "" });

  useEffect(() => {
    void fetch("/api/user/profile")
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile could not be loaded");
        return response.json();
      })
      .then(({ user }) => setProfile({ name: user.name || "", email: user.email || "" }))
      .catch(() => setProfile((current) => ({
        ...current,
        name: user?.fullName || "",
        email: user?.primaryEmailAddress?.emailAddress || "",
      })));
  }, [user?.fullName, user?.primaryEmailAddress?.emailAddress]);

  async function saveProfile() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name }),
      });
      if (!response.ok) throw new Error("Profile could not be updated");
      await user?.reload();
      setMessage({ type: "success", text: "Profile updated" });
    } catch {
      setMessage({ type: "error", text: "Profile could not be updated" });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAccount() {
    if (!confirm("Delete your account and all study data? This cannot be undone.")) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/account", { method: "DELETE" });
      if (!response.ok) throw new Error("Account could not be deleted");
      await signOut({ redirectUrl: "/" });
    } catch {
      setMessage({ type: "error", text: "Account could not be deleted" });
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b"><div className="container flex h-16 items-center justify-between px-4"><Link href="/" className="text-xl font-semibold"><span className="text-primary">Mind</span>Forge</Link><Button variant="outline" size="sm" asChild><Link href="/workspace"><ArrowLeft className="mr-2 h-4 w-4" />Back to workspace</Link></Button></div></header>
      <main className="container px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your profile, appearance, and account data.</p>

          {message && <div className={cn("my-6 flex items-center gap-2 rounded-lg border p-4", message.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800")}>{message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}<span>{message.text}</span></div>}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8 w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
              <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" />Appearance</TabsTrigger>
              <TabsTrigger value="danger"><AlertCircle className="mr-2 h-4 w-4 text-red-500" />Data</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <Card><CardHeader><CardTitle>Profile information</CardTitle><CardDescription>Update the display name shown throughout MindForge.</CardDescription></CardHeader><CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={profile.email} disabled className="bg-muted" /></div>
                <Button onClick={saveProfile} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes</Button>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="appearance" className="mt-6">
              <Card><CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Choose how MindForge looks on this device.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-3 gap-4">{["light", "dark", "system"].map((option) => <button key={option} onClick={() => setTheme(option)} className={cn("rounded-lg border-2 p-4 text-center capitalize", theme === option ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>{option}</button>)}</div></CardContent></Card>
            </TabsContent>

            <TabsContent value="danger" className="mt-6">
              <Card className="border-red-200"><CardHeader><CardTitle className="text-red-700">Delete account</CardTitle><CardDescription>Permanently remove your sessions, messages, and uploaded materials.</CardDescription></CardHeader><CardContent><Button variant="destructive" onClick={deleteAccount} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete account and data</Button></CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
