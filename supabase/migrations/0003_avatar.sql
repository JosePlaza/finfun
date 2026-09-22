-- 0003 · Avatar del jugador
-- Cada cuenta elige un avatar (id del catálogo de src/scene/avatars/catalog.ts). Se guarda en el perfil,
-- así sale igual en todos los dispositivos y podrá verse en el ranking.

alter table public.profiles
  add column if not exists avatar text not null default 'gorra';

alter table public.profiles
  drop constraint if exists profiles_avatar_format;
alter table public.profiles
  add constraint profiles_avatar_format check (avatar ~ '^[a-z0-9-]{1,32}$');

-- El ranking devuelve también el avatar.
drop function if exists public.top_islands(integer);
create or replace function public.top_islands(n integer default 20)
returns table (username text, avatar text, island_name text, world integer, net_worth_cents bigint, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.username, p.avatar, s.island_name, s.world, s.net_worth_cents, s.updated_at
  from public.saves s
  join public.profiles p on p.user_id = s.user_id
  where s.state ->> 'dead' is distinct from 'true'
  order by s.net_worth_cents desc, s.updated_at asc
  limit greatest(1, least(n, 100))
$$;

grant execute on function public.top_islands(integer) to authenticated;
