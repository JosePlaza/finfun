/**
 * Acceso a Supabase. Si no hay variables de entorno, todo funciona en modo local:
 * la partida se guarda en el navegador, el reloj es el del dispositivo y no se pide cuenta.
 *
 * Con Supabase configurado:
 *  - la cuenta es obligatoria (correo + contraseña del adulto responsable; sin confirmación de correo);
 *  - el reloj del juego es la hora del servidor (RPC `server_now`): adelantar la hora del móvil no adelanta la isla;
 *  - la partida se guarda en `saves` (una por cuenta) y el perfil (nombre de jugador único) en `profiles`.
 *
 * El esquema está en supabase/migrations/.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { GameState } from '../sim'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const hasSupabase = supabase !== null

/** Quién ha entrado. */
export interface Account {
  id: string
  email: string
  username: string
}

/* ───────────────────────── Reloj ───────────────────────── */

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

/* ───────────────────────── Cuentas ───────────────────────── */

export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/

/** Errores de Supabase Auth traducidos a frases para la pantalla de acceso. */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')) return 'Ese correo ya tiene cuenta. Prueba a entrar.'
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) return 'El correo o la contraseña no son correctos.'
  if (m.includes('password should be at least') || m.includes('weak password') || m.includes('password')) return 'La contraseña tiene que tener al menos 6 caracteres.'
  if (m.includes('invalid email') || m.includes('unable to validate email') || m.includes('is invalid')) return 'Ese correo no parece correcto.'
  if (m.includes('profiles_username_unique') || m.includes('duplicate key')) return 'Ese nombre de jugador ya está cogido. Elige otro.'
  if (m.includes('username_format')) return 'El nombre solo puede tener letras, números y guion bajo (3 a 16).'
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.'
  if (m.includes('email not confirmed')) return 'Falta confirmar el correo. Revisa la bandeja de entrada.'
  if (m.includes('network') || m.includes('fetch')) return 'No hay conexión. Comprueba internet y vuelve a intentarlo.'
  return message ? `No se ha podido completar: ${message}` : 'No se ha podido completar. Inténtalo de nuevo.'
}

/** ¿Está libre ese nombre de jugador? (RPC pública; si falla, se deja pasar y lo comprobará el registro). */
export async function usernameAvailable(username: string): Promise<boolean> {
  if (!supabase) return true
  try {
    const { data, error } = await supabase.rpc('username_available', { name: username })
    if (error) return true
    return data !== false
  } catch {
    return true
  }
}

async function loadProfile(userId: string, email: string): Promise<Account> {
  let username = ''
  if (supabase) {
    const { data } = await supabase.from('profiles').select('username').eq('user_id', userId).maybeSingle()
    username = (data?.username as string | undefined) ?? ''
  }
  return { id: userId, email, username: username || email.split('@')[0] }
}

/** La cuenta que ya tiene sesión abierta en este dispositivo, si la hay. */
export async function currentAccount(): Promise<Account | null> {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    const u = data.session?.user
    if (!u) return null
    return loadProfile(u.id, u.email ?? '')
  } catch {
    return null
  }
}

export type AuthResult = { ok: true; account: Account } | { ok: false; error: string }

/** Crear cuenta: el adulto responsable pone su correo y una contraseña; el nombre de jugador va al perfil. */
export async function signUp(params: { email: string; password: string; username: string }): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' }
  const username = params.username.trim()
  if (!USERNAME_RE.test(username)) return { ok: false, error: 'El nombre solo puede tener letras, números y guion bajo (3 a 16).' }
  if (!(await usernameAvailable(username))) return { ok: false, error: 'Ese nombre de jugador ya está cogido. Elige otro.' }
  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: { data: { username, is_adult: true } },
  })
  if (error) return { ok: false, error: friendlyAuthError(error.message) }
  if (!data.user) return { ok: false, error: 'No se ha podido crear la cuenta.' }
  // Sin confirmación de correo, la sesión llega en la misma respuesta. Si el proyecto tuviera la
  // confirmación activada, no habría sesión: lo decimos claro.
  if (!data.session) return { ok: false, error: 'Revisa tu correo para confirmar la cuenta y después entra.' }
  return { ok: true, account: await loadProfile(data.user.id, data.user.email ?? params.email) }
}

export async function signIn(params: { email: string; password: string }): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Supabase no está configurado.' }
  const { data, error } = await supabase.auth.signInWithPassword({ email: params.email.trim(), password: params.password })
  if (error || !data.user) return { ok: false, error: friendlyAuthError(error?.message) }
  return { ok: true, account: await loadProfile(data.user.id, data.user.email ?? params.email) }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  try {
    await supabase.auth.signOut()
  } catch {
    /* la sesión local se limpia igualmente */
  }
}

/** Avisa cuando la sesión cambia desde fuera (otra pestaña cierra sesión, caduca el token…). */
export function onAuthChange(cb: (account: Account | null) => void): () => void {
  if (!supabase) return () => undefined
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') cb(null)
    else if (event === 'SIGNED_IN' && session?.user) void loadProfile(session.user.id, session.user.email ?? '').then(cb)
  })
  return () => data.subscription.unsubscribe()
}

/* ───────────────────────── Partidas ───────────────────────── */

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function loadRemote(): Promise<GameState | null> {
  if (!supabase) return null
  try {
    const uid = await currentUserId()
    if (!uid) return null
    const { data } = await supabase.from('saves').select('state').eq('user_id', uid).maybeSingle()
    return (data?.state as GameState | undefined) ?? null
  } catch {
    return null
  }
}

/** Guarda la partida de la cuenta actual. `netWorthCents` va aparte: alimenta las columnas del ranking. */
export async function saveRemote(state: GameState, netWorthCents = 0): Promise<void> {
  if (!supabase) return
  try {
    const uid = await currentUserId()
    if (!uid) return
    await supabase.from('saves').upsert({ user_id: uid, state, net_worth_cents: Math.max(0, Math.round(netWorthCents)), updated_at: new Date().toISOString() })
  } catch {
    /* se reintentará en el siguiente guardado */
  }
}

/** Borra la partida de la cuenta actual (empezar una isla nueva). */
export async function deleteRemote(): Promise<void> {
  if (!supabase) return
  try {
    const uid = await currentUserId()
    if (!uid) return
    await supabase.from('saves').delete().eq('user_id', uid)
  } catch {
    /* sin más */
  }
}
