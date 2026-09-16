-- Finfun · 0001 · Reloj del servidor y tabla de partidas.
-- Ejecutar en el SQL Editor del proyecto (ver supabase/README.md). Las cuentas se configuran en 0002.

-- Hora del servidor: el reloj del juego. Así adelantar la hora del dispositivo no adelanta la isla.
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$ select now() $$;

grant execute on function public.server_now() to anon, authenticated;

-- Una partida por usuario. El estado completo se guarda como JSON.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "cada usuario lee su partida" on public.saves;
create policy "cada usuario lee su partida" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "cada usuario crea su partida" on public.saves;
create policy "cada usuario crea su partida" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "cada usuario actualiza su partida" on public.saves;
create policy "cada usuario actualiza su partida" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
