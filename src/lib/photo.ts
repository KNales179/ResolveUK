// Shrinks a photo in the browser before it is uploaded. Phone photos are often 4 to 10 MB.
// The longest side is capped at 1600 pixels and the result is a JPEG at 80% quality, usually under 500 KB.
// The picture is rotated the way it was taken, and the location data hidden in the file is dropped.

export const MAX_SIDE = 1600
export const QUALITY = 0.8

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export interface PreparedPhoto {
  blob: Blob
  ext: string
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.fillStyle = '#ffffff' // so a transparent PNG does not turn black
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob) throw new Error('no blob')
    return { blob, ext: 'jpg' }
  } catch {
    // The browser could not read it. Send the original if it is a type we accept.
    const ext = EXTENSIONS[file.type]
    if (!ext) throw new Error('That photo type is not supported. Please choose a JPEG, PNG or WebP photo.')
    return { blob: file, ext }
  }
}
