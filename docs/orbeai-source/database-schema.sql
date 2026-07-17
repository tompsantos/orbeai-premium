-- orbeAI — schema de referência (Postgres / Supabase)
-- Mock-first; aplicar quando migrar para backend real (Fase 1+).
-- Todas as tabelas são escopadas por workspace_id e contam com RLS.

create table if not exists profiles (
  id uuid primary key,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'free',
  seats int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  created_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  created_by uuid references profiles(id),
  name text not null,
  description text,
  status text default 'ativo',
  product text,
  memory_mode text default 'isolada',
  brief text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  kind text,
  size_kb int,
  storage_path text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id),
  title text,
  mode text,
  model text,
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  role text not null,
  content text,
  model text,
  mode text,
  pinned boolean default false,
  router_decision jsonb,
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id),
  title text not null,
  kind text not null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid references artifacts(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  created_by uuid references profiles(id),
  note text,
  content text,
  created_at timestamptz default now()
);

create table if not exists memory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id),
  scope text not null,
  label text not null,
  content text,
  source text,
  reason text,
  confidence numeric default 0,
  status text default 'pendente',
  last_used timestamptz default now(),
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists agents (
  slug text primary key,
  name text not null,
  role text,
  description text,
  status text default 'ativo',
  tools text[],
  memory_scope text,
  metadata jsonb default '{}'::jsonb
);

create table if not exists integrations (
  slug text primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  category text,
  status text default 'disponível',
  description text,
  permissions text[],
  connected_by uuid references profiles(id),
  connected_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create table if not exists model_providers (
  slug text primary key,
  name text not null,
  status text default 'placeholder',
  models text[],
  api_key_status text,
  latency_ms int,
  cost_per_k_tokens numeric,
  metadata jsonb default '{}'::jsonb
);

create table if not exists model_routes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  task text,
  provider text references model_providers(slug),
  model text,
  reason text,
  task_hints text[],
  quality_tier text,
  estimated_latency_ms int,
  estimated_cost_usd numeric,
  created_at timestamptz default now()
);

create table if not exists model_configs (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  default_provider text,
  fallback_chain text[],
  routing_mode text,
  updated_at timestamptz default now()
);

create table if not exists research_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  created_by uuid references profiles(id),
  question text,
  status text default 'rascunho',
  plan jsonb,
  sources jsonb,
  summary text,
  risks jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  actor text,
  action text,
  target text,
  level text default 'info',
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  provider text,
  tokens int default 0,
  requests int default 0,
  cost_usd numeric default 0,
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists feature_flags (
  key text primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  label text,
  enabled boolean default false,
  audience text default 'todos',
  updated_at timestamptz default now()
);
