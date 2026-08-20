/**
 * The shape of a theme.
 *
 * Declared by the engine because the engine is what consumes one — a sprite is a
 * function written against the engine's drawing primitives. Themes supply instances.
 *
 * Everything visual or audible belongs here and nowhere else. No colour, font, or
 * sound name may appear in the rules, the renderer, or the app shell.
 * See docs/design/presentation.md.
 */

export interface Palette {
  /** The honeycomb's own colours. Constant across every environment. */
  readonly cellFill: string
  readonly cellFillEmpty: string
  /** Warm light through the wax at the centre of an empty cell. */
  readonly cellWaxLit: string
  /** The specular band along the honey surface. */
  readonly honeyGloss: string
  readonly cellEdge: string
  /** The slab of wax the cells are cut into, drawn as one shape behind them all. */
  readonly slabFill: string
  readonly slabEdge: string
  readonly cellShadow: string
  readonly cellHighlight: string
  readonly letter: string
  readonly letterDim: string
  /** Glyph colour on a cell wearing a state colour, where the usual letter loses contrast. */
  readonly letterOnState: string
  /**
   * The two edges of a letter stamped into the wax, drawn behind the glyph itself.
   *
   * Both are translucent so one pair works over honey gold and over a blue, green or
   * red state cell, rather than needing a second pair per state.
   */
  readonly letterEmbossHighlight: string
  readonly letterEmbossShadow: string

  /** Trail states. Red means damage and only damage. */
  readonly trailSelecting: string
  readonly trailScored: string
  readonly trailAlreadyPlayed: string
  readonly trailInvalid: string
  readonly trailStung: string

  readonly bee: string
  readonly beeStripe: string
  readonly beeWing: string
  readonly foragerFlower: string
  readonly foragerFlowerCentre: string
  readonly foragerPollen: string
  readonly hunterBody: string
  readonly hunterSting: string

  readonly hudText: string
  readonly hudGood: string
  readonly hudWarn: string
  readonly hudDanger: string
}

export interface Typography {
  /** Family for letters on cells. */
  readonly letters: string
  /** Family for the HUD and screens. */
  readonly ui: string
  /** Letter size as a fraction of a cell's circumradius. */
  readonly letterScale: number
}

/**
 * Anything drawable the theme owns, keyed by sprite id.
 *
 * `phase` is a 0..1 animation clock; `level` is a 0..1 measure of how far along the
 * thing is — for a bee, how full it is. Both are generic on purpose: the engine hands
 * numbers to a draw function and never learns what they mean.
 */
export type Sprite = (
  ctx: CanvasRenderingContext2D,
  size: number,
  phase: number,
  level: number,
) => void

/**
 * A visual variant of the world around the honeycomb.
 *
 * Semantically opaque to the rules: this is "visual variant N", not "weather". A
 * theme whose levels change planets rather than skies needs no changes elsewhere.
 */
export interface Environment {
  readonly id: string
  /** Paint the backdrop. Called with the full canvas rect. */
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, timeMs: number): void
  /** Tint laid over the honeycomb, or null for none. */
  readonly tint: string | null
  /** Optional transition into this environment; the engine falls back to a crossfade. */
  readonly transition?: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
  ) => void
}

/** A recipe the audio engine can synthesise, keyed by event name. */
export interface SoundRecipe {
  readonly kind: 'tone' | 'noise' | 'buzz' | 'chord'
  readonly frequency: number
  readonly durationMs: number
  readonly gain: number
  /** Semitone offsets for a chord; ignored otherwise. */
  readonly intervals?: readonly number[]
  /** Frequency at the end of the sound, for a sweep. */
  readonly toFrequency?: number
}

export interface Theme {
  readonly id: string
  readonly palette: Palette
  readonly typography: Typography
  readonly sprites: Readonly<Record<string, Sprite>>
  /** Draw the wordmark for the welcome screen. */
  readonly logo: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
  readonly sounds: Readonly<Record<string, SoundRecipe>>
  /**
   * Sustained sounds that play while an environment is shown, keyed by environment id.
   *
   * Named rather than embedded, so a music bed is just more entries in `sounds` and
   * the audio engine needs no separate notion of music.
   */
  readonly music: Readonly<Record<string, readonly string[]>>
  /** Branded copy. Not functional UI labels. */
  readonly strings: Readonly<Record<string, string>>
  readonly environments: readonly Environment[]
}

export function environmentById(theme: Theme, id: string): Environment {
  return theme.environments.find((environment) => environment.id === id) ?? theme.environments[0]!
}
