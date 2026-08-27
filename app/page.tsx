import Link from "next/link";
import { StudyWorkspace } from "@/components/study-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="landing">
        <p className="eyebrow">STUDY ROOM</p>
        <h1>Your notes, made easier to return to.</h1>
        <p className="lede">Bring in the lecture notes you actually have. Ask when something doesn’t land, practise what you know, and hear a clearer explanation when you need one.</p>
        <Link className="primary" href="/auth/login">Open your study room</Link>
        <p className="fineprint">Your materials stay in your private workspace. Nothing is kept in browser local storage.</p>
      </main>
    );
  }
  const { data: subjects } = await supabase.from("subjects").select("id,name,description,created_at").order("created_at", { ascending: false });
  return <StudyWorkspace initialSubjects={subjects ?? []} />;
}
