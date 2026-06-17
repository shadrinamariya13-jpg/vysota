-- ============================================================
--   Кофе — таск-трекер. Настройка базы данных Supabase.
--   Запустить ОДИН раз в SQL Editor нового проекта.
-- ============================================================

-- 1. Таблица задач
create table if not exists public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text default '',
  category text not null default 'personal'
    check (category in ('work', 'personal')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  start_time timestamptz,
  end_time timestamptz,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekdays', 'weekly', 'monthly')),
  recurrence_end date,
  parent_recurrence_id uuid,
  reminder_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- индексы для быстрых выборок
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_updated_idx on public.tasks (user_id, updated_at desc);

-- 2. Включаем RLS (Row Level Security) — каждый видит только свои задачи
alter table public.tasks enable row level security;

drop policy if exists "tasks: select own" on public.tasks;
drop policy if exists "tasks: insert own" on public.tasks;
drop policy if exists "tasks: update own" on public.tasks;
drop policy if exists "tasks: delete own" on public.tasks;

create policy "tasks: select own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks: insert own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks: update own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks: delete own"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- 3. Realtime — чтобы менять задачи на одном устройстве и видеть на другом
alter publication supabase_realtime add table public.tasks;
