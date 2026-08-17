import type { Sprite } from '../../engine'
import { palette } from './palette'

/**
 * Sprites, drawn rather than loaded.
 *
 * Vector art defined in code means no asset pipeline, no licensing questions, and a
 * bee that recolours with the palette instead of needing a second file. `phase` is a
 * 0..1 animation clock the renderer supplies, so wings beat without the sprite
 * holding any state of its own.
 */

/**
 * The worker bee, drawn nose-up along +y so the renderer can rotate it to face travel.
 *
 * `size` is the bee's body length. Everything else is proportional to it, so one
 * sprite serves both the board and any HUD use.
 */
const worker: Sprite = (ctx, size, phase) => {
  const body = size * 0.5
  const wingBeat = Math.sin(phase * Math.PI * 2)

  ctx.save()

  // Wings first, so the body sits over them.
  ctx.fillStyle = palette.beeWing
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * body * 0.35, -body * 0.15)
    ctx.rotate(side * (0.5 + wingBeat * 0.35))
    ctx.beginPath()
    ctx.ellipse(0, -body * 0.45, body * 0.32, body * 0.62, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Abdomen.
  ctx.fillStyle = palette.bee
  ctx.beginPath()
  ctx.ellipse(0, 0, body * 0.62, body, 0, 0, Math.PI * 2)
  ctx.fill()

  // Stripes, clipped to the body so they curve with it.
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, body * 0.62, body, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = palette.beeStripe
  for (let index = 0; index < 3; index++) {
    ctx.fillRect(-body, body * (0.02 + index * 0.38), body * 2, body * 0.2)
  }
  ctx.restore()

  // Head.
  ctx.fillStyle = palette.beeStripe
  ctx.beginPath()
  ctx.arc(0, -body * 0.95, body * 0.38, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

/**
 * A bee that has fed.
 *
 * Drawn from the same routine with a swollen, glowing abdomen. `phase` doubles as the
 * fullness here — the swell is the telegraph that says "this one is leaving soon",
 * which the player reads without needing a meter.
 */
const workerFull: Sprite = (ctx, size, phase) => {
  ctx.save()
  ctx.shadowColor = palette.bee
  ctx.shadowBlur = size * 0.35
  ctx.scale(1 + 0.18, 1 + 0.1)
  worker(ctx, size, phase)
  ctx.restore()
}

export const sprites: Readonly<Record<string, Sprite>> = {
  'bee.worker': worker,
  'bee.worker.full': workerFull,
}

/**
 * The wordmark: the word set in a honeycomb-gold slab with a dropped shadow, over a
 * ring of hexagons. Drawn rather than typeset as an image so it scales to any screen.
 */
export function logo(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const size = Math.min(width * 0.16, height * 0.16)

  ctx.save()
  ctx.translate(width / 2, height / 2)

  // A halo of small hexes, so the mark reads as "honeycomb" before the word does.
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
