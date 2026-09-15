# Finfun

Juego web low poly para que los niños aprendan a ahorrar e invertir. **Un día real es un mes de isla.**

Estado: **P1 · La Isla** (Nivel 1). Mundo 3D modular sobre un terreno continuo de varios niveles, con los 20 edificios del juego en el mapa (los de niveles futuros, en obras); paga diaria, tarea de las bellotas, inflación, banco (cuenta remunerada), estaciones y el diario de Doña Tortuga. El concepto completo está en `docs/concepto.html`.

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
    calendar.ts 1 día = 1 mes; estaciones; nombres de mes (el año de isla va de enero a diciembre; la estación sigue al mes real)
    engine.ts   advanceTo(estado, ahora) recompone todos los meses pendientes; acciones del jugador
    diary.ts    Texto del diario de Doña Tortuga (inflación explicada, "¿y si…?")
  store/      Estado de la app (zustand + persist). Reloj, guardado local/remoto, lugar activo (view)
  scene/      EL MUNDO 3D (react-three-fiber)
    palette.ts     Paleta única del nivel (C), paletas por estación y escala (1 unidad ≈ 1 m)
    kit/Parts.tsx  Kit de piezas: Wall, GableRoof, HipRoof, ConeRoof, Gable, Door, Window, Chimney, Fence,
                   Column, Steps, Lantern, Crate, Barrel, Sack, Sign, FlagPole, CoinEmblem, Label, TapZone…
    kit/Nature.tsx Palm, Bush, Flowers, GrassTuft, Rock, RockCluster, Acorn
    kit/Objects.tsx Objetos comprados (cometa, balón, bici, telescopio)
    Landscape.tsx  Ground (malla del terreno), CoastRocks, Path, Water
    buildings/     Un archivo por lugar, montado SOLO con piezas del kit: House, Bank, Lighthouse, Cave (+Chest), Pier (+MerchantBoat)
    registry.ts    Niveles de terreno, lugares (posición, giro, encuadre de cámara) y cálculo de poses
    Island.tsx     Composición de la isla + CameraRig (la cámara vuela al lugar activo)
  ui/         Interfaz móvil: bautizo, barra superior, navegación inferior (= lugares), paneles por lugar
  lib/        Cliente Supabase opcional (hora de servidor, guardado)
supabase/schema.sql   Función server_now() y tabla saves con RLS
docs/concepto.html    Documento de concepto del juego
```

## El mundo es modular: cómo añadir un edificio

1. **Regístralo** en `BUILDINGS` (`src/scene/registry.ts`): id, nombre, nivel en que se desbloquea, qué enseña, posición (x, z),
   giro (π/4 mira a la cámara), radio de explanada y, si tendrá panel propio, su `view` y encuadre de cámara.
   El terreno reserva automáticamente una explanada plana bajo él y los caminos (`ROADS` en `Island.tsx`) lo unen al resto.
2. **Dale receta** en `src/scene/buildings/Generic.tsx` (un `case` más) usando solo piezas del kit: muros, tejados, puertas,
   ventanas, farolas, grúas, cúpulas, aspas… Si necesitas una pieza nueva, añádela al kit para que la hereden los demás.
   Los edificios "héroe" con lógica propia (casa, banco, tienda, cueva, faro) tienen su archivo.
3. Hasta que el jugador llega a su nivel, el edificio aparece como **solar en obras** con un cartel "Nivel N · nombre".
4. Si debe tener panel, añade su caso en `ui/Panels.tsx` (y su pestaña en `TABS` de `ui/Hud.tsx` si va en el menú).

### Terreno

`src/scene/terrain.ts` define la isla como un campo de alturas continuo: una meseta que baja suavemente al mar, colinas y
hondonadas (`HILLS`) que crean varios niveles, y una explanada aplanada bajo cada edificio con transición suave (sin escalones).
Cada edificio se asienta sobre un **zócalo** (`Plinth` en `kit/Parts.tsx`): un disco de arena a ras de la explanada y un faldón de roca hundido en el terreno, de modo que nunca queda nada en el aire aunque la ladera caiga junto a él. Las explanadas son planas hasta 1,25 veces la huella del edificio y entre huellas hay al menos ~3 unidades libres (isla de 56 × 46 unidades). La malla (`Ground` en `Landscape.tsx`) se colorea por altura y pendiente: arena, hierba, roca en las laderas. Caminos, vegetación,
rocas de costa y bellotas se apoyan sobre esa función, así que mover una colina lo mueve todo.

### Edificios y nivel en que se abren

| Nivel | Edificios |
| --- | --- |
| 1 · La Isla | Casa, Banco, Tienda, Cueva del cofre, Faro (Doña Tortuga) |
| 2 · El Ayuntamiento | Ayuntamiento (bonos), Hacienda (Don Búho), Escuela (carnés) |
| 3 · El Mercado | Mercado de acciones, Panadería, Heladería, Puerto pesquero, Astillero |
| 4 · La Tormenta | Molino, Posada, Granja, Cantera, Taller de juguetes, Observatorio, Casa del Fondo Isla |

## Navegación e interfaz

No hay menú inferior ni escena estática: por la isla se navega tocando los edificios. La cámara vuela hasta el lugar y se abre su
panel; la ✕ roja devuelve la vista general, donde se puede girar (un dedo) y acercar (dos dedos). Lugares actuales:
Casa (la paga flota en un bocadillo sobre el tejado; dentro, "Mis cosas"), Cofre en la cueva (ahorro), Banco (cuenta remunerada), Tienda (catálogo con tarjetas; la barca mercante del muelle trae la mercancía) y Faro de Doña Tortuga (diario y ayuda).

HUD (`src/ui/Hud.tsx`): arriba a la izquierda, el nombre de la isla y el año/mes; debajo, en vertical, los botones **Misiones** y **Eventos**
(este último con un bullet rojo animado y el número de cosas pendientes: paga en el buzón, bellotas, banco recién abierto, diario nuevo,
misión completada, nivel nuevo — calculado en `src/ui/events.ts`). Arriba a la derecha, los **seis corazones** de salud (con comida en la despensa están todos; cada mes sin comer se apaga uno y los que quedan laten; al pulsarlos se va a la tienda) y el **patrimonio**: al pulsarlo se desglosa dónde está
cada parte (cofre, banco, bonos, acciones, fondo; los que aún no existen aparecen bloqueados con el nivel en que abren).

El kit visual de la interfaz vive en `src/index.css` (clases `g-*`): botones con degradado, contorno blanco de 4 px y sombra "profunda" de 7 px
que se hunde al pulsar; paneles crema con doble borde y cinta de título; cierre circular rojo medio fuera de la esquina; barras con carril
hundido y relleno a rayas. Tipografías: Baloo 2 (títulos, mayúsculas) y Nunito (texto). Paleta: verde, azul, naranja, morado, rojo, crema, cielo y tinta.

Vida en el mapa (`src/scene/Ambient.tsx`): nubes a la deriva por el norte de la isla (proyectan sombra en el mar), bandadas de pájaros en V,
sombras de bancos de peces bajo el agua, y vecinos. Los vecinos son personajes low-poly de proporciones humanas (`LOOKS`: piel, pelo, ropa y
sombrero distintos) con un repertorio de acciones (`Action`: andar, mirar, saludar, trabajar, cargar, sentarse). Hay dos paseantes por nivel
abierto más la Liebre; cada uno recorre una ruta propia por los edificios abiertos y en cada parada hace lo que toca allí (`STOP_ACTION` en
`Island.tsx`). Además hay gente quieta trabajando (`Doer`): el pescador del muelle, la tendera barriendo, el hortelano con la azada cuando hay
huerto y el banquero saludando cuando abre el banco. Todo es determinista a partir de la semilla de la isla y muy barato de dibujar.

Bellotas (`src/scene/acorns.ts`): sus sitios se calculan sobre el terreno (tierra firme, poca pendiente, fuera de las explanadas) y flotan por
encima de la hierba; el filtro de eventos del `Canvas` da prioridad a la bellota sobre cualquier zona de toque de edificio, así que siempre se
pueden recoger.

Luz: la isla nunca se oscurece. A partir de las 19 h (o antes de las 8) el cielo se vuelve cálido, se encienden ventanas y farolas y el faro gira, pero todo sigue viéndose con claridad. El agua tiene olas low-poly animadas y hay barcas que se balancean en el muelle.

## Reglas de la economía

La operativa completa de los 21 edificios, nivel a nivel, está en [`docs/operativa.md`](docs/operativa.md). Resumen de lo que ya funciona:

- Paga: 30 euroLukys al mes de isla. Llega al buzón de la casa y se acumula sin tope si no entras. Lo recogido va al cofre de la cueva.
- Comida: cada mes se come una ración de la despensa (se empieza con 3). Cesta pequeña 5 (1 mes), cesta grande 9,50 (2 meses). Seis meses sin comer terminan la aventura y hay que empezar una isla nueva.
- Huerto: construcción que paga el jugador (1000); da una cesta grande cada 3 meses para siempre.
- Tarea diaria: cinco bellotas escondidas por la isla; al recogerlas, de 1 a 3 euroLukys y una celebración.
- Tienda: comida y deseos (helado, cometa, balón, bici 180, telescopio). Comprar la bici abre el Nivel 2.
- Inflación: al cerrar cada año aparece la **ruleta** (casillas 1,5–4 %) y la gira el jugador; hasta entonces los precios no suben. El resultado lo fija la semilla (`inflationForYear`), así la partida sigue siendo reproducible. Los artículos de 10 o más euroLukys quedan en enteros (180 → 185).
- Banco: abre al cerrar el primer año; paga un 2,5 % anual repartido por meses.
- Nivel 2: el Ayuntamiento emite bonos (6 meses · 3 %, 12 meses · 4 %, 24 meses · 5 %; cupón trimestral, principal al vencer); Hacienda retiene el 19 % de intereses y cupones, en cada cobro o con una declaración anual según elija el jugador; la escuela tiene seis lecciones.
- Todo el dinero se guarda en céntimos enteros; la simulación es idempotente: estar días sin entrar produce exactamente lo mismo que entrar cada día sin tocar nada. Los campos nuevos del estado tienen valores por defecto en `clone()` para que las partidas guardadas antiguas sigan funcionando.

## Siguientes fases

- **P2 · El Ayuntamiento**: bonos municipales a 1, 3 y 5 años, retención visible de Don Búho, primera tormenta, carnés de inversor.
- **P3 · El Mercado**: acciones de los cuatro comercios de inicio, Letras y Bonos del Reino, declaración anual, isla de la Liebre.
- **P4 · La Tormenta**: resto de comercios, corporativos, Obligaciones, Fondo Isla, crisis, plan a 20 años.
