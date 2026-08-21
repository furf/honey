import { describe, expect, it } from 'vitest'
import { sortFound } from './foundWords'
import type { FoundWord } from '../core/types'

const found = (word: string, letters: number, harvested = 0): FoundWord => ({
  word,
  letters,
  harvested,
})

describe('sortFound', () => {
  it('puts the longest word first', () => {
    const sorted = sortFound([found('TEAM', 4), found('STINGER', 7), found('MATES', 5)])
    expect(sorted.map((entry) => entry.word)).toEqual(['STINGER', 'MATES', 'TEAM'])
  })

  it('breaks ties alphabetically rather than by discovery order', () => {
    const sorted = sortFound([found('ZEBU', 4), found('ACHE', 4), found('MOTE', 4)])
    expect(sorted.map((entry) => entry.word)).toEqual(['ACHE', 'MOTE', 'ZEBU'])
  })

  it('ranks by letters, not by cells', () => {
    // QUIT spans three cells but reads as four letters, so it outranks a three-cell
    // word that reads as three.
    const sorted = sortFound([found('ATE', 3), found('QUIT', 4)])
    expect(sorted[0]!.word).toBe('QUIT')
  })

  it('leaves the original untouched', () => {
    const original = [found('TEAM', 4), found('STINGER', 7)]
    sortFound(original)
    expect(original.map((entry) => entry.word)).toEqual(['TEAM', 'STINGER'])
  })

  it('handles a game where nothing was found', () => {
    expect(sortFound([])).toEqual([])
  })
})
