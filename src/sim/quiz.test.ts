import { describe, expect, it } from 'vitest'
import { LESSONS, MONTH_MS, QUIZZES } from './config'
import { answerQuiz, createGame, migrate, quizStatus } from './engine'
import type { GameState } from './types'

const EPOCH = Date.UTC(2026, 8, 13, 10, 0, 0)
const at = (months: number, extraMs = 0) => EPOCH + months * MONTH_MS + extraMs

function fresh() {
  return createGame({ islandName: 'Isla Bellota', seed: 12345, epochMs: EPOCH })
}

describe('cuestionarios de la escuela', () => {
  it('cada lección tiene su pregunta con cuatro opciones distintas y una pista', () => {
    for (const l of LESSONS) {
      const q = QUIZZES[l.id]
      expect(q, `falta el cuestionario de ${l.id}`).toBeDefined()
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.question.length).toBeGreaterThan(10)
      expect(q.hint.length).toBeGreaterThan(10)
    }
    expect(Object.keys(QUIZZES).sort()).toEqual(LESSONS.map((l) => l.id).sort())
  })

  it('una partida nueva no tiene ninguna lección aprendida', () => {
    const g = fresh()
    expect(g.lessonsRead).toEqual([])
    expect(g.quizFailedMonth).toEqual({})
    expect(quizStatus(g, EPOCH, 'inflacion')).toBe('disponible')
  })

  it('acertar (opción 0) marca la lección como aprendida y no se puede repetir', () => {
    const r = answerQuiz(fresh(), EPOCH, 'inflacion', 0)
    expect(r.ok).toBe(true)
    expect(r.correct).toBe(true)
    if (!r.ok) return
    expect(r.state.lessonsRead).toEqual(['inflacion'])
    expect(quizStatus(r.state, EPOCH, 'inflacion')).toBe('aprendida')
    const again = answerQuiz(r.state, EPOCH, 'inflacion', 1)
    expect(again.ok).toBe(false)
  })

  it('fallar deja la lección para mañana y al mes siguiente se puede volver a intentar', () => {
    const r = answerQuiz(fresh(), EPOCH, 'bono', 2)
    expect(r.ok).toBe(true)
    expect(r.correct).toBe(false)
    if (!r.ok) return
    expect(r.state.lessonsRead).toEqual([])
    expect(r.state.quizFailedMonth.bono).toBe(0)
    expect(quizStatus(r.state, EPOCH, 'bono')).toBe('manana')
    // Mismo día: bloqueado, aunque ahora acierte.
    const sameDay = answerQuiz(r.state, EPOCH + 60_000, 'bono', 0)
    expect(sameDay.ok).toBe(false)
    // Otras lecciones no se ven afectadas.
    expect(quizStatus(r.state, EPOCH, 'inflacion')).toBe('disponible')
    // Al día siguiente (mes siguiente de la isla) vuelve a estar disponible y puede acertar.
    const tomorrow = at(1, 1000)
    expect(quizStatus(r.state, tomorrow, 'bono')).toBe('disponible')
    const ok = answerQuiz(r.state, tomorrow, 'bono', 0)
    expect(ok.ok && ok.correct).toBe(true)
    if (ok.ok) {
      expect(ok.state.lessonsRead).toEqual(['bono'])
      expect(ok.state.quizFailedMonth.bono).toBeUndefined()
    }
  })

  it('rechaza lecciones que no existen', () => {
    expect(answerQuiz(fresh(), EPOCH, 'no-existe', 0).ok).toBe(false)
  })

  it('las partidas antiguas conservan las lecciones leídas como aprendidas y reciben el campo nuevo', () => {
    const old = fresh() as Partial<GameState>
    old.lessonsRead = ['inflacion', 'bono']
    delete old.quizFailedMonth
    const g = migrate(old as GameState)
    expect(g.lessonsRead).toEqual(['inflacion', 'bono'])
    expect(g.quizFailedMonth).toEqual({})
    expect(quizStatus(g, EPOCH, 'bono')).toBe('aprendida')
  })
})
