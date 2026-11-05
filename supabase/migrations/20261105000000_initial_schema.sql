-- Application access stays closed until the policies migration is applied.
create type public.app_role as enum ('manager', 'executor');
create type public.task_status as enum (
  'new', 'in_progress', 'in_review', 'accepted', 'rework'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null check (btrim(display_name) <> ''),
  role public.app_role not null
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  address text not null check (btrim(address) <> '')
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  description text,
  assignee_id uuid not null references public.profiles (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  status public.task_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.task_status_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  from_status public.task_status,
  to_status public.task_status not null,
  comment text,
  changed_at timestamptz not null default now(),
  constraint history_creation_status check ((from_status is null) = (to_status = 'new')),
  constraint history_status_changed check (from_status is distinct from to_status),
  constraint history_rework_comment check (
    to_status <> 'rework' or (comment is not null and comment ~ '[^[:space:]]')
  )
);

create index tasks_object_idx on public.tasks (object_id);
create index tasks_assignee_object_idx on public.tasks (assignee_id, object_id);
create index task_history_timeline_idx on public.task_status_history (task_id, changed_at, id);

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

revoke all privileges on table public.profiles, public.objects, public.tasks,
  public.task_status_history from public, anon, authenticated;
revoke all privileges on sequence public.task_status_history_id_seq from public, anon, authenticated;
