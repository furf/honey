import type { Environment } from '../../engine'

/**
 * The world around the honeycomb, as six visual variants.
 *
 * Environments are semantically opaque to the rules — a level names one by id and the
 * rules never look inside. A theme whose levels changed planets rather than skies
 * would fit here unchanged.
 *
 * Sky, ground and light are all a theme can express here; particles and weather
 * effects are deliberately left for a later pass, since the MVP needs the honeycomb
 * legible above all.
 */

interface SkyStops {
  readonly top: string
  readonly bottom: string
}

/**
 * Paint sky, a distant treeline, and a wooden foreground.
 *
 * Shared by every environment so they differ only in colour, which is what keeps the
 * six of them a family rather than six separate designs.
 */
function scene(sky: SkyStops, foliage: string, wood: string, haze: string | null) {
  return (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, sky.top)
    gradient.addColorStop(1, sky.bottom)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // A soft treeline. Arcs rather than drawn trees: at this scale a silhouette reads
    // better than detail, and costs one path instead of hundreds.
    const horizon = height * 0.72
    ctx.fillStyle = foliage
    ctx.beginPath()
    ctx.moveTo(0, height)
    ctx.lineTo(0, horizon)
    const lumps = Math.max(3, Math.round(width / 90))
    for (let index = 0; index <= lumps; index++) {
      const x = (width / lumps) * index
      // Deterministic bumps: a fixed sine keeps the treeline identical every frame,
      // which matters because this is redrawn continuously.
      const lift = Math.sin(index * 1.7) * height * 0.035 + Math.cos(index * 0.9) * height * 0.02
      ctx.lineTo(x, horizon - lift)
    }
    ctx.lineTo(width, height)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = wood
    ctx.fillRect(0, height * 0.88, width, height * 0.12)

    if (haze) {
      ctx.fillStyle = haze
      ctx.fillRect(0, 0, width, height)
    }
  }
}

export const environments: readonly Environment[] = [
  {
    id: 'sunnyDay',
    draw: scene({ top: '#7fc7e8', bottom: '#cdeaf7' }, '#4f9d45', '#7a5230', null),
    tint: null,
  },
  {
    id: 'clearNight',
    draw: scene({ top: '#16264b', bottom: '#33507f' }, '#1f4a2c', '#4a3320', 'rgba(10, 20, 50, 0.2)'),
    tint: 'rgba(30, 50, 110, 0.22)',
  },
  {
    id: 'cloudyDay',
    draw: scene({ top: '#9fb3c0', bottom: '#d6dde1' }, '#4a7f47', '#6d4a2c', 'rgba(90, 100, 110, 0.1)'),
    tint: 'rgba(90, 100, 110, 0.12)',
  },
  {
    id: 'forebodingNight',
    draw: scene({ top: '#0f1730', bottom: '#243352' }, '#16351f', '#3b281a', 'rgba(8, 12, 30, 0.3)'),
    tint: 'rgba(20, 30, 70, 0.32)',
  },
  {
    id: 'stormyDay',
    draw: scene({ top: '#5c6672', bottom: '#8b96a0' }, '#3c6b3c', '#5b3d26', 'rgba(50, 55, 65, 0.2)'),
    tint: 'rgba(50, 55, 65, 0.22)',
  },
  {
    id: 'stormyNight',
    draw: scene({ top: '#080c1c', bottom: '#1a2138' }, '#102616', '#2e1f14', 'rgba(4, 6, 18, 0.4)'),
    tint: 'rgba(12, 18, 45, 0.42)',
  },
]
