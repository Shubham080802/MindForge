-- Hosted PostgreSQL schema for Private Study Agent.
-- Run this migration in the target Supabase project; never use a local database
-- for learner data in this application.
create extension if not exists pgcrypto;
create extension if not exists vector;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text not null check (mime_type in ('text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  object_path text not null unique,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  byte_size integer not null check (byte_size > 0),
  processing_status text not null default 'pending' check (processing_status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

-- EMBEDDING_DIMENSIONS must match the configured embedding model at deploy time.
create table public.material_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  content text not null check (char_length(content) between 1 and 12000),
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  unique(material_id, ordinal)
);
create index material_chunks_subject_owner_idx on public.material_chunks(subject_id, owner_id);
create index material_chunks_embedding_idx on public.material_chunks using hnsw (embedding vector_cosine_ops);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 16000),
  created_at timestamptz not null default now()
);

create table public.study_questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z_]{1,80}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.materials enable row level security;
alter table public.material_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.study_questions enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles are private" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "owners manage subjects" on public.subjects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage materials" on public.materials for all using (owner_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.owner_id = auth.uid())) with check (owner_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.owner_id = auth.uid()));
create policy "owners manage chunks" on public.material_chunks for all using (owner_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.owner_id = auth.uid())) with check (owner_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.owner_id = auth.uid()));
create policy "owners manage conversations" on public.conversations for all using (owner_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.owner_id = auth.uid())) with check (owner_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.owner_id = auth.uid()));
create policy "owners manage messages" on public.messages for all using (owner_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and c.owner_id = auth.uid())) with check (owner_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and c.owner_id = auth.uid()));
create policy "owners manage questions" on public.study_questions for all using (owner_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.owner_id = auth.uid())) with check (owner_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.owner_id = auth.uid()));
create policy "owners read audit events" on public.audit_events for select using (owner_id = auth.uid());
create policy "owners create audit events" on public.audit_events for insert with check (owner_id = auth.uid());

-- Files are private. The path must begin with the authenticated user's id.
insert into storage.buckets (id, name, public) values ('study-materials', 'study-materials', false) on conflict (id) do nothing;
create policy "users upload their own study files" on storage.objects for insert to authenticated with check (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read their own study files" on storage.objects for select to authenticated using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete their own study files" on storage.objects for delete to authenticated using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger subjects_updated_at before update on public.subjects for each row execute procedure public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute procedure public.set_updated_at();

-- SECURITY INVOKER is intentional: RLS remains active, and the explicit owner
-- condition prevents a subject identifier from crossing tenant boundaries.
create or replace function public.match_material_chunks(
  p_subject_id uuid,
  p_embedding vector(1536),
  p_match_count integer default 8
)
returns table(id uuid, content text, source_name text, similarity double precision)
language sql stable security invoker set search_path = public as $$
  select c.id, c.content, m.original_name, 1 - (c.embedding <=> p_embedding)
  from public.material_chunks c
  join public.materials m on m.id = c.material_id
  where c.subject_id = p_subject_id and c.owner_id = auth.uid()
  order by c.embedding <=> p_embedding
  limit least(greatest(p_match_count, 1), 12);
$$;
grant execute on function public.match_material_chunks(uuid, vector, integer) to authenticated;
