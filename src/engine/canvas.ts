/**
 * A canvas that stays sharp and correctly sized.
 *
 * The backing store is scaled by devicePixelRatio while drawing stays in CSS pixels,
 * so every coordinate elsewhere in the engine is in the same units as pointer events
 * and nothing has to remember to convert.
 */

export interface Surface {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  /** CSS pixels. */
  width: number
  height: number
  dpr: number
}

export interface SurfaceHandle {
  readonly surface: Surface
  /** Re-read the element's size. Returns true if it changed. */
  resize(): boolean
  dispose(): void
}

/**
 * Cap the pixel ratio.
 *
 * A 3x phone gains no visible sharpness over 2x for more than double the fill cost,
 * and fill rate is what a mid-range device runs out of first.
 */
const MAX_PIXEL_RATIO = 2

export function createSurface(
  canvas: HTMLCanvasElement,
  onResize?: (surface: Surface) => void,
): SurfaceHandle {
  // `alpha: false` lets the compositor skip blending the canvas against the page.
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('2d canvas context unavailable')
  const ctx: CanvasRenderingContext2D = context

  const surface: Surface = { canvas, ctx, width: 0, height: 0, dpr: 1 }

  function resize(): boolean {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))

    if (width === surface.width && height === surface.height && dpr === surface.dpr) {
      return false
    }

    surface.width = width
    surface.height = height
    surface.dpr = dpr

    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    onResize?.(surface)
    return true
  }

  resize()

  const observer = new ResizeObserver(() => resize())
  observer.observe(canvas)

  return {
    surface,
    resize,
    dispose: () => observer.disconnect(),
  }
}
