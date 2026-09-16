# Finfun · Operativa de cada edificio

Qué hace el jugador en cada lugar de la isla, qué enseña y con qué números. Los niveles se abren completando las misiones
del anterior (`src/sim/missions.ts`). Las cifras están en euroLukys (eL); un día real es un mes de isla.

Estado de implementación: **[hecho]** funciona en el juego · **[diseño]** definido aquí, pendiente de código.

---

## Reglas transversales

**Comida [hecho].** Cada mes se come una ración de la despensa. Se empieza con 3 meses. En la tienda: cesta pequeña
5 eL (1 mes) y cesta grande 9,50 eL (2 meses, 4,75 por mes). Sin comida empieza a contar el hambre; a los **6 meses sin
comer la aventura termina** y hay que empezar una isla nueva (se pierde todo). Avisos en Eventos desde que queda 1 mes.

**Ruleta de la inflación [hecho].** Al cerrar cada año no suben los precios solos: aparece la ruleta con las casillas
1,5 · 2,0 · 2,5 · 3,0 · 3,5 · 4,0 % y la gira el jugador. El resultado ya está decidido por la semilla de la isla
(la partida es reproducible), pero la sensación es de sorteo. Al parar se ven el precio viejo y el nuevo de la bici y
Doña Tortuga escribe el diario. Si no se gira, los precios no suben y queda un aviso en Eventos.

**Hacienda [hecho, Nivel 2].** El 19 % de los rendimientos (intereses del banco, cupones, en el futuro dividendos y
plusvalías). El jugador elige el modo en Hacienda.

**Patrimonio [hecho].** Cofre + banco + bonos (+ acciones y fondo cuando existan). Lo gastado en cosas no es patrimonio.

---

## Nivel 1 · La Isla (sin riesgo)

| Edificio | Operativa | Enseña |
| --- | --- | --- |
| **Casa** [hecho] | Recoger la paga (30 eL/mes, se acumula). Ver la despensa y "Mis cosas". | La paga es el ingreso; primero lo necesario. |
| **Cueva del cofre** [hecho] | Ahorro sin interés. Movimientos. | Guardar es seguro pero no crece; la inflación lo erosiona. |
| **Banco de la Isla** [hecho] | Abre al cerrar el año 1, o antes si se llega al Nivel 2. Cuenta remunerada 2,5 % anual pagado por meses. Meter/sacar sin límite. | Interés simple → compuesto. Liquidez. |
| **Tienda** [hecho] | Comida (cestas) y deseos (helado 2, cometa 25, balón 40, bici 180, telescopio 450). Precios con inflación y precio viejo tachado. IVA informativo. | Necesidad vs deseo; inflación en los precios. |
| **Faro (Doña Tortuga)** [hecho] | Diario de cierre de año con el "¿y si…?" contrafactual. Ayuda. | Coste de oportunidad. |
| **Huerto** [hecho] | Construcción que paga el jugador: **1000 eL**. Da una cesta grande (2 meses de comida) cada 3 meses, para siempre. **Ampliación (1500 eL)**: invernadero, colmenas y otra vaca; pasa a 3 meses de comida por trimestre, justo lo que se come: la despensa se llena sola y el juego lo celebra como **independencia financiera**. | Un activo real que produce: rentabilidad ≈ 3,8 %/año en comida, y sube con la inflación. Cuando lo que producen tus inversiones cubre lo que necesitas, eres libre. |

Misiones N1: primera paga · llenar la despensa · bellotas 3 días · comprar algo · 100 en el cofre · comida para 3 meses · **la bici abre el Nivel 2**. Todas se pueden hacer desde el primer día: el banco no abre hasta cerrar el año, así que su misión va en el Nivel 2.

---

## Nivel 2 · El Ayuntamiento (renta fija y fiscalidad)

| Edificio | Operativa | Enseña |
| --- | --- | --- |
| **Ayuntamiento** [hecho] | Emite tres bonos para obras concretas: **Bono Farolas** 6 meses · 3 % · **Bono Puente** 12 meses · 4 % · **Bono Escuela** 24 meses · 5 %. Mínimo 10 eL, de 10 en 10. Cupón **trimestral** al cofre, principal devuelto al vencer. No se puede vender antes (eso llega con el Mercado). | Prestar ≠ regalar; plazo ↔ cupón; renta fija = saber lo que vas a cobrar. |
| **Hacienda (Don Búho)** [hecho] | Elegir cómo pagar el 19 %: **en cada cobro** (retención instantánea) o **una vez al año** (todo bruto, declaración al cerrar el año; si no hay dinero queda deuda que se cobra en cuanto lo hay). Historial de declaraciones. | Los impuestos existen y financian lo común; diferir el pago deja más dinero componiendo. |
| **Escuela** [hecho] | Seis lecciones cortas (inflación, interés compuesto, bono, impuestos, riesgo, comida). Leer una da un carné. | Vocabulario y conceptos, con calma. |

Misiones N2: 50 en el banco · primer bono · cobrar un cupón · elegir en Hacienda · leer 3 lecciones · 200 eL prestados a la vez · 600 de patrimonio → **Nivel 3**.

Diseño pendiente N2: **visitar la isla de la Liebre** — ver la sección al final.

---

## Nivel 3 · El Mercado (renta variable) [hecho]

**Mercado de acciones** (`src/sim/market.ts`). Cada negocio tiene **100 acciones**; tener 10 es ser dueño del 10 % y se ve
en el cartel del edificio ("Tuyo: 10 %"). El precio cambia **una vez al mes** y sigue al beneficio: cada trimestre (marzo,
junio, septiembre, diciembre) el negocio publica sus **cuentas** (ventas, beneficio y dividendo por acción) y el precio se
acerca al valor que sale de esos beneficios, con un ruido mensual propio de cada negocio. Movimiento máximo de un mes
normal ±8 %; la tormenta del Puerto −15 %. Las compras del jugador no mueven el precio. Todo determinista por semilla.
Comisión fija **0,50 eL** por operación. Los dividendos llegan al cofre el mes de cuentas y pasan por Hacienda. Al vender,
la ganancia se calcula sobre el **precio medio de compra**: si es positiva tributa el 19 % (según el modo elegido); si es
pérdida, resta de las ganancias del año. La Liebre no opera: aparece solo en las noticias del diario.

Panel del Mercado con pestañas **Negocios** (precio, variación del mes, rentabilidad por dividendo, línea de 12 meses,
días hasta las cuentas) y **Mi cartera** (valor a precio de hoy, ganancia sin vender, precio medio por negocio). Cada
negocio abre su **ficha** (también tocando el edificio): cuentas del último trimestre, tus acciones y comprar/vender con
cantidades rápidas. Eventos avisa de dividendos y tormentas; el diario resume dividendos y valor de la cartera.

| Negocio | Precio inicial | Dividendo | Comportamiento | Enseña |
| --- | --- | --- | --- | --- |
| **Panadería** | 20 eL | 1 % trimestral (4 %/año), siempre | Volatilidad baja (±3 %/mes), crecimiento 2 %/año | El negocio aburrido y fiable. |
| **Heladería** | 15 eL | Solo tras el verano: 4 % en octubre | Sube en primavera-verano, baja en otoño-invierno (±8 %) | Estacionalidad: los beneficios no son iguales todo el año. |
| **Puerto pesquero** | 25 eL | 2 % trimestral (8 %/año)… | Cada trimestre 1 de 6 de **tormenta**: dividendo 0 y precio −15 % | Mucha renta, mucho susto. |
| **Astillero** | 30 eL | Ninguno | Crecimiento 8 %/año con ±6 %/mes; reinvierte todo | Crecer sin repartir: la recompensa llega al vender. |

Misiones N3: construir el huerto · comprar acciones de dos negocios · cobrar un dividendo · aguantar una tormenta sin vender · leer todas las lecciones → **Nivel 4**.

---

## Nivel 4 · La Tormenta (diversificación y crisis) [hecho]

Se abren seis negocios más (todos en `src/sim/market.ts`, con el mismo motor) y la **Casa del Fondo Isla**. Seis meses después
de abrir el nivel llega **La Tormenta**, única por partida: un mes en que todos los precios caen un 30 % (la Posada un 40 %),
con pantalla de noticia urgente y consejo de Doña Tortuga. Los negocios siguen ganando (salvo la Posada ese trimestre), los
dividendos siguen llegando y los precios vuelven solos hacia su valor justo en 6–9 meses. Aguantar tres meses sin vender
nada (acciones ni fondo) cumple la misión. Decisiones: Cantera = oro, activo refugio (sustituye al ciclo de obras),
Fondo de acumulación, Tormenta única, descubrimiento del Observatorio permanente, Hacienda al 19 % plano (sin tramos).

| Negocio | Dividendo | Comportamiento | Enseña |
| --- | --- | --- | --- |
| **Molino** (energía) | Trimestral siempre, ≈5 %/año a 40 eL | ±2 %/mes, crecimiento 0,5 %/año | El refugio: aburrido a propósito. |
| **Posada del Puerto** | Un solo dividendo, grande, en septiembre | Temporada 0,5·1,0·2,0·0,5; en La Tormenta cae un 40 % y ese trimestre casi no gana | Cíclico y estacional a la vez. |
| **Granja** | Un dividendo anual en diciembre (cosecha) | Otoño 1,6×; un otoño de cada cuatro plaga/sequía: beneficio 0, sin dividendo, −20 % | Riesgo natural, un solo golpe al año. |
| **Cantera de Oro** | Ninguno | Se compran **lingotes** (100), no acciones. Sin cuentas: el oro no gana ni reparte. Su precio sube al ritmo de la inflación media (≈3 %/año, ±4 %/mes) y el mes de La Tormenta **sube un 20 %** mientras todo lo demás cae; esa prima de miedo se deshace en 9 meses. Noticias al subir y al volver a la calma. | El activo refugio: protege en la tormenta, no hace rico. Un poco amortigua la cartera; mucho es una cartera que no crece. |
| **Taller de juguetes** | Trimestral los años de moda | Cada año se sortea de moda (×1,6) u olvidado (×0,6); ±8 %/mes | Modas: perseguirlas llega tarde. |
| **Observatorio** | Ninguno | Beneficio mínimo; cada año 1/8 de **descubrimiento**: ×3 para siempre y salto del precio | Alto riesgo: un trocito pequeño de la cartera. |
| **Casa del Fondo Isla** | Acumulación: los dividendos se reinvierten dentro | Participaciones (sin tope) a partir de 10 eL; sigue la media de los 9 negocios (sin el oro); comisión 0,3 %/año; sin comisión por operación; tributa solo al sacar | Diversificar sin pensar; la cesta de huevos. |

Escuela N4: cuatro lecciones nuevas (la cesta de huevos, modas y refugios, qué es un fondo, cuando todo cae) más la de
independencia financiera.

Misiones N4: acciones de 5 negocios distintos · 100 en el Fondo Isla · aguantar La Tormenta sin vender · ampliar el huerto · leer
todas las lecciones · 3000 de patrimonio → **Isla completa** (modo libre con récords; pendiente de diseño, junto con la
visita a la isla de la Liebre).

---

## La isla de la Liebre (visita) [hecho]

La Liebre es la vecina desde el primer día: recibe **la misma paga**, vive **la misma inflación** y ve **el mismo mercado**
que el jugador, pero decide distinto. Su isla es el "¿y si…?" hecho lugar: el grupo de control que se puede visitar.

**Cómo se llega.** Desde el Nivel 2 aparece en la playa del sur la barca de vela de la Liebre con un cartel "Visitar su
isla". Al tocarla la cámara sigue a la barca por el mar (3,6 s) hasta un islote a lo lejos (mismo mar y misma luz; terreno
del mismo generador, encogido, con la hierba un punto más viva). Al llegar se abre la pizarra; el cartel del HUD y la
barca ofrecen "Volver a casa". La visita no consume nada ni cambia el tiempo: es mirar (y, si toca, prestar).

**Qué hace la Liebre (simulación pura, `src/sim/liebre.ts`).** Su historia se calcula mes a mes a partir de la semilla, del
mes de La Tormenta y de los meses en que el jugador abrió cada nivel (`worldOpened`, guardado en la partida), sin estado
propio (`liebreAt(ctx, month)`), como el mercado. Reglas fijas y legibles para el niño:

| Nivel del jugador | Regla de la Liebre | Lo que se ve en su isla |
| --- | --- | --- |
| 1–2 | Cada mes compra un capricho de cada (cine, cómic, helado, chuches) y, con lo que le queda, **la cosa más cara que pueda pagar** y no tenga; compra la cesta pequeña solo cuando la despensa está vacía y dos de cada tres veces, así que uno de cada tres meses pasa hambre (pierde hasta 3 corazones, nunca muere: Doña Tortuga le lleva sopa). No abre cuenta en el banco ni compra bonos. | Casa con sus cosas alrededor (cometa, balón, patinete, bici…) y envoltorios por el suelo, cueva con el cofre casi vacío, solar del huerto siempre "Se construye". |
| 3 | Descubre el Mercado: la mitad de lo que le queda va al negocio que **más subió el mes pasado** (persigue la moda) y vende todo lo que **baje más de un 10 %** en un mes. Comisión en cada operación; casi siempre vende perdiendo. | Pestaña "Qué hace ella": sus últimas 12 operaciones con precio y ganancia/pérdida, comisiones y pérdidas acumuladas. |
| 4 | En **La Tormenta vende todo** el primer día (y con ese dinero se compra algo). Después, cuando los precios ya han vuelto, compra otra vez. | Operación "¡Vendió asustada!" en su lista; Doña Tortuga lo explica en la pizarra. |

**La pizarra "Tú y la Liebre".** En el centro de su isla; al tocarla (o cualquier cosa de la isla) se abre el panel con dos
columnas (tu patrimonio y cosas compradas · el suyo, sus cosas y sus caprichos), la frase "los dos habéis cobrado lo mismo:
{paga × meses}", la gráfica de patrimonio mes a mes desde el primer día (la tuya sale de `netWorthHistory`, que la partida
guarda al cerrar cada mes; la suya, de la simulación) y una frase de Doña Tortuga que cambia con el nivel. Nunca se burla
de la Liebre: explica qué decisión marcó la diferencia.

**El préstamo de la Liebre.** Los meses que pasa hambre (o tiene la despensa vacía), en la pizarra pide **5 eL** y promete
devolver **6** el mes que viene. Una de cada cinco veces se retrasa dos meses (aviso en Eventos). El eL de interés pasa
por Hacienda como cualquier rendimiento. Es la única deuda del juego, la contraria del bono: prestas a alguien menos
fiable que el Ayuntamiento y por eso cobras más (20 % en un mes), pero puede fallarte. Solo un préstamo vivo a la vez.

**Misiones.** N2 "Visita a la Liebre" · N3 "Ten el doble de patrimonio que la Liebre" · N4 "Vuelve a ver a la Liebre tras
La Tormenta" (visita con fecha posterior a La Tormenta).

**Técnica.** `src/sim/liebre.ts` (`liebreAt`, `worldAt`, `liebreLesson`, con tests) · motor: `worldOpened`,
`netWorthHistory`, `visitLiebre`, `lendToLiebre`, `liebreCanBorrow`, devolución en `processMonth` · store: `trip`
('home' | 'going' | 'there' | 'returning'), `travelToLiebre` / `returnHome` · escena `src/scene/LiebreIsland.tsx`
(islote en `LIEBRE_OFFSET`, `LiebreBoat` con la curva del viaje, `liebreIslandPose`; la cámara sigue a la barca desde
`CameraRig`) · panel `LiebrePanel` (vista `liebre`).

---

## Cómo se añade un edificio nuevo (resumen técnico)

1. `src/scene/registry.ts`: entrada en `BUILDINGS` con `id`, `world`, `teaches`, `about`, posición, `footprint`, `view`
   si tiene panel, `costCents` si lo paga el jugador.
2. `src/scene/buildings/Generic.tsx`: su receta 3D con el kit (`case 'id'`).
3. Si tiene panel: vista en `View` (`src/store/game.ts`), acciones puras en `src/sim/engine.ts` con tests, panel en
   `src/ui/Panels.tsx` y misiones en `src/sim/missions.ts`.
