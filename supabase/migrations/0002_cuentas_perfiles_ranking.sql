-- Finfun · 0002 · Cuentas con correo y contraseña, perfiles con nombre único y columnas para rankings.
-- Ejecutar DESPUÉS de 0001. Requiere en Authentication → Providers → Email:
--   · Enable Email provider: ON
--   · Confirm email: OFF   (el registro entra directamente, sin correo de confirmación)
-- Y en Authentication → Providers → Anonymous sign-ins: OFF (la cuenta es obligatoria).

-- ───────────────────────── Perfiles ─────────────────────────
-- Un perfil por cuenta. El nombre del jugador es único sin distinguir mayúsculas ("Luky" y "luky" chocan).
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  is_adult    boolean not null default true,   -- quien se registra declara ser el adulto responsable
  created_at  timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,16}$')
);

create unique index if not exists profiles_username_unique on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "cada usuario lee su perfil" on public.profiles;
create policy "cada usuario lee su perfil" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "cada usuario crea su perfil" on public.profiles;
create policy "cada usuario crea su perfil" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "cada usuario actualiza su perfil" on public.profiles;
create policy "cada usuario actualiza su perfil" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Al crear la cuenta, Supabase Auth guarda el nombre elegido en raw_user_meta_data.username;
-- este disparador crea el perfil. Si el nombre ya existe, falla el registro entero (no queda cuenta sin perfil).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, username, is_adult)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'jugador_' || left(replace(new.id::text, '-', ''), 8)),
    coalesce((new.raw_user_meta_data ->> 'is_adult')::boolean, true)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿Está libre un nombre? Se puede llamar sin haber iniciado sesión (para avisar antes de registrarse).
create or replace function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name))
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ───────────────────────── Partidas: columnas para rankings ─────────────────────────
-- El estado completo sigue en `state` (jsonb). Estas columnas se rellenan solas al guardar, para poder
-- listar y ordenar partidas sin abrir cada JSON. El patrimonio lo manda el cliente (depende de los precios
-- del mercado, que se calculan en el juego).
alter table public.saves
  add column if not exists island_name      text,
  add column if not exists world            integer,
  add column if not exists processed_month  integer,
  add column if not exists net_worth_cents  bigint not null default 0;

create or replace function public.saves_extract()
returns trigger
language plpgsql
as $$
begin
  new.island_name     := new.state ->> 'islandName';
  new.world           := nullif(new.state ->> 'world', '')::integer;
  new.processed_month := nullif(new.state ->> 'processedMonth', '')::integer;
  new.updated_at      := now();
  return new;
end;
$$;

drop trigger if exists saves_extract_columns on public.saves;
create trigger saves_extract_columns
  before insert or update on public.saves
  for each row execute function public.saves_extract();

create index if not exists saves_net_worth_idx on public.saves (net_worth_cents desc);
create index if not exists saves_world_idx on public.saves (world desc, net_worth_cents desc);

-- Ranking (para el futuro): las N mejores islas, con el nombre del jugador. Solo expone lo que se ve en
-- una clasificación: nombre, isla, nivel y patrimonio. Nada del JSON de la partida.
create or replace function public.top_islands(n integer default 20)
returns table (username text, island_name text, world integer, net_worth_cents bigint, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.username, s.island_name, s.world, s.net_worth_cents, s.updated_at
  from public.saves s
  join public.profiles p on p.user_id = s.user_id
  where s.state ->> 'dead' is distinct from 'true'
  order by s.net_worth_cents desc, s.updated_at asc
  limit greatest(1, least(n, 100))
$$;

grant execute on function public.top_islands(integer) to authenticated;

-- Empezar una isla nueva borra la partida anterior de la cuenta.
drop policy if exists "cada usuario borra su partida" on public.saves;
create policy "cada usuario borra su partida" on public.saves
  for delete using (auth.uid() = user_id);
