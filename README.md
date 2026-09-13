# Finfun

Juego web low poly para que los niños aprendan a ahorrar e invertir. **Un día real es un mes de isla.**

Estado: **P1 · La Isla** (Mundo 1). Mundo 3D modular en tres niveles con faro, banco, casa, cueva con cofre y barca mercante; paga diaria, tarea de las bellotas, inflación, banco (cuenta remunerada), estaciones y el diario de Doña Tortuga. El concepto completo está en `docs/concepto.html`.

## Arrancar

```bash
nvm use 22        # o cualquier Node >= 22
npm install
npm run dev       # http://localhost:5180
```

Sin configurar nada, el juego funciona en **modo local**: guarda la partida en el navegador y usa la hora del dispositivo.

### Modo de pruebas

Con `npm run dev` (o añadiendo `?dev` a la URL en producción) aparece una barra que permite adelantar el reloj de la isla (+1, +3, +12 días) y borrar la partida. `?hour=22` fuerza la hora del día para ver la isla de noche (ventanas encendidas, haz del faro). Así se puede ver un año completo en un minuto: estaciones, inflación, apertura del banco y diario.

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
  store/      Estado de la app (zustand + persist). Reloj, guardado local/remoto, lugar activo (view)
  scene/      EL MUNDO 3D (react-three-fiber)
    palette.ts     Paleta única del mundo (C), paletas por estación y escala (1 unidad ≈ 1 m)
    kit/Parts.tsx  Kit de piezas: Wall, GableRoof, HipRoof, ConeRoof, Gable, Door, Window, Chimney, Fence,
                   Column, Steps, Lantern, Crate, Barrel, Sack, Sign, FlagPole, CoinEmblem, Label, TapZone…
    kit/Nature.tsx Palm, Bush, Flowers, GrassTuft, Rock, RockCluster, Acorn
    kit/Objects.tsx Objetos comprados (cometa, balón, bici, telescopio)
    Terrain.tsx    Terrace (meseta natural con roca en el borde), Beach, Path, Stairs, Water
    buildings/     Un archivo por lugar, montado SOLO con piezas del kit: House, Bank, Lighthouse, Cave (+Chest), Pier (+MerchantBoat)
    registry.ts    Niveles de terreno, lugares (posición, giro, encuadre de cámara) y cálculo de poses
    Island.tsx     Composición de la isla + CameraRig (la cámara vuela al lugar activo)
  ui/         Interfaz móvil: bautizo, barra superior, navegación inferior (= lugares), paneles por lugar
  lib/        Cliente Supabase opcional (hora de servidor, guardado)
supabase/schema.sql   Función server_now() y tabla saves con RLS
docs/concepto.html    Documento de concepto del juego
```

## El mundo es modular: cómo añadir un edificio

1. **Modela con el kit.** Crea `src/scene/buildings/MiEdificio.tsx` y compón el edificio con las piezas de `kit/Parts.tsx`
   (muros, tejados, puertas, ventanas, farolas…). Si necesitas una pieza nueva, añádela al kit para que la hereden los demás.
   Colores solo desde `C` (palette.ts). La fachada mira a +Z; el mundo lo gira con `rotation`.
2. **Regístralo.** Añade su id a `PlaceId` y su entrada en `PLACES` (`registry.ts`): posición sobre un nivel (`LEVELS`),
   giro (π/4 mira a la cámara) y encuadre de cámara (`frameW × frameH` que debe caber, elevación, desviación).
3. **Colócalo en la isla** en `Island.tsx` con `onTap={() => setView('mi-edificio')}` y, si procede, un camino hasta él.
4. **Dale panel.** Añade su caso en `ui/Panels.tsx` y, si debe estar en el menú inferior, en `TABS` (`ui/Hud.tsx`).

Niveles: `playa 0.32`, `inferior 1.0` (exploración, cueva, muelle), `central 2.3` (edificios), `superior 3.7` (faro).
Hay espacio reservado al este y al norte de la meseta central para nuevos edificios, y mar alrededor para islotes y puentes.

## Navegación

No hay escena estática: tocar un edificio (o su pestaña del menú) hace que la cámara vuele hasta él y se abra su panel;
"Volver a la isla" devuelve la vista general, donde se puede girar (un dedo) y acercar (dos dedos). Lugares actuales:
Casa (buzón y paga), Cofre en la cueva (ahorro), Banco (cuenta remunerada), Tienda en la barca mercante y Faro de Doña Tortuga (diario y ayuda).

## Reglas de la economía (Mundo 1)

- Paga: 30 euroLukys al mes de isla. Llega al buzón de la casa y se acumula sin tope si no entras. Lo recogido va al cofre de la cueva.
- Tarea diaria: cinco bellotas escondidas por la isla; al recogerlas, de 1 a 3 euroLukys.
- Tienda (la barca mercante del muelle): helado, cometa, balón, bici (180) y telescopio. Comprar la bici abre el Mundo 2.
- Inflación: cada cierre de año (día 12) se sortea entre 1,5 % y 4 % y sube los precios; los artículos de 10 o más euroLukys quedan en enteros (180 → 183).
- Banco: abre al cerrar el primer año; paga un 2,5 % anual repartido por meses. La retención del 19 % de Hacienda queda preparada (`taxesUnlocked`) para el Mundo 2.
- Todo el dinero se guarda en céntimos enteros; la simulación es idempotente: estar días sin entrar produce exactamente lo mismo que entrar cada día sin tocar nada.

## Siguientes fases

- **P2 · El Ayuntamiento**: bonos municipales a 1, 3 y 5 años, retención visible de Don Búho, primera tormenta, carnés de inversor.
- **P3 · El Mercado**: acciones de los cuatro comercios de inicio, Letras y Bonos del Reino, declaración anual, isla de la Liebre.
- **P4 · La Tormenta**: resto de comercios, corporativos, Obligaciones, Fondo Isla, crisis, plan a 20 años.
