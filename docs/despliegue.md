# Finfun · Despliegue (Supabase + Vercel)

## 1. Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com) (región Europa).
2. **SQL Editor** → ejecutar en orden los ficheros de `supabase/migrations/` (`0001…`, `0002…`). Son idempotentes.
3. **Authentication → Providers → Email**: activado; **Confirm email: OFF**.
4. **Authentication → Providers → Anonymous sign-ins**: OFF.
5. **Authentication → URL Configuration**: `Site URL` = la URL pública (p. ej. `https://finfun.vercel.app`).
6. **Project Settings → API**: copiar `Project URL` y `anon public`.

## 2. Local

Crear `.env` en la raíz (no se sube al repo):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`npm run dev` → aparece la pantalla de acceso. La barra de desarrollo sigue disponible en `npm run dev`; en
producción solo si `VITE_ALLOW_DEV=true` (y `?dev` en la URL).

## 3. Vercel

1. Importar el repositorio (GitHub/GitLab) o `npx vercel` desde la carpeta. `vercel.json` ya fija framework Vite,
   `npm run build`, salida `dist` y la regla para que cualquier ruta cargue la app.
2. **Settings → Environment Variables**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Production y Preview).
3. Deploy. Después, poner esa URL en Supabase (paso 1.5).

## Qué pasa con las partidas

- La partida se guarda en `saves` (una por cuenta) 1,5 s después de cada acción y al salir de la página.
  En el navegador queda una copia rápida con la cuenta a la que pertenece (`saveOwner`).
- Primer inicio de sesión en un dispositivo que ya tenía una partida local de antes de las cuentas: esa
  partida se sube a la cuenta. Si la cuenta ya tiene partida, gana la que tenga más meses procesados.
- Cerrar sesión guarda y vacía la copia local; entrar con otra cuenta carga la suya.
- "Isla nueva" (tras morir) borra la partida de la cuenta y crea otra.
- El reloj del juego es el del servidor (`server_now`): adelantar la hora del móvil no adelanta la isla.

## Rankings (preparado, sin pantalla todavía)

`saves` guarda `island_name`, `world`, `processed_month` y `net_worth_cents` junto al JSON; `top_islands(n)`
devuelve las mejores islas con el nombre de jugador. Solo falta el panel que lo muestre.
