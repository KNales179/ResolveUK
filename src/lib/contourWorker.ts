import { drawContours } from './backdrops'

// Draws a strip of the contour lines away from the page's main thread, the way Fico's background
// costs nothing while you scroll: the page hands over a canvas, this draws into it, and scrolling
// never waits for the drawing.
self.onmessage = (e: MessageEvent<{ canvas: OffscreenCanvas; w: number; h: number; dpr: number; color: string; alpha: number; top: number }>) => {
  const { canvas, w, h, dpr, color, alpha, top } = e.data
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  drawContours(ctx as unknown as CanvasRenderingContext2D, w, h, color, alpha, top)
}
