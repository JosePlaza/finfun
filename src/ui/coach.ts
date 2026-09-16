/**
 * RECORRIDO INICIAL con Doña Tortuga. Siete pasos que se hacen jugando: cada uno señala un sitio de la isla
 * y se cumple cuando el jugador hace la acción (recoger la paga, comprar la cesta…). El paso actual se guarda
 * en la partida (`tutorialStep`), así continúa en otro dispositivo y no vuelve a salir.
 */
import type { BuildingId } from '../scene/registry'
import type { GameState } from '../sim'
import type { View } from '../store/game'

export interface CoachStep {
  id: string
  /** Edificio que se ilumina (y al que vuela la cámara). */
  target: BuildingId | null
  /** Botón del HUD que pulsa. */
  hud?: 'misiones' | 'eventos'
  title: string
  text: string
  /** Lo que tiene que hacer el jugador, en una frase corta (sale también en el aviso cuando hay un panel abierto). */
  action?: string
  /** Sin acción: el paso se pasa con el botón. */
  next?: string
  /** ¿Está hecho? Recibe la partida y lo que ve la interfaz. */
  done?: (g: GameState, ui: { view: View; acornsFound: number; visited: Set<View> }) => boolean
}

export const COACH_STEPS: CoachStep[] = [
  {
    id: 'llegada',
    target: null,
    title: '¡Bienvenido a tu isla!',
    text: 'Soy Doña Tortuga. Aquí vas a aprender a manejar tu dinero jugando, sin prisa: este juego se juega diez minutos al día, muchos días. Te enseño lo básico en cinco pasos.',
    next: 'Vamos',
  },
  {
    id: 'paga',
    target: 'casa',
    title: 'Tu paga',
    text: 'Cada mes de la isla (cada día tuyo) te llegan 30 euroLukys al buzón de tu casa. Nada llega solo a tu cofre: hay que ir a buscarlo.',
    action: 'Toca las monedas que flotan sobre tu casa.',
    done: (g) => g.mailboxCents === 0 && (g.huchaCents > 0 || g.ledger.some((e) => e.kind === 'recogida')),
  },
  {
    id: 'comida',
    target: 'tienda',
    title: 'Primero, comer',
    text: 'Cada mes se gasta una cesta de comida de tu despensa. Empiezas con tres. Si se acaba, pierdes corazones; a los seis meses sin comer te tengo que rescatar y pierdes lo del cofre. La cesta está domiciliada: si tienes dinero, se compra sola. Pero hoy cómprala tú.',
    action: 'Entra en la tienda y compra la cesta pequeña.',
    done: (g) => g.purchases.some((p) => p.itemId.startsWith('cesta')),
  },
  {
    id: 'cofre',
    target: 'cofre',
    title: 'Tu cofre',
    text: 'Lo que no gastas se guarda en la cueva. Aquí está seguro… pero no crece. Más adelante aprenderás a hacer que tu dinero trabaje.',
    action: 'Toca la cueva del cofre para verlo.',
    done: (_g, ui) => ui.visited.has('cofre'),
  },
  {
    id: 'bellotas',
    target: null,
    title: 'Las bellotas',
    text: 'Cada día hay cinco bellotas escondidas por la isla. Si las encuentras, ganas unos euroLukys extra. Te enseño dónde está una.',
    action: 'Toca la bellota del haz de luz.',
    done: (_g, ui) => ui.acornsFound > 0,
  },
  {
    id: 'misiones',
    target: null,
    hud: 'misiones',
    title: 'Misiones y avisos',
    text: 'El pergamino tiene las misiones de tu nivel: al cumplirlas todas se abre el siguiente, con edificios nuevos. La campana te avisa cuando hay algo que hacer.',
    action: 'Abre las misiones (el pergamino de la izquierda).',
    done: (_g, ui) => ui.visited.has('misiones'),
  },
  {
    id: 'tiempo',
    target: null,
    title: 'Espera y verás',
    text: 'Un día tuyo es un mes de la isla. No hace falta jugar horas: entra cada día, recoge la paga, decide una cosa y vuelve mañana. Lo importante no pasa deprisa, pasa cada día. Este juego entrena la paciencia y la constancia.',
    next: '¡A jugar!',
  },
]
