import type { Environment } from './theme'

/**
 * Paints an environment once and reuses the bitmap.
 *
 * The backdrop is layered ridges, a treeline of individual trees, and two gradients —
 * far too much to rebuild sixty times a second for a picture that does not change. It
 * is drawn to an offscreen canvas and blitted, so a richer world costs one drawImage
 * per frame instead of a few hundred path operations.
 *
 * Falls back to drawing directly when there is no document, which is what lets the
 * renderer be tested without a browser.
 */

export interface EnvironmentCache {
  draw(
    ctx: CanvasRenderingContext2D,
    environment: Environment,
    width: number,
    height: number,
    dpr: number,
  ): void
  clear(): void
}

interface Entry {
  readonly canvas: HTMLCanvasElement
  readonly key: string
}

export function createEnvironmentCache(): EnvironmentCache {
  let entry: Entry | null = null

  return {
    draw(ctx, environment, width, height, dpr) {
      if (typeof document === 'undefined' || width <= 0 || height <= 0) {
        environment.draw(ctx, width, height, 0)
        return
      }

      const key = `${environment.id}:${width}x${height}@${dpr}`

      if (!entry || entry.key !== key) {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(width * dpr))
        canvas.height = Math.max(1, Math.round(height * dpr))

        const offscreen = canvas.getContext('2d')
        if (!offscreen) {
          environment.draw(ctx, width, height, 0)
          return
        }

        offscreen.setTransform(dpr, 0, 0, dpr, 0, 0)
        environment.draw(offscreen, width, height, 0)
        entry = { canvas, key }
      }

      ctx.drawImage(entry.canvas, 0, 0, width, height)
    },

    clear() {
      entry = null
    },
  }
}
