/**
 * Acceso opcional a Supabase. Si no hay variables de entorno, todo funciona en modo local:
 * la partida se guarda en el navegador y el reloj es el del dispositivo.
 *
 * Con Supabase configurado:
 *  - el reloj del juego es la hora del servidor (RPC `server_now`), para que adelantar la hora
 *    del dispositivo no adelante la isla;
 *  - la partida se guarda en la tabla `saves` con un usuario anónimo de Supabase Auth.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { GameState } from '../sim'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const hasSupabase = supabase !== null

/** Diferencia hora servidor − hora dispositivo, en ms. 0 en modo local. */
let clockOffsetMs = 0

export function serverNow(): number {
  return Date.now() + clockOffsetMs
}

/** Sincroniza el reloj con el servidor. Falla en silencio: el juego sigue con la hora local. */
export async function syncClock(): Promise<void> {
  if (!supabase) return
  try {
    const t0 = Date.now()
    const { data, error } = await supabase.rpc('server_now')
    if (error || !data) return
    const t1 = Date.now()
    const serverMs = new Date(data as string).getTime()
    clockOffsetMs = serverMs - (t0 + t1) / 2
  } catch {
    /* modo local */
  }
}

async function ensureUser(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  if (data.user) return data.user.id
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.user) return null
  return anon.user.id
}

export async function loadRemote(): Promise<GameState | null> {
  if (!supabase) return null
  try {
    const uid = await ensureUser()
    if (!uid) return null
    const { data } = await supabase.from('saves').select('state').eq('user_id', uid).maybeSingle()
    return (data?.state as GameState | undefined) ?? null
  } catch {
    return null
  }
}

export async function saveRemote(state: GameState): Promise<void> {
  if (!supabase) return
  try {
    const uid = await ensureUser()
    if (!uid) return
    await supabase.from('saves').upsert({ user_id: uid, state, updated_at: new Date().toISOString() })
  } catch {
    /* se reintentará en el siguiente guardado */
  }
}
