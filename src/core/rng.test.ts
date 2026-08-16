import { describe, expect, it } from 'vitest'
import { createRng } from './rng'

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(12345)
    const b = createRng(12345)
    const draw = (r: ReturnType<typeof createRng>) => Array.from({ length: 50 }, () => r.next())
    expect(draw(a)).toEqual(draw(b))
  })

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 50 }, () => createRng(1).next())
    const b = Array.from({ length: 50 }, () => createRng(2).next())
    expect(a).not.toEqual(b)
  })

  it('stays within [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 10_000; i++) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('keeps int() within range', () => {
    const rng = createRng(99)
    for (let i = 0; i < 1000; i++) {
      const value = rng.int(6)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(6)
    }
  })

  it('respects weights, at least in the obvious direction', () => {
    const rng = createRng(4)
    let heavy = 0
    for (let i = 0; i < 5000; i++) {
      if (rng.weighted([['heavy', 9] as const, ['light', 1] as const]) === 'heavy') heavy++
    }
    expect(heavy).toBeGreaterThan(4200)
    expect(heavy).toBeLessThan(4800)
  })

  it('never picks a zero-weight entry', () => {
    const rng = createRng(11)
    for (let i = 0; i < 1000; i++) {
      expect(rng.weighted([['yes', 1] as const, ['never', 0] as const])).toBe('yes')
    }
  })
})
