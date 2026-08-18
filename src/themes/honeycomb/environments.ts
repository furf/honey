import type { Environment } from '../../engine'

/**
 * The world around the honeycomb, as six painted variants.
 *
 * These were previously a two-stop gradient, a row of sine-wave lumps and a brown
 * rectangle — a placeholder wearing a comment. At two rings the board is smaller and
 * the world is more exposed, not less.
 *
 * Every scene is built from the same parts so the six read as one place at different
 * hours: a light source, layered ridges receding into haze, a treeline, and a meadow
 * foreground. They differ only in palette and where the light sits.
 *
 * Environments are semantically opaque to the rules — a level names one by id and the
 * rules never look inside.
 */

interface Scene {
  readonly skyTop: string
  readonly skyLow: string
  /** Where the sun or moon sits, as a fraction of the canvas. */
  readonly light: { readonly x: number; readonly y: number }
  readonly lightColour: string
  readonly lightGlow: string
  /** Ridges from far to near. Far ridges are hazier, which is what makes depth read. */
  readonly ridges: readonly string[]
  readonly trees: string
  readonly meadow: string
  readonly meadowShade: string
  readonly haze: string | null
}

/**
 * Deterministic pseudo-randomness.
 *
 * The background is drawn once and cached, but it must be identical every time it is
 * rebuilt — a resize should not reshuffle the treeline.
 */
function noise(seed: number): number {
  const value = Math.sin(seed * 127.1) * 43758.5453
  return value - Math.floor(value)
}

function drawScene(scene: Scene) {
  return (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
    const horizon = height * 0.66

    // ---- sky -------------------------------------------------------------
    const sky = ctx.createLinearGradient(0, 0, 0, horizon)
    sky.addColorStop(0, scene.skyTop)
    sky.addColorStop(1, scene.skyLow)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, horizon)

    // ---- sun or moon, with the glow that places it in the sky ------------
    const lightX = width * scene.light.x
    const lightY = height * scene.light.y
    const glowRadius = Math.min(width, height) * 0.42

    const glow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, glowRadius)
    glow.addColorStop(0, scene.lightGlow)
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, horizon)

    ctx.fillStyle = scene.lightColour
    ctx.beginPath()
    ctx.arc(lightX, lightY, Math.min(width, height) * 0.045, 0, Math.PI * 2)
    ctx.fill()

    // ---- ridges ----------------------------------------------------------
    // Drawn far to near, each one lower and more saturated than the last. Overlapping
    // silhouettes are what create depth; a single treeline read as a sticker.
    scene.ridges.forEach((colour, layer) => {
      const base = horizon - (scene.ridges.length - layer - 1) * height * 0.045
      const amplitude = height * (0.03 + layer * 0.018)

      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.moveTo(0, height)
      ctx.lineTo(0, base)

      const points = 7
      for (let index = 0; index <= points; index++) {
        const t = index / points
        const x = width * t
        const lift =
          Math.sin(t * Math.PI * (1.4 + layer * 0.6) + layer * 2.1) * amplitude +
          noise(index + layer * 17) * amplitude * 0.5
        const nextT = (index + 1) / points
        const nextLift =
          Math.sin(nextT * Math.PI * (1.4 + layer * 0.6) + layer * 2.1) * amplitude +
          noise(index + 1 + layer * 17) * amplitude * 0.5
        ctx.quadraticCurveTo(x + width / points / 2, base - (lift + nextLift) / 2, width * nextT, base - nextLift)
      }

      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fill()
    })

    // ---- treeline --------------------------------------------------------
    // Individual trees, placed deterministically. A silhouette of separate shapes
    // reads as a wood; a single wavy band reads as a placeholder.
    const treeBase = horizon + height * 0.035
    ctx.fillStyle = scene.trees
    const count = Math.max(6, Math.round(width / 62))
    for (let index = 0; index < count; index++) {
      const x = (width / count) * (index + noise(index * 3) * 0.8)
      const treeHeight = height * (0.05 + noise(index * 7) * 0.05)
      const treeWidth = treeHeight * (0.42 + noise(index * 11) * 0.2)

      ctx.beginPath()
      ctx.moveTo(x, treeBase - treeHeight)
      ctx.quadraticCurveTo(x + treeWidth, treeBase - treeHeight * 0.35, x + treeWidth * 0.55, treeBase)
      ctx.lineTo(x - treeWidth * 0.55, treeBase)
      ctx.quadraticCurveTo(x - treeWidth, treeBase - treeHeight * 0.35, x, treeBase - treeHeight)
      ctx.closePath()
      ctx.fill()
    }

    // ---- meadow ----------------------------------------------------------
    const meadow = ctx.createLinearGradient(0, treeBase, 0, height)
    meadow.addColorStop(0, scene.meadowShade)
    meadow.addColorStop(1, scene.meadow)
    ctx.fillStyle = meadow
    ctx.fillRect(0, treeBase - 1, width, height - treeBase + 1)

    if (scene.haze) {
      ctx.fillStyle = scene.haze
      ctx.fillRect(0, 0, width, height)
    }
  }
}

function environment(id: string, scene: Scene, tint: string | null): Environment {
  return { id, draw: drawScene(scene), tint }
}

export const environments: readonly Environment[] = [
  environment(
    'sunnyDay',
    {
      skyTop: '#4fa9d8',
      skyLow: '#bfe6f5',
      light: { x: 0.78, y: 0.16 },
      lightColour: '#fff6c9',
      lightGlow: 'rgba(255, 236, 160, 0.55)',
      ridges: ['#a9cbb4', '#7cb187', '#4f9159'],
      trees: '#37703f',
      meadow: '#6fb04a',
      meadowShade: '#508f3a',
      haze: null,
    },
    null,
  ),
  environment(
    'clearNight',
    {
      skyTop: '#101c3d',
      skyLow: '#3a5580',
      light: { x: 0.24, y: 0.14 },
      lightColour: '#eef3ff',
      lightGlow: 'rgba(150, 180, 255, 0.35)',
      ridges: ['#2b3f5e', '#22344c', '#182739'],
      trees: '#10202c',
      meadow: '#20402c',
      meadowShade: '#152b1e',
      haze: 'rgba(12, 22, 52, 0.18)',
    },
    'rgba(30, 50, 110, 0.2)',
  ),
  environment(
    'cloudyDay',
    {
      skyTop: '#8fa6b6',
      skyLow: '#d3dde2',
      light: { x: 0.62, y: 0.2 },
      lightColour: '#e8eef1',
      lightGlow: 'rgba(230, 238, 242, 0.4)',
      ridges: ['#9db2a4', '#7e9a83', '#5d7f63'],
      trees: '#3f6142',
      meadow: '#659a4c',
      meadowShade: '#4c7a3c',
      haze: 'rgba(120, 132, 142, 0.12)',
    },
    'rgba(90, 100, 110, 0.1)',
  ),
  environment(
    'forebodingNight',
    {
      skyTop: '#0a1226',
      skyLow: '#26324f',
      light: { x: 0.7, y: 0.12 },
      lightColour: '#cfd8f0',
      lightGlow: 'rgba(120, 140, 210, 0.28)',
      ridges: ['#232f47', '#1a2436', '#111927'],
      trees: '#0b131c',
      meadow: '#18301f',
      meadowShade: '#0f2015',
      haze: 'rgba(8, 14, 34, 0.28)',
    },
    'rgba(20, 30, 70, 0.3)',
  ),
  environment(
    'stormyDay',
    {
      skyTop: '#4a545f',
      skyLow: '#95a1aa',
      light: { x: 0.35, y: 0.22 },
      lightColour: '#c9d3d9',
      lightGlow: 'rgba(200, 212, 220, 0.3)',
      ridges: ['#78878c', '#5e6f6c', '#43554d'],
      trees: '#2c4433',
      meadow: '#4d7c40',
      meadowShade: '#385f30',
      haze: 'rgba(56, 62, 72, 0.2)',
    },
    'rgba(50, 55, 65, 0.2)',
  ),
  environment(
    'stormyNight',
    {
      skyTop: '#05070f',
      skyLow: '#1a2033',
      light: { x: 0.5, y: 0.1 },
      lightColour: '#9fb0cc',
      lightGlow: 'rgba(90, 110, 170, 0.22)',
      ridges: ['#1a2130', '#131924', '#0c1018'],
      trees: '#080d13',
      meadow: '#132618',
      meadowShade: '#0a1810',
      haze: 'rgba(4, 6, 18, 0.34)',
    },
    'rgba(12, 18, 45, 0.4)',
  ),
]
