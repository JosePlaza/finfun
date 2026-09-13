# Finfun

Juego web low poly para que los niños aprendan a ahorrar e invertir. **Un día real es un mes de isla.**

Estado: **P1 · La Meseta** (Mundo 1). Hucha, tienda con inflación, banco (cuenta remunerada), paga diaria, tarea de las bellotas, estaciones y el diario de Doña Tortuga. El concepto completo está en `docs/concepto.html`.

## Arrancar

```bash
nvm use 22        # o cualquier Node >= 22
npm install
npm run dev       # http://localhost:5173
```

Sin configurar nada, el juego funciona en **modo local**: guarda la partida en el navegador y usa la hora del dispositivo.

### Modo de pruebas

Con `npm run dev` (o añadiendo `?dev` a la URL en producción) aparece una barra que permite adelantar el reloj de la isla (+1, +3, +12 días) y borrar la partida. Así se puede ver un año completo en un minuto: estaciones, inflación, apertura del banco y diario.

### Supabase (opcional, recomendado para jugar de verdad)

1. Crea un proyecto en Supabase y activa **Authentication → Providers → Anonymous sign-ins**.
2. Ejecuta `supabase/schema.sql` en el SQL Editor.
3. Copia `.env.example` a `.env.local` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

Con Supabase, el reloj del juego es la **hora del servidor** (adelantar la hora del móvil no adelanta la isla) y la partida se guarda en la nube con un usuario anónimo.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (accesible desde el móvil en la misma red con `--host`, ya incluido) |
| `npm test` | Tests del motor de simulación (vitest) |
| `npm run typecheck` | Comprobación de tipos |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probar en el móvil |

## Estructura

```
src/
  sim/        Motor de simulación: puro, determinista, sin dependencias del render. Tests en engine.test.ts
    config.ts   Parámetros de la economía (paga, tipos, inflación, catálogo de la tienda)
    calendar.ts 1 día = 1 mes; estaciones; nombres de mes (el año de isla empieza en marzo)
    engine.ts   advanceTo(estado, ahora) recompone todos los meses pendientes; acciones del jugador
    diary.ts    Texto del diario de Doña Tortuga (inflación explicada, "¿y si…?")
  store/      Estado de la app (zustand + persist). Reloj, guardado local/remoto, paneles
  scene/      Isla en react-three-fiber: mesetas, agua, edificios, vegetación, estaciones, bellotas
  ui/         Interfaz móvil: pantalla de bautizo, barra superior, navegación inferior, paneles
  lib/        Cliente Supabase opcional (hora de servidor, guardado)
supabase/schema.sql   Función server_now() y tabla saves con RLS
docs/concepto.html    Documento de concepto del juego
```

## Reglas de la economía (Mundo 1)

- Paga: 30 euroLukys al mes de isla. Llega al buzón y se acumula sin tope si no entras.
- Tarea diaria: cinco bellotas escondidas por la isla; al recogerlas, de 1 a 3 euroLukys.
- Tienda: helado, cometa, balón, bici (180) y telescopio. Comprar la bici abre el Mundo 2.
- Inflación: cada cierre de año (día 12) se sortea entre 1,5 % y 4 % y sube los precios; los artículos de 10 o más euroLukys quedan en enteros (180 → 183).
- Banco: abre al cerrar el primer año; paga un 2,5 % anual repartido por meses. La retención del 19 % de Hacienda queda preparada (`taxesUnlocked`) para el Mundo 2.
- Todo el dinero se guarda en céntimos enteros; la simulación es idempotente: estar días sin entrar produce exactamente lo mismo que entrar cada día sin tocar nada.

## Siguientes fases

- **P2 · El Ayuntamiento**: bonos municipales a 1, 3 y 5 años, retención visible de Don Búho, primera tormenta, carnés de inversor.
- **P3 · El Mercado**: acciones de los cuatro comercios de inicio, Letras y Bonos del Reino, declaración anual, isla de la Liebre.
- **P4 · La Tormenta**: resto de comercios, corporativos, Obligaciones, Fondo Isla, crisis, plan a 20 años.
