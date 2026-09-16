# Supabase · migraciones de Finfun

Los ficheros de `migrations/` se ejecutan **en orden**, una sola vez cada uno, en el SQL Editor del proyecto
(Supabase → SQL Editor → New query → pegar → Run). Son idempotentes: volver a ejecutar uno no rompe nada.

| Fichero | Qué crea |
| --- | --- |
| `0001_reloj_y_partidas.sql` | La RPC `server_now` (el reloj del juego es el del servidor) y la tabla `saves` (una partida por usuario, JSON completo) con sus políticas RLS. |
| `0002_cuentas_perfiles_ranking.sql` | Tabla `profiles` (nombre de jugador **único**, sin distinguir mayúsculas; `is_adult`), disparador que crea el perfil al registrarse, RPC `username_available`, columnas de ranking en `saves` (`island_name`, `world`, `processed_month`, `net_worth_cents`) rellenadas por disparador, y la RPC `top_islands(n)` para clasificaciones futuras. |

## Ajustes del panel de Supabase (una vez)

1. **Authentication → Providers → Email**: activado, y **Confirm email desactivado** (el registro entra directo).
2. **Authentication → Providers → Anonymous sign-ins**: desactivado (la cuenta es obligatoria).
3. **Authentication → URL Configuration**: Site URL = la URL de Vercel (p. ej. `https://finfun.vercel.app`).
4. **Project Settings → API**: copiar `Project URL` y `anon public` key al `.env` del proyecto:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Y las mismas dos variables en Vercel (Project → Settings → Environment Variables). Sin ellas el juego
funciona en modo local (partida en el navegador, sin cuentas), útil para desarrollar.

## Modelo

- `auth.users` → una cuenta por adulto responsable (correo + contraseña).
- `profiles` → `username` único, elegido al registrarse. Es el nombre que saldrá en los rankings.
- `saves` → la partida: `state` (JSON con todo) + columnas derivadas para ordenar y listar.
- Con RLS, cada cuenta solo puede leer y escribir su propio perfil y su propia partida. El ranking se
  consulta a través de `top_islands`, que solo devuelve nombre, isla, nivel y patrimonio.

## Añadir una migración

Crear `migrations/000N_descripcion.sql`, siempre con `if not exists` / `create or replace` / `drop … if exists`
para que se pueda volver a ejecutar, y anotarla en la tabla de arriba.
