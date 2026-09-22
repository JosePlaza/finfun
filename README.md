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

Con `npm run dev` (o añadiendo `?dev` a la URL en producción si `VITE_ALLOW_DEV=true`) aparece una barra que permite adelantar el reloj de la isla (+1, +3, +12 días) y borrar la partida. `?hour=22` fuerza la hora del día para ver la isla de noche (ventanas encendidas, haz del faro). Así se puede ver un año completo en un minuto: estaciones, inflación y diario. En desarrollo, `/avatares.html` muestra todos los avatares del catálogo en una rejilla (no se incluye en la build de producción).

### Supabase + Vercel (para jugar de verdad)

1. Crea un proyecto en Supabase y ejecuta en orden los SQL de `supabase/migrations/` (ver `supabase/README.md`).
2. Authentication → Providers → Email activado con **Confirm email desactivado**; Anonymous sign-ins desactivado.
3. Copia `.env.example` a `.env` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (las mismas en Vercel).

Con Supabase la cuenta es obligatoria (la registra el adulto responsable), el reloj del juego es la **hora del servidor** (adelantar la hora del móvil no adelanta la isla) y la partida se guarda en la cuenta. Paso a paso en `docs/despliegue.md`.

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
    avatars/  Avatares del jugador: catálogo (recetas) y el modelo low-poly animado que los monta
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
supabase/migrations/  SQL a ejecutar en Supabase (server_now, saves, profiles, ranking)
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
| 4 · La Tormenta | Molino, Posada, Granja, Cantera de Oro, Taller de juguetes, Observatorio, Casa del Fondo Isla |

## Navegación e interfaz

No hay menú inferior ni escena estática: por la isla se navega tocando los edificios. La cámara vuela hasta el lugar y se abre su
panel; la ✕ roja devuelve la vista general, donde se puede girar (un dedo) y acercar (dos dedos). Lugares actuales:
Casa (la paga flota en un bocadillo sobre el tejado; dentro, "Mis cosas"), Cofre en la cueva (ahorro), Banco (cuenta remunerada), Tienda (catálogo con tarjetas; la barca mercante del muelle trae la mercancía) y Faro de Doña Tortuga (diario y ayuda).

HUD (`src/ui/Hud.tsx`): arriba a la izquierda, el nombre de la isla y el año/mes; debajo, en vertical, los botones **Misiones** y **Eventos**
(este último con un bullet rojo animado y el número de cosas pendientes: paga en el buzón, bellotas, diario nuevo,
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
pueden recoger. En Eventos, la fila de las bellotas tiene **Pista** (la cámara vuela hasta una de las que faltan y un haz de luz dorado la
señala hasta que la recoges) y **Resolver** (enseña todas las que faltaban con haces rojos, pero la tarea del día se da por hecha sin premio;
`forfeitTask` en el motor).

Luz: la isla nunca se oscurece. A partir de las 19 h (o antes de las 8) el cielo se vuelve cálido, se encienden ventanas y farolas y el faro gira, pero todo sigue viéndose con claridad. El agua tiene olas low-poly animadas y hay barcas que se balancean en el muelle.

## Reglas de la economía

La operativa completa de los 21 edificios, nivel a nivel, está en [`docs/operativa.md`](docs/operativa.md). Resumen de lo que ya funciona:

- Paga: 30 euroLukys al mes de isla. Llega al buzón de la casa y se acumula sin tope si no entras. Lo recogido va al cofre de la cueva.
- Comida: cada mes se come una ración de la despensa (se empieza con 3). Cesta pequeña 5 (1 mes), cesta grande 9,50 (2 meses). Cesta domiciliada (por defecto): si la despensa se vacía, se compra sola con el dinero del cofre o del banco. Seis meses sin comer → rescate de Doña Tortuga: se pierde lo del cofre, la isla sigue.
- Huerto: construcción que paga el jugador (1000); da una cesta grande (2 meses) cada 3 meses para siempre. Ampliación (1500): 3 meses por trimestre, la despensa se llena sola → celebración de independencia financiera.
- Tarea diaria: cinco bellotas escondidas por la isla; al recoger las cinco, 2 euroLukys y una celebración.
- Tienda: comida (cestas), caprichos que se gastan (chuches, helado, cómic, cine) y cosas que se quedan en la isla (cometa, balón, patinete, tienda de campaña, columpio, bici 180, guitarra, cámara, telescopio, consola, canoa 900). Los objetos con modelo 3D aparecen alrededor de la casa, el telescopio junto al faro y la canoa en la playa. Comprar la bici abre el Nivel 2.
- Inflación: al cerrar cada año aparece la **ruleta** (casillas 1,5–4 %) y la gira el jugador; hasta entonces los precios no suben. El resultado lo fija la semilla (`inflationForYear`), así la partida sigue siendo reproducible. Los artículos de 10 o más euroLukys quedan en enteros (180 → 185).
- Banco: abre al cerrar el primer año (o antes, al llegar al Nivel 2); paga un 2,5 % anual repartido por meses.
- Nivel 2: el Ayuntamiento emite bonos (6 meses · 3 %, 12 meses · 4 %, 24 meses · 5 %; cupón trimestral, principal al vencer); Hacienda retiene el 19 % de intereses y cupones, en cada cobro o con una declaración anual según elija el jugador; la escuela tiene lecciones que se aprenden acertando una pregunta de cuatro opciones al final (si se falla, se repite al día siguiente).
- Nivel 3: Mercado de acciones (`src/sim/market.ts`): 100 acciones por negocio, precio mensual que sigue al beneficio trimestral (cuentas en marzo/junio/septiembre/diciembre), dividendos al cofre vía Hacienda, comisión 0,50 por operación, ganancia por precio medio al vender (19 % si hay ganancia; las pérdidas compensan). Panadería estable, Heladería estacional, Puerto con tormentas, Astillero sin dividendo. Propiedad visible en el cartel del edificio.
- Tiempo: el mes de isla cambia a medianoche (hora del dispositivo), no 24 h después de crear la isla: si creas la isla por la tarde, a la mañana siguiente ya es el mes siguiente.
- Recorrido inicial con Doña Tortuga (`src/ui/coachSteps.ts`, `Coach.tsx`; el fichero de pasos no se llama `coach.ts` porque en macOS chocaría con `Coach.tsx`): siete pasos que se hacen jugando (paga, cesta, cofre, bellota, misiones) con haz sobre el edificio y botón del HUD pulsando, cierre sobre la paciencia y los diez minutos al día; se guarda en la partida (`tutorialStep`), se puede saltar y repetir desde Ajustes.
- Perfil y avatar (`src/ui/Profile.tsx`, `src/scene/avatars/`): botón bajo el patrimonio; el panel muestra el avatar en 3D saludando, el nombre del jugador y una rejilla de 30 avatares genéricos (pirata, bruja, robot, cactus, tiburón…) diseñados con el mismo kit low-poly. El elegido se guarda en el perfil de la cuenta (migración `0003_avatar.sql`) y pasea por la isla como primer vecino.
- Sonido por Web Audio (GainNode): el volumen funciona también en iOS, que ignora `audio.volume`.
- Cuentas (con Supabase configurado): pantalla de acceso con el logo y el fondo de la isla (`bg.jpg` en vertical, `bg2.jpg` en apaisado), entrar por defecto y crear cuenta desde el enlace (correo + contraseña, sin confirmación; la registra el adulto responsable) con nombre de jugador único, inicio de sesión, partida guardada en la cuenta y "Cerrar sesión" en Ajustes. Sin Supabase, modo local sin cuentas. Ver `docs/despliegue.md` y `supabase/`.
- Ajustes (botón ⚙️ bajo Eventos): sección "Compartir Finfun" con el QR de la dirección pública (`SHARE_URL` en `src/sim/config.ts`), copiar al portapapeles y enviar; música de fondo (`public/audio/ambient.mp3`, en bucle; arranca con el primer toque por la política de autoplay de los navegadores) y efectos de sonido (`public/audio/events.mp3` cuando aparece un evento nuevo en Eventos), cada uno con interruptor y volumen, guardados en el dispositivo.
- La isla de la Liebre (desde el Nivel 2): barca de vela en la playa del sur que cruza el mar hasta el islote de la vecina, simulada mes a mes con reglas fijas (gasta todo, persigue modas, vende en La Tormenta); pizarra "Tú y la Liebre" con la gráfica de patrimonio de ambos, préstamo de 5 → 6 eL con retraso ocasional y misiones N2–N4.
- Nivel 4: seis negocios más con carácter propio (Molino refugio, Posada turística, Granja con cosecha y plagas, Cantera de Oro como activo refugio (lingotes sin dividendo que siguen la inflación y suben un 20 % en La Tormenta), Taller de modas, Observatorio con descubrimientos ×3), la Casa del Fondo Isla (fondo de acumulación con participaciones, 0,3 %/año) y La Tormenta: única por partida, seis meses después de abrir el nivel, −30 % general (−40 % la Posada), con pantalla de noticia y misión de aguantar tres meses sin vender.
- Todo el dinero se guarda en céntimos enteros; la simulación es idempotente: estar días sin entrar produce exactamente lo mismo que entrar cada día sin tocar nada. Los campos nuevos del estado tienen valores por defecto en `clone()` para que las partidas guardadas antiguas sigan funcionando.

## Siguientes fases

- **P2 · El Ayuntamiento**: bonos municipales a 1, 3 y 5 años, retención visible de Don Búho, primera tormenta, carnés de inversor.
- **P3 · El Mercado**: acciones de los cuatro comercios de inicio, Letras y Bonos del Reino, declaración anual, isla de la Liebre.
- **P4 · La Tormenta**: resto de comercios, corporativos, Obligaciones, Fondo Isla, crisis, plan a 20 años.
