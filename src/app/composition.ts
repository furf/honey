import wordsUrl from '../content/dictionary/data/words.bin?url'
import meta from '../content/dictionary/data/words.meta.json'
import { createFamilyGenerator, createPackedDictionary } from '../content'
import { createRng, randomSeed } from '../core/rng'
import type { GameDeps } from '../core/types'
import { beeTypes, gameConfig, levels } from '../config'

/**
 * The composition root: the one place that sees every layer at once.
 *
 * Dictionary, generator, theme and level table are independent axes assembled here,
 * so any one can be swapped without the others noticing.
 * See docs/adr/0002-layered-architecture.md.
 */

let dictionaryPromise: Promise<ArrayBuffer> | null = null

/**
 * Fetch the packed dictionary once and reuse it.
 *
 * It is the largest thing the game downloads, so it is loaded behind the welcome
 * screen rather than blocking first paint, and cached across games.
 */
export function preloadDictionary(): Promise<ArrayBuffer> {
  dictionaryPromise ??= fetch(wordsUrl).then((response) => {
    if (!response.ok) throw new Error(`could not load dictionary: ${response.status}`)
    return response.arrayBuffer()
  })
  return dictionaryPromise
}

export async function createDeps(seed = randomSeed()): Promise<{ deps: GameDeps; seed: number }> {
  const bytes = await preloadDictionary()
  const dictionary = createPackedDictionary(bytes, meta)

  const generator = createFamilyGenerator({
    dictionary,
    generation: gameConfig.generation,
    words: gameConfig.words,
  })

  return {
    deps: {
      config: gameConfig,
      levels,
      dictionary,
      generator,
      beeTypes,
      rng: createRng(seed),
    },
    seed,
  }
}
