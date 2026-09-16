/**
 * PANTALLA DE ACCESO. Fondo con la isla, el logo y "Educación financiera para niños"; debajo, el panel
 * con dos pestañas: Crear cuenta (el adulto responsable pone su correo y una contraseña, y el nombre de
 * jugador, único) y Entrar. Sin confirmación de correo: al registrarse se entra directamente.
 */
import { useState, type FormEvent } from 'react'
import { useGame } from '../store/game'
import { USERNAME_RE } from '../lib/supabase'

type Mode = 'crear' | 'entrar'

export const BG_SRC = `${import.meta.env.BASE_URL}bg.jpg`
export const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="g-label block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] font-bold text-ink-3 mt-1">{hint}</span>}
    </label>
  )
}

const INPUT = 'w-full h-12 px-4 g-inset font-display font-extrabold text-[17px] text-ink placeholder:text-ink-3/60 focus:outline-none focus:ring-2 focus:ring-blue/60'

export function AuthScreen() {
  const signUp = useGame((s) => s.signUp)
  const signIn = useGame((s) => s.signIn)
  const [mode, setMode] = useState<Mode>('crear')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adult, setAdult] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const pwOk = password.length >= 6
  const userOk = USERNAME_RE.test(username.trim())
  const canSubmit = mode === 'crear' ? emailOk && pwOk && userOk && adult : emailOk && password.length > 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    const err = mode === 'crear' ? await signUp({ email, password, username: username.trim() }) : await signIn({ email, password })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="auth h-full overflow-y-auto">
      <div className="auth__bg" style={{ backgroundImage: `url(${BG_SRC})` }} aria-hidden="true" />
      <div className="relative min-h-full flex flex-col safe-top safe-bottom">
        <div className="flex-1 flex flex-col items-center md:items-start justify-start px-5 md:pl-[8vw] pt-[4vh] md:pt-[5vh]">
          <div className="w-full max-w-sm flex flex-col items-center">
            <img src={LOGO_SRC} alt="Finfun" className="auth__logo w-[54vw] max-w-[300px] h-auto" draggable={false} />
            <p className="auth__tagline mt-1 mb-4 font-display font-extrabold text-white text-[16px] tracking-wide text-center">Educación financiera para niños</p>

            <form onSubmit={submit} className="g-panel g-panel--blue relative w-full max-w-sm p-5 pt-9" noValidate>
              <div className="g-ribbon">{mode === 'crear' ? 'Crear cuenta' : 'Entrar'}</div>
              <div className="grid gap-2 g-inset p-1.5 grid-cols-2 mb-4">
                {(['crear', 'entrar'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m)
                      setError(null)
                    }}
                    className={`h-11 rounded-2xl font-display font-extrabold uppercase tracking-wide text-[14px] transition ${mode === m ? 'bg-white text-ink shadow-[0_3px_0_var(--color-cream-d)]' : 'text-ink-l'}`}
                  >
                    {m === 'crear' ? 'Crear cuenta' : 'Entrar'}
                  </button>
                ))}
              </div>

              <div className="grid gap-3">
                {mode === 'crear' && (
                  <Field label="Nombre del jugador" hint="Letras, números y guion bajo, de 3 a 16.">
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').slice(0, 16))}
                      placeholder="luky_07"
                      autoComplete="username"
                      autoCapitalize="off"
                      spellCheck={false}
                      className={INPUT}
                    />
                  </Field>
                )}
                <Field label={mode === 'crear' ? 'Correo del adulto responsable' : 'Correo'}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="off"
                    className={INPUT}
                  />
                </Field>
                <Field label="Contraseña" hint={mode === 'crear' ? 'Al menos 6 caracteres.' : undefined}>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      autoComplete={mode === 'crear' ? 'new-password' : 'current-password'}
                      className={`${INPUT} pr-14`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 rounded-xl text-[12px] font-extrabold text-ink-l bg-white/70"
                      aria-label={showPw ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPw ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </Field>
                {mode === 'crear' && (
                  <label className="flex items-start gap-3 g-inset p-3 cursor-pointer">
                    <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="auth__check mt-0.5" />
                    <span className="text-[13px] font-semibold text-ink leading-snug">
                      Soy el <b>adulto responsable</b> y creo esta cuenta para que un niño o niña juegue con mi permiso.
                    </span>
                  </label>
                )}
              </div>

              {error && (
                <p role="alert" className="mt-3 mb-0 g-inset !bg-red-l/40 p-3 text-[13px] font-extrabold text-red-d leading-snug">
                  {error}
                </p>
              )}

              <button type="submit" disabled={!canSubmit || busy} className={`g-btn g-btn--block g-btn--lg mt-4 ${mode === 'crear' ? 'g-btn--orange' : 'g-btn--blue'}`}>
                {busy ? 'Un momento…' : mode === 'crear' ? 'Crear y jugar' : 'Entrar'}
              </button>
              <p className="text-center text-[12px] font-bold text-ink-3 mt-3 mb-0">
                {mode === 'crear' ? (
                  <>
                    ¿Ya tienes cuenta?{' '}
                    <button type="button" onClick={() => setMode('entrar')} className="text-blue-d underline">
                      Entra aquí
                    </button>
                  </>
                ) : (
                  <>
                    ¿Primera vez?{' '}
                    <button type="button" onClick={() => setMode('crear')} className="text-blue-d underline">
                      Crea una cuenta
                    </button>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
        <footer className="auth__footer text-center py-4 font-display font-extrabold text-white text-[13px] tracking-wide">Made by CandelukyLabs</footer>
      </div>
    </div>
  )
}
