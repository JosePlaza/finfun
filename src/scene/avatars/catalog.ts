/**
 * CATÁLOGO DE AVATARES. Cada avatar es una receta: piel, pelo, ropa, sombrero, cara y extras. Todos son
 * personajes genéricos (un pirata, una bruja, un robot…), diseños propios del juego en el estilo low-poly
 * de la isla. El modelo 3D lo monta `Avatar.tsx` a partir de esta receta.
 */

export type HairStyle = 'calvo' | 'corto' | 'melena' | 'coletas' | 'mono' | 'flequillo' | 'largo' | 'rizos' | 'trenzas' | 'rastas'
export type Hat =
  | 'gorra'
  | 'vaquero'
  | 'bruja'
  | 'pirata'
  | 'casco'
  | 'corona'
  | 'egipcio'
  | 'gnomo'
  | 'conico'
  | 'antena'
  | 'beisbol'
  | 'capucha'
  | 'polar'
  | 'mexicano'
  | 'copa'
  | 'fedora'
  | 'payaso'
  | 'lazo'
  | 'tiara-mar'
  | 'calabaza'
  | 'buho'
  | 'tiburon'
  | 'paja'
  | 'hueso'
  | 'cactus'
  | 'gorro-rasta'
  | 'panuelo'
  | 'marinero'
  | 'boina'
export type Face = 'normal' | 'robot' | 'momia' | 'calavera' | 'zombi' | 'calabaza' | 'liebre'
export type Beard = 'completa' | 'perilla' | 'bigote' | 'larga' | 'mostacho'
export type Glasses = 'redondas' | 'sol' | 'espiral' | 'parche' | 'monoculo'
export type Extra =
  | 'alas'
  | 'cuello-reina'
  | 'pajarita'
  | 'bata'
  | 'corbata'
  | 'pipa'
  | 'cadena'
  | 'perlas'
  | 'huesos'
  | 'pinchos'
  | 'vendas'
  | 'plumas'
  | 'nariz-payaso'
  | 'volante'
  | 'capa'
  | 'tridente'
  | 'pendientes'
  | 'flor'
  | 'pajaro'
  | 'botones'
  | 'cinturon'
  | 'peto'
  | 'dientes'
  | 'remiendos'
  | 'numero'
  | 'chaleco'
  | 'panuelo-cuello'
  | 'colgante'
  | 'rayas-poncho'
  | 'rombos'
  | 'cejas-enfadadas'
  | 'mejillas'
  | 'hoja'
  | 'delantal'
  | 'bolso'

export interface AvatarDef {
  id: string
  /** Nombre que ve el niño. */
  name: string
  /** Icono para la rejilla de elección. */
  emoji: string
  skin: string
  hair?: { color: string; style: HairStyle }
  top: { color: string; sleeves?: string; accent?: string }
  bottom: { color: string; skirt?: boolean }
  shoes: string
  hat?: Hat
  hatColor?: string
  hatAccent?: string
  face?: Face
  beard?: { color: string; style: Beard }
  glasses?: Glasses
  extras?: Extra[]
  /** Texto del dorsal (extra 'numero'). */
  label?: string
  /** Altura relativa. */
  scale?: number
}

export const AVATARS: AvatarDef[] = [
  {
    id: 'gorra',
    name: 'Isleño',
    emoji: '🧢',
    skin: '#f2c9a6',
    hair: { color: '#5a3a1e', style: 'corto' },
    top: { color: '#3aa5d8' },
    bottom: { color: '#4a5a8a' },
    shoes: '#3a2f28',
    hat: 'gorra',
    hatColor: '#e2574c',
  },
  {
    id: 'polar',
    name: 'Polar',
    emoji: '🧊',
    skin: '#f2c9a6',
    hair: { color: '#3a2416', style: 'flequillo' },
    top: { color: '#c98b5a', accent: '#f4ecdc' },
    bottom: { color: '#8a5a3a' },
    shoes: '#5a3a24',
    hat: 'polar',
    hatColor: '#f4ecdc',
    extras: ['rombos'],
  },
  {
    id: 'futbol',
    name: 'Futbolista',
    emoji: '🏈',
    skin: '#f0bfa0',
    top: { color: '#d8382e', sleeves: '#f4ecdc' },
    bottom: { color: '#f4ecdc' },
    shoes: '#2b2b2b',
    hat: 'casco',
    hatColor: '#d8382e',
    hatAccent: '#cfd6dd',
    extras: ['numero'],
    label: '15',
  },
  {
    id: 'hada',
    name: 'Hada',
    emoji: '🧚',
    skin: '#f6d6bd',
    hair: { color: '#f2c044', style: 'mono' },
    top: { color: '#7fc25a', accent: '#e2574c' },
    bottom: { color: '#5f9e3d', skirt: true },
    shoes: '#7fc25a',
    extras: ['alas', 'flor', 'mejillas'],
    scale: 0.92,
  },
  {
    id: 'reina',
    name: 'Reina',
    emoji: '👑',
    skin: '#f6d6bd',
    hair: { color: '#1f1a2e', style: 'melena' },
    top: { color: '#2b2440', accent: '#e2574c' },
    bottom: { color: '#c9302b', skirt: true },
    shoes: '#1f1a2e',
    hat: 'corona',
    hatColor: '#f2c044',
    hatAccent: '#e2574c',
    extras: ['cuello-reina', 'cejas-enfadadas', 'capa'],
  },
  {
    id: 'faraona',
    name: 'Faraona',
    emoji: '🏺',
    skin: '#e0a984',
    hair: { color: '#1f1512', style: 'melena' },
    top: { color: '#f4ecdc', accent: '#f2c044' },
    bottom: { color: '#f4ecdc', skirt: true },
    shoes: '#c98b5a',
    hat: 'egipcio',
    hatColor: '#f2c044',
    hatAccent: '#2f6fb5',
    extras: ['colgante'],
  },
  {
    id: 'gnomo',
    name: 'Gnomo',
    emoji: '🍄',
    skin: '#f6d6bd',
    hair: { color: '#e9e2d0', style: 'calvo' },
    top: { color: '#c98b5a', accent: '#8a5a3a' },
    bottom: { color: '#6b4b2f' },
    shoes: '#c9302b',
    hat: 'gnomo',
    hatColor: '#3e4a66',
    beard: { color: '#e9e2d0', style: 'larga' },
    glasses: 'redondas',
    extras: ['cinturon', 'botones'],
    scale: 0.9,
  },
  {
    id: 'vaquero',
    name: 'Vaquero',
    emoji: '🤠',
    skin: '#f0bfa0',
    hair: { color: '#5a3a1e', style: 'corto' },
    top: { color: '#e9dcc4', accent: '#8a5a3a' },
    bottom: { color: '#3e4a66' },
    shoes: '#5a3a24',
    hat: 'vaquero',
    hatColor: '#8a5a3a',
    extras: ['chaleco', 'panuelo-cuello', 'cinturon'],
  },
  {
    id: 'arrocera',
    name: 'Arrocera',
    emoji: '🌾',
    skin: '#f2c9a6',
    hair: { color: '#1f1512', style: 'largo' },
    top: { color: '#f2c044', accent: '#e2574c' },
    bottom: { color: '#2b2b3a' },
    shoes: '#2b2b3a',
    hat: 'conico',
    hatColor: '#e2c26a',
    hatAccent: '#7a5fe0',
    extras: ['flor'],
  },
  {
    id: 'robot',
    name: 'Robot',
    emoji: '🤖',
    skin: '#9fd9c9',
    top: { color: '#2b3444', accent: '#3aa5d8' },
    bottom: { color: '#2b3444' },
    shoes: '#9fd9c9',
    hat: 'antena',
    hatColor: '#9fd9c9',
    hatAccent: '#3aa5d8',
    face: 'robot',
    extras: ['botones'],
  },
  {
    id: 'beisbol',
    name: 'Beisbolista',
    emoji: '⚾',
    skin: '#f2c9a6',
    hair: { color: '#5a3a1e', style: 'corto' },
    top: { color: '#f4ecdc', sleeves: '#2f4f8a', accent: '#e28a4a' },
    bottom: { color: '#cfd6dd' },
    shoes: '#2b2b2b',
    hat: 'beisbol',
    hatColor: '#2f4f8a',
    hatAccent: '#e2574c',
    extras: ['numero', 'cinturon'],
    label: '37',
  },
  {
    id: 'cactus',
    name: 'Cactus',
    emoji: '🌵',
    skin: '#f2c9a6',
    top: { color: '#6db34a' },
    bottom: { color: '#6db34a' },
    shoes: '#5a9a3a',
    hat: 'cactus',
    hatColor: '#6db34a',
    hatAccent: '#f2c044',
    extras: ['pinchos', 'hoja'],
  },
  {
    id: 'caperuza',
    name: 'Caperuza',
    emoji: '🧺',
    skin: '#f6d6bd',
    hair: { color: '#f2c044', style: 'flequillo' },
    top: { color: '#e2574c', accent: '#7fc25a' },
    bottom: { color: '#c9302b', skirt: true },
    shoes: '#5a3a24',
    hat: 'capucha',
    hatColor: '#e2574c',
    extras: ['mejillas', 'flor'],
    scale: 0.9,
  },
  {
    id: 'buho',
    name: 'Búho',
    emoji: '🦉',
    skin: '#f2c9a6',
    top: { color: '#8a4a3a', accent: '#f2c044' },
    bottom: { color: '#e9dcc4' },
    shoes: '#e28a4a',
    hat: 'buho',
    hatColor: '#8a4a3a',
    hatAccent: '#f2c044',
    extras: ['plumas'],
  },
  {
    id: 'momia',
    name: 'Momia',
    emoji: '🩹',
    skin: '#e9e2d0',
    top: { color: '#e9e2d0' },
    bottom: { color: '#e9e2d0' },
    shoes: '#d8d0bd',
    face: 'momia',
    extras: ['vendas', 'flor', 'remiendos'],
  },
  {
    id: 'mariachi',
    name: 'Mariachi',
    emoji: '🎺',
    skin: '#e0a984',
    hair: { color: '#1f1512', style: 'corto' },
    top: { color: '#e28a4a', accent: '#f4ecdc' },
    bottom: { color: '#f4ecdc' },
    shoes: '#5a3a24',
    hat: 'mexicano',
    hatColor: '#e2c26a',
    hatAccent: '#c9302b',
    beard: { color: '#1f1512', style: 'mostacho' },
    extras: ['rayas-poncho', 'pajarita'],
  },
  {
    id: 'rapero',
    name: 'Rapero',
    emoji: '🎤',
    skin: '#f0bfa0',
    hair: { color: '#5a3a1e', style: 'corto' },
    top: { color: '#8a8f99', accent: '#2b2b2b' },
    bottom: { color: '#2b2b2b' },
    shoes: '#f4ecdc',
    hat: 'gorra',
    hatColor: '#c9302b',
    beard: { color: '#5a3a1e', style: 'perilla' },
    glasses: 'sol',
    extras: ['cadena'],
  },
  {
    id: 'cientifico',
    name: 'Científico',
    emoji: '🧪',
    skin: '#f6d6bd',
    hair: { color: '#e9e2d0', style: 'rizos' },
    top: { color: '#f4ecdc', accent: '#3aa5d8' },
    bottom: { color: '#3fb0a0' },
    shoes: '#2b2b2b',
    beard: { color: '#e9e2d0', style: 'bigote' },
    glasses: 'espiral',
    extras: ['bata', 'corbata'],
  },
  {
    id: 'detective',
    name: 'Detective',
    emoji: '🕵️',
    skin: '#f0bfa0',
    hair: { color: '#3a2416', style: 'corto' },
    top: { color: '#3a3a44', accent: '#f4ecdc' },
    bottom: { color: '#3a3a44' },
    shoes: '#2b2b2b',
    hat: 'fedora',
    hatColor: '#3a3a44',
    hatAccent: '#8a8f99',
    beard: { color: '#3a2416', style: 'bigote' },
    extras: ['corbata', 'pipa', 'chaleco'],
  },
  {
    id: 'dama',
    name: 'Dama',
    emoji: '💎',
    skin: '#f6d6bd',
    hair: { color: '#5a3a1e', style: 'mono' },
    top: { color: '#2b2b3a' },
    bottom: { color: '#2b2b3a', skirt: true },
    shoes: '#2b2b3a',
    extras: ['perlas', 'pendientes', 'mejillas'],
  },
  {
    id: 'rey-mar',
    name: 'Rey del mar',
    emoji: '🔱',
    skin: '#f2c9a6',
    hair: { color: '#5aa7c9', style: 'melena' },
    top: { color: '#cfe6ee', accent: '#f2c044' },
    bottom: { color: '#3e4a66' },
    shoes: '#c98b5a',
    hat: 'tiara-mar',
    hatColor: '#f2c044',
    hatAccent: '#3fb0a0',
    beard: { color: '#5aa7c9', style: 'larga' },
    extras: ['tridente', 'cinturon'],
  },
  {
    id: 'bruja',
    name: 'Bruja',
    emoji: '🧙',
    skin: '#f6d6bd',
    hair: { color: '#e28a4a', style: 'largo' },
    top: { color: '#3e2a66', accent: '#e2574c' },
    bottom: { color: '#2b2b3a', skirt: true },
    shoes: '#2b2b3a',
    hat: 'bruja',
    hatColor: '#5b3f9e',
    hatAccent: '#3fb0a0',
    extras: ['pajarita', 'mejillas'],
    scale: 0.92,
  },
  {
    id: 'pirata',
    name: 'Pirata',
    emoji: '🏴‍☠️',
    skin: '#f0bfa0',
    hair: { color: '#c9302b', style: 'corto' },
    top: { color: '#2b2b3a', accent: '#c9302b' },
    bottom: { color: '#3a3a44' },
    shoes: '#2b2b2b',
    hat: 'pirata',
    hatColor: '#2b2b3a',
    hatAccent: '#f2c044',
    beard: { color: '#c9302b', style: 'completa' },
    glasses: 'parche',
    extras: ['cinturon', 'botones'],
  },
  {
    id: 'payaso',
    name: 'Payaso',
    emoji: '🤡',
    skin: '#f6d6bd',
    hair: { color: '#c9302b', style: 'rizos' },
    top: { color: '#7fc25a', accent: '#7a5fe0' },
    bottom: { color: '#3aa5d8' },
    shoes: '#e2574c',
    hat: 'payaso',
    hatColor: '#2f6fb5',
    hatAccent: '#7fc25a',
    extras: ['nariz-payaso', 'volante', 'pajarita', 'rombos'],
  },
  {
    id: 'calabaza',
    name: 'Calabaza',
    emoji: '🎃',
    skin: '#e28a4a',
    top: { color: '#2b2b3a', accent: '#e2574c' },
    bottom: { color: '#e28a4a' },
    shoes: '#2b2b2b',
    hat: 'calabaza',
    hatColor: '#e28a4a',
    hatAccent: '#2b2b3a',
    face: 'calabaza',
    extras: ['botones'],
  },
  {
    id: 'zombi',
    name: 'Zombi',
    emoji: '🧟',
    skin: '#a9c9d8',
    hair: { color: '#3a2a4a', style: 'flequillo' },
    top: { color: '#e28a4a', accent: '#3a3a44' },
    bottom: { color: '#3fb0a0' },
    shoes: '#2b2b2b',
    face: 'zombi',
    extras: ['chaleco', 'remiendos'],
  },
  {
    id: 'tiburon',
    name: 'Tiburón',
    emoji: '🦈',
    skin: '#f2c9a6',
    top: { color: '#3d7fa3', accent: '#cfe6ee' },
    bottom: { color: '#3d7fa3' },
    shoes: '#3d7fa3',
    hat: 'tiburon',
    hatColor: '#3d7fa3',
    hatAccent: '#f4ecdc',
    extras: ['dientes'],
  },
  {
    id: 'esqueleto',
    name: 'Esqueleto',
    emoji: '💀',
    skin: '#f4ecdc',
    top: { color: '#2b3444' },
    bottom: { color: '#2b3444' },
    shoes: '#f4ecdc',
    hat: 'hueso',
    hatColor: '#2b3444',
    hatAccent: '#f4ecdc',
    face: 'calavera',
    extras: ['huesos'],
  },
  {
    id: 'espantapajaros',
    name: 'Espantapájaros',
    emoji: '🌻',
    skin: '#e2c26a',
    hair: { color: '#c98b5a', style: 'trenzas' },
    top: { color: '#8a5a3a', accent: '#f2c044' },
    bottom: { color: '#3e4a66' },
    shoes: '#5a3a24',
    hat: 'paja',
    hatColor: '#e2c26a',
    hatAccent: '#f4ecdc',
    extras: ['peto', 'pajaro', 'remiendos'],
  },
  {
    id: 'surfero',
    name: 'Surfero',
    emoji: '🏄',
    skin: '#8d5a3b',
    hair: { color: '#1f1512', style: 'rastas' },
    top: { color: '#7fc25a', accent: '#e2574c' },
    bottom: { color: '#e9dcc4' },
    shoes: '#5a3a24',
    hat: 'gorro-rasta',
    hatColor: '#c9302b',
    hatAccent: '#f2c044',
    extras: ['colgante', 'chaleco'],
  },
]

export const AVATAR_BY_ID: Record<string, AvatarDef> = Object.fromEntries(AVATARS.map((a) => [a.id, a]))
export const DEFAULT_AVATAR = AVATARS[0].id

export function avatarOr(id: string | null | undefined): AvatarDef {
  return (id && AVATAR_BY_ID[id]) || AVATAR_BY_ID[DEFAULT_AVATAR]
}

/* ───────────────────────── Vecinos de la isla y la Liebre ───────────────────────── */

/**
 * Los habitantes de la isla, con la misma morfología que los avatares (así todos parecen del mismo mundo).
 * No se eligen: pasean, pescan, barren… El orden importa: Island.tsx los reparte por rutas y puestos.
 */
export const NEIGHBORS: AvatarDef[] = [
  {
    id: 'v-nina',
    name: 'Niña de la coleta',
    emoji: '👧',
    skin: '#e0a984',
    hair: { color: '#2b1b12', style: 'coletas' },
    top: { color: '#e8a4c4', accent: '#f4ecdc' },
    bottom: { color: '#4a5a8a' },
    shoes: '#c9302b',
    extras: ['mejillas', 'rombos'],
    scale: 0.84,
  },
  {
    id: 'v-vecino',
    name: 'Vecino',
    emoji: '👨',
    skin: '#8d5a3b',
    hair: { color: '#1f1512', style: 'corto' },
    top: { color: '#e28a4a', accent: '#f4ecdc' },
    bottom: { color: '#5a3a24' },
    shoes: '#2b2b2b',
    extras: ['botones', 'cinturon'],
  },
  {
    id: 'v-abuelo',
    name: 'Abuelo del sombrero',
    emoji: '👴',
    skin: '#f6d6bd',
    hair: { color: '#c9c2b5', style: 'calvo' },
    top: { color: '#7fb069', accent: '#5a3a24' },
    bottom: { color: '#6b4b2f' },
    shoes: '#3a2f28',
    hat: 'paja',
    hatColor: '#e2c26a',
    hatAccent: '#c9302b',
    beard: { color: '#c9c2b5', style: 'bigote' },
    glasses: 'redondas',
    extras: ['chaleco'],
    scale: 0.98,
  },
  {
    id: 'v-vecina',
    name: 'Vecina',
    emoji: '👩',
    skin: '#c68b5c',
    hair: { color: '#3a2416', style: 'melena' },
    top: { color: '#c9302b', accent: '#f2c044' },
    bottom: { color: '#3f3f3f', skirt: true },
    shoes: '#2b2b2b',
    extras: ['pendientes', 'colgante'],
    scale: 0.96,
  },
  {
    id: 'v-panadera',
    name: 'Panadera',
    emoji: '🥖',
    skin: '#f2c9a6',
    hair: { color: '#b5652b', style: 'mono' },
    top: { color: '#f5c542', accent: '#f4ecdc' },
    bottom: { color: '#4a5a8a' },
    shoes: '#5a3a24',
    hat: 'panuelo',
    hatColor: '#c9302b',
    hatAccent: '#f4ecdc',
    extras: ['delantal'],
    scale: 0.94,
  },
  {
    id: 'v-marinero',
    name: 'Marinero',
    emoji: '⚓',
    skin: '#a56c47',
    hair: { color: '#111', style: 'corto' },
    top: { color: '#3aa5d8', accent: '#f4ecdc' },
    bottom: { color: '#e9e2d0' },
    shoes: '#2b2b2b',
    hat: 'marinero',
    hatColor: '#f4ecdc',
    hatAccent: '#2f4f8a',
    beard: { color: '#111', style: 'perilla' },
    extras: ['rayas-poncho', 'panuelo-cuello'],
  },
  {
    id: 'v-chica',
    name: 'Chica del morado',
    emoji: '💜',
    skin: '#f0bfa0',
    hair: { color: '#e2b04a', style: 'trenzas' },
    top: { color: '#7a5fe0', accent: '#f4ecdc' },
    bottom: { color: '#4a5a8a' },
    shoes: '#f4ecdc',
    extras: ['mejillas', 'bolso'],
    scale: 0.9,
  },
  {
    id: 'v-repartidor',
    name: 'Repartidor',
    emoji: '📦',
    skin: '#d9a77c',
    hair: { color: '#4b2e1e', style: 'corto' },
    top: { color: '#f4ecdc', accent: '#e28a4a' },
    bottom: { color: '#2f4858' },
    shoes: '#2b2b2b',
    hat: 'gorra',
    hatColor: '#e28a4a',
    extras: ['chaleco', 'cinturon'],
  },
  {
    id: 'v-hortelano',
    name: 'Hortelano',
    emoji: '🥕',
    skin: '#f2c9a6',
    hair: { color: '#5a3a1e', style: 'corto' },
    top: { color: '#3e8f3a', accent: '#8a5a3a' },
    bottom: { color: '#6b4b2f' },
    shoes: '#5a3a24',
    hat: 'boina',
    hatColor: '#5a3a24',
    beard: { color: '#5a3a1e', style: 'mostacho' },
    extras: ['peto', 'remiendos'],
    scale: 0.98,
  },
  {
    id: 'v-banquero',
    name: 'Banquero',
    emoji: '🏦',
    skin: '#f6d6bd',
    hair: { color: '#3a2416', style: 'corto' },
    top: { color: '#2f4f8a', accent: '#f4ecdc' },
    bottom: { color: '#2b2b3a' },
    shoes: '#2b2b2b',
    glasses: 'monoculo',
    extras: ['corbata', 'chaleco', 'botones'],
  },
]

/** La Liebre: la vecina impulsiva. Misma morfología, con orejas, hocico y dientes. */
export const LIEBRE_AVATAR: AvatarDef = {
  id: 'liebre',
  name: 'La Liebre',
  emoji: '🐰',
  skin: '#d9c3a5',
  top: { color: '#c9302b', accent: '#f2c044' },
  bottom: { color: '#5a3a24' },
  shoes: '#d9c3a5',
  face: 'liebre',
  extras: ['botones'],
  scale: 0.9,
}
