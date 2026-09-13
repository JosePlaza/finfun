-- Finfun · esquema mínimo de Supabase
-- Ejecutar en el SQL Editor del proyecto. Requiere tener activado el inicio de sesión anónimo
-- (Authentication → Providers → Anonymous sign-ins).

-- Hora del servidor: el reloj del juego. Así adelantar la hora del dispositivo no adelanta la isla.
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$ select now() $$;

grant execute on function public.server_now() to anon, authenticated;

-- Una partida por usuario (anónimo). El estado completo se guarda como JSON.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "cada usuario lee su partida" on public.saves
  for select using (auth.uid() = user_id);

create policy "cada usuario crea su partida" on public.saves
  for insert with check (auth.uid() = user_id);

create policy "cada usuario actualiza su partida" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
