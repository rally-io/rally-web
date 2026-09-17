-- Team tasks board for /team-tasks (Almog · Mor · Shahaf).
-- Run once in the Supabase SQL Editor. Safe to re-run except the seed block at the bottom.

create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text,
  added_by text,
  is_done boolean not null default false,
  done_by text,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.team_tasks enable row level security;

-- The board is an internal 3-person list behind the public anon key; content is
-- non-sensitive (to-dos), so policies are intentionally open to anon.
drop policy if exists "team_tasks read" on public.team_tasks;
drop policy if exists "team_tasks insert" on public.team_tasks;
drop policy if exists "team_tasks update" on public.team_tasks;
drop policy if exists "team_tasks delete" on public.team_tasks;
create policy "team_tasks read"   on public.team_tasks for select to anon, authenticated using (true);
create policy "team_tasks insert" on public.team_tasks for insert to anon, authenticated with check (true);
create policy "team_tasks update" on public.team_tasks for update to anon, authenticated using (true) with check (true);
create policy "team_tasks delete" on public.team_tasks for delete to anon, authenticated using (true);

-- Live sync between open tabs.
do $$
begin
  alter publication supabase_realtime add table public.team_tasks;
exception when duplicate_object then null;
end $$;

-- Seed: all August 2026 tournaments (from Rally-Tournaments-Aug-Sep-2026.pdf, 9.8.2026).
-- Run this block once only.
insert into public.team_tasks (title, tag, created_at) values
  ('טורניר 13.8 · יום ה׳ 18:30–23:00 · תחרות השקה פאדל קלאב מכבים (מודיעין) · B1–B2 · 48 שחקנים', 'tournament', now() + interval '1 second'),
  ('טורניר 17.8 · יום ב׳ 18:30–23:30 · תחרות לרמות A · פאדל קלאב קאנטרי כפר סבא · A2',              'tournament', now() + interval '2 seconds'),
  ('טורניר 18.8 · יום ג׳ 17:00–22:00 · טורניר ערב פאדל טיים יבנה · רמה 3.5–4 · C1–B2',              'tournament', now() + interval '3 seconds'),
  ('טורניר 20.8 · יום ה׳ 20:00–23:30 · תחרות לרמות B1–B2 · פאדל ישראל מכבי רחובות · 32 שחקנים',     'tournament', now() + interval '4 seconds'),
  ('טורניר 21.8 · יום ו׳ 07:30–13:30 · רמה C + השקת Rally · כפר המכביה · C1–B2 · 64 שחקנים · נסיעה לחו״ל לזוכים', 'tournament', now() + interval '5 seconds'),
  ('טורניר 23.8 · יום א׳ 20:00–23:30 · פאדל ישראל פתח תקווה · C1–B2 · 32 שחקנים',                   'tournament', now() + interval '6 seconds'),
  ('טורניר 27.8 · יום ה׳ 20:00–23:30 · פאדל ישראל מכבי רחובות · C1–C2 · 32 שחקנים',                 'tournament', now() + interval '7 seconds'),
  ('טורניר 28.8 · יום ו׳ 07:30–13:00 · מועד שני רמה C + השקת Rally · כפר המכביה · C1–B2 · 64 שחקנים', 'tournament', now() + interval '8 seconds');
