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
| **Banco de la Isla** [hecho] | Abre al cerrar el año 1. Cuenta remunerada 2,5 % anual pagado por meses. Meter/sacar sin límite. | Interés simple → compuesto. Liquidez. |
| **Tienda** [hecho] | Comida (cestas) y deseos (helado 2, cometa 25, balón 40, bici 180, telescopio 450). Precios con inflación y precio viejo tachado. IVA informativo. | Necesidad vs deseo; inflación en los precios. |
| **Faro (Doña Tortuga)** [hecho] | Diario de cierre de año con el "¿y si…?" contrafactual. Ayuda. | Coste de oportunidad. |
| **Huerto** [hecho] | Construcción que paga el jugador: **1000 eL**. Da una cesta grande (2 meses de comida) cada 3 meses, para siempre. | Un activo real que produce: rentabilidad ≈ 3,8 %/año en comida, y sube con la inflación. |

Misiones N1: primera paga · llenar la despensa · bellotas 3 días · comprar algo · 100 en el cofre · comida para 3 meses · **la bici abre el Nivel 2**. Todas se pueden hacer desde el primer día: el banco no abre hasta cerrar el año, así que su misión va en el Nivel 2.

---

## Nivel 2 · El Ayuntamiento (renta fija y fiscalidad)

| Edificio | Operativa | Enseña |
| --- | --- | --- |
| **Ayuntamiento** [hecho] | Emite tres bonos para obras concretas: **Bono Farolas** 6 meses · 3 % · **Bono Puente** 12 meses · 4 % · **Bono Escuela** 24 meses · 5 %. Mínimo 10 eL, de 10 en 10. Cupón **trimestral** al cofre, principal devuelto al vencer. No se puede vender antes (eso llega con el Mercado). | Prestar ≠ regalar; plazo ↔ cupón; renta fija = saber lo que vas a cobrar. |
| **Hacienda (Don Búho)** [hecho] | Elegir cómo pagar el 19 %: **en cada cobro** (retención instantánea) o **una vez al año** (todo bruto, declaración al cerrar el año; si no hay dinero queda deuda que se cobra en cuanto lo hay). Historial de declaraciones. | Los impuestos existen y financian lo común; diferir el pago deja más dinero componiendo. |
| **Escuela** [hecho] | Seis lecciones cortas (inflación, interés compuesto, bono, impuestos, riesgo, comida). Leer una da un carné. | Vocabulario y conceptos, con calma. |

Misiones N2: 50 en el banco · primer bono · cobrar un cupón · elegir en Hacienda · leer 3 lecciones · 200 eL prestados a la vez · 600 de patrimonio → **Nivel 3**.

Diseño pendiente N2: **visitar la isla de la Liebre** (vecina desde el inicio), que gasta todo cada mes: su patrimonio se ve al lado del tuyo en el diario.

---

## Nivel 3 · El Mercado (renta variable) [diseño]

**Mercado de acciones.** Un panel único para comprar y vender acciones de los negocios abiertos. Cada negocio tiene
un precio por acción que cambia **una vez al mes** (determinista por semilla; tendencia + estacionalidad + ruido propio
de cada negocio). Comisión fija 0,50 eL por operación. Los dividendos llegan al cofre cada trimestre según el negocio.
Plusvalías al vender: 19 % vía Hacienda con el modo elegido; las pérdidas se compensan con ganancias del año (FIFO).

Cada negocio es un edificio visitable con la misma ficha: **sus cuentas** (ventas del trimestre, beneficio, dividendo por
acción), su gráfico de precio de los últimos 12 meses y el botón "Comprar acciones" que lleva al Mercado.

| Negocio | Precio inicial | Dividendo | Comportamiento | Enseña |
| --- | --- | --- | --- | --- |
| **Panadería** | 20 eL | 1 % trimestral (4 %/año), siempre | Volatilidad baja (±3 %/mes), crecimiento 2 %/año | El negocio aburrido y fiable. |
| **Heladería** | 15 eL | Solo tras el verano: 4 % en octubre | Sube en primavera-verano, baja en otoño-invierno (±8 %) | Estacionalidad: los beneficios no son iguales todo el año. |
| **Puerto pesquero** | 25 eL | 2 % trimestral (8 %/año)… | Cada trimestre 1 de 6 de **tormenta**: dividendo 0 y precio −15 % | Mucha renta, mucho susto. |
| **Astillero** | 30 eL | Ninguno | Crecimiento 8 %/año con ±6 %/mes; reinvierte todo | Crecer sin repartir: la recompensa llega al vender. |

Misiones N3: construir el huerto · comprar acciones de dos negocios · cobrar un dividendo · aguantar una tormenta sin vender · leer todas las lecciones → **Nivel 4**.

---

## Nivel 4 · La Tormenta (diversificación y crisis) [diseño]

Se abren siete negocios más y, a mitad de nivel, **La Tormenta**: un mes en que todos los precios caen un 30 % y el
diario enseña a no vender con miedo (los que aguantan recuperan en 6–9 meses; los dividendos siguen llegando).

| Negocio | Dividendo | Comportamiento | Enseña |
| --- | --- | --- | --- |
| **Molino** (energía regulada) | 1,25 % trimestral, muy estable | ±2 %/mes, casi sin crecimiento | El refugio: poco pero seguro. |
| **Posada del Puerto** | 3 % en septiembre | Llena en verano, medio vacía el resto; sensible a la Tormenta | Cíclico y estacional a la vez. |
| **Granja** | 3 % en noviembre si la cosecha fue buena | Cada otoño 1 de 4 de plaga/sequía: dividendo 0 y −20 % | Riesgo natural, un solo evento al año. |
| **Cantera** | 1,5 % trimestral cuando hay obras | Sube cuando el jugador construye o el Ayuntamiento emite bonos; baja si no | Cíclico ligado a la actividad de la isla. |
| **Taller de juguetes** | 2 % trimestral los años de moda | Alterna años "de moda" (+40 %) y "olvidado" (−25 %) | Modas: lo que arrasa hoy puede no arrasar mañana. |
| **Observatorio** | Ninguno | La mayoría de los años ±0 %; 1 de 8 años **descubrimiento**: ×3 | Alto riesgo: crece muchísimo o nada. |
| **Casa del Fondo Isla** | Reparte lo que reparten todos, neto | Cesta con todos los negocios a partes iguales; comisión 0,3 %/año; **traspaso** entre fondos sin pasar por Hacienda | Diversificar; el índice gana a casi todos a largo plazo. |

Hacienda en N4: tramos del ahorro (19 % hasta 6000 eL, 21 % hasta 50 000), compensación de pérdidas, y la declaración
anual muestra cada apartado con palabras de niño.

Misiones N4: tener acciones de 5 negocios distintos · comprar Fondo Isla · pasar La Tormenta sin vender nada · 3000 de patrimonio · patrimonio mayor que el de la Liebre → **Isla completa** (modo libre con nuevos años y récords).

---

## Cómo se añade un edificio nuevo (resumen técnico)

1. `src/scene/registry.ts`: entrada en `BUILDINGS` con `id`, `world`, `teaches`, `about`, posición, `footprint`, `view`
   si tiene panel, `costCents` si lo paga el jugador.
2. `src/scene/buildings/Generic.tsx`: su receta 3D con el kit (`case 'id'`).
3. Si tiene panel: vista en `View` (`src/store/game.ts`), acciones puras en `src/sim/engine.ts` con tests, panel en
   `src/ui/Panels.tsx` y misiones en `src/sim/missions.ts`.
