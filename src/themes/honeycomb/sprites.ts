import type { Sprite } from '../../engine'
import { palette } from './palette'

/**
 * Sprites, drawn rather than loaded.
 *
 * Vector art in code means no asset pipeline, no licensing questions, and bees that
 * recolour with the palette instead of needing new files. `phase` is a 0..1 animation
 * clock the renderer supplies, so wings beat without the sprite holding any state.
 *
 * Every bee is drawn nose-up along -y, so the renderer can rotate it to face travel.
 *
 * A forager and a hunter must be tellable apart in a glance, on a small screen, while
 * moving — so they differ in silhouette, not just colour: a flower and a full pollen
 * basket against a drawn stinger and a leaner body.
 */

interface BeeStyle {
  readonly body: string
  readonly stripe: string
  /** Drawn after the body, for the details that distinguish the kind. */
  readonly marks: (ctx: CanvasRenderingContext2D, body: number) => void
  readonly slim: number
}

function drawBee(style: BeeStyle): Sprite {
  return (ctx, size, phase) => {
    const body = size * 0.5
    const wingBeat = Math.sin(phase * Math.PI * 2)

    ctx.save()

    // Wings first, so the body sits over them.
    ctx.fillStyle = palette.beeWing
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * body * 0.34, -body * 0.15)
      ctx.rotate(side * (0.5 + wingBeat * 0.35))
      ctx.beginPath()
      ctx.ellipse(0, -body * 0.45, body * 0.3, body * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.fillStyle = style.body
    ctx.beginPath()
    ctx.ellipse(0, 0, body * style.slim, body, 0, 0, Math.PI * 2)
    ctx.fill()

    // Stripes clipped to the body, so they curve with it.
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(0, 0, body * style.slim, body, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = style.stripe
    for (let index = 0; index < 3; index++) {
      ctx.fillRect(-body, body * (0.02 + index * 0.38), body * 2, body * 0.2)
    }
    ctx.restore()

    ctx.fillStyle = style.stripe
    ctx.beginPath()
    ctx.arc(0, -body * 0.95, body * 0.36, 0, Math.PI * 2)
    ctx.fill()

    style.marks(ctx, body)
    ctx.restore()
  }
}

/** A flower over one ear and a laden pollen basket: unmistakably here for the honey. */
const forager = drawBee({
  body: palette.bee,
  stripe: palette.beeStripe,
  slim: 0.64,
  marks: (ctx, body) => {
    // Flower.
    ctx.save()
    ctx.translate(body * 0.5, -body * 1.15)
    ctx.fillStyle = palette.foragerFlower
    for (let petal = 0; petal < 5; petal++) {
      const angle = (Math.PI * 2 * petal) / 5
      ctx.beginPath()
      ctx.ellipse(
        Math.cos(angle) * body * 0.2,
        Math.sin(angle) * body * 0.2,
        body * 0.16,
        body * 0.16,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
    ctx.fillStyle = palette.foragerFlowerCentre
    ctx.beginPath()
    ctx.arc(0, 0, body * 0.13, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Pollen basket on the hind leg.
    ctx.fillStyle = palette.foragerPollen
    ctx.beginPath()
    ctx.ellipse(-body * 0.55, body * 0.5, body * 0.22, body * 0.28, 0.4, 0, Math.PI * 2)
    ctx.fill()
  },
})

/** Leaner, darker, and pointed: the stinger is the whole message. */
const hunter = drawBee({
  body: palette.hunterBody,
  stripe: palette.beeStripe,
  slim: 0.55,
  marks: (ctx, body) => {
    ctx.fillStyle = palette.hunterSting
    ctx.beginPath()
    ctx.moveTo(-body * 0.14, body * 0.92)
    ctx.lineTo(body * 0.14, body * 0.92)
    ctx.lineTo(0, body * 1.62)
    ctx.closePath()
    ctx.fill()

    // Angled brow, which reads as intent even at a few pixels.
    ctx.strokeStyle = palette.hunterSting
    ctx.lineWidth = Math.max(1, body * 0.12)
    ctx.beginPath()
    ctx.moveTo(-body * 0.3, -body * 1.16)
    ctx.lineTo(-body * 0.05, -body * 1.02)
    ctx.moveTo(body * 0.3, -body * 1.16)
    ctx.lineTo(body * 0.05, -body * 1.02)
    ctx.stroke()
  },
})

/** A bee that has fed: swollen and glowing, which is the "leaving soon" tell. */
function fullOf(sprite: Sprite): Sprite {
  return (ctx, size, phase) => {
    ctx.save()
    ctx.shadowColor = palette.bee
    ctx.shadowBlur = size * 0.35
    ctx.scale(1.18, 1.1)
    sprite(ctx, size, phase)
    ctx.restore()
  }
}

export const sprites: Readonly<Record<string, Sprite>> = {
  'bee.forager': forager,
  'bee.forager.full': fullOf(forager),
  'bee.hunter': hunter,
  'bee.hunter.full': fullOf(hunter),
}

/**
 * The wordmark: the word in honeycomb gold with a dropped shadow, ringed by hexagons.
 * Drawn rather than typeset as an image so it scales to any screen.
 */
export function logo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const size = Math.min(width * 0.16, height * 0.16)

  ctx.save()
  ctx.translate(width / 2, height / 2)

  ctx.strokeStyle = 'rgba(255, 214, 120, 0.5)'
  ctx.lineWidth = Math.max(1, size * 0.06)
  for (let index = 0; index < 6; index++) {
    const angle = (Math.PI / 3) * index - Math.PI / 2
    const x = Math.cos(angle) * size * 1.9
    const y = Math.sin(angle) * size * 1.9
    ctx.beginPath()
    for (let corner = 0; corner < 6; corner++) {
      const a = (Math.PI / 180) * (60 * corner - 90)
      const px = x + Math.cos(a) * size * 0.42
      const py = y + Math.sin(a) * size * 0.42
      if (corner === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
  }

  ctx.font = `900 ${size * 1.5}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#a8641a'
  ctx.fillText('HONEY', 0, size * 0.09)
  ctx.fillStyle = palette.cellFill
  ctx.fillText('HONEY', 0, 0)

  ctx.restore()
}
