import { describe, expect, it } from 'vitest'
import { bonusLabel, formatClock } from './Hud'

describe('formatClock', () => {
  it('shows the full duration at the start rather than a second less', () => {
    expect(formatClock(90_000)).toBe('1:30')
  })

  it('rounds up, so a running game never reads 0:00', () => {
    expect(formatClock(1)).toBe('0:01')
    expect(formatClock(59_100)).toBe('1:00')
  })

  it('reaches 0:00 only when the clock genuinely is zero', () => {
    expect(formatClock(0)).toBe('0:00')
  })

  it('pads the seconds', () => {
    expect(formatClock(65_000)).toBe('1:05')
  })

  it('never shows negative time', () => {
    expect(formatClock(-500)).toBe('0:00')
  })
})

describe('bonusLabel', () => {
  it('reports whole seconds', () => {
    expect(bonusLabel(3_000)).toBe('+3s')
  })

  /**
   * The regression this guards is subtle. Headroom against the cap is an arbitrary
   * fraction of a second, so a clamped bonus is routinely a few hundred milliseconds —
   * genuinely positive, and previously rendered as "+0s".
   */
  it('says nothing when the bonus rounds away to nothing', () => {
    expect(bonusLabel(400)).toBeNull()
    expect(bonusLabel(1)).toBeNull()
  })

  it('says nothing when the cap swallowed the whole bonus', () => {
    expect(bonusLabel(0)).toBeNull()
  })

  it('rounds up from half a second, so a real gain is not silently dropped', () => {
    expect(bonusLabel(500)).toBe('+1s')
  })
})
