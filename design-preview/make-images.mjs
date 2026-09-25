// Turns the pictures in public/ into small, fast versions for the design sample.
// Each picture is made in AVIF and WebP at a few widths, never larger than the original.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pub = join(here, '..', 'public')
const out = join(here, 'img')
mkdirSync(out, { recursive: true })

// name, source file, widths to make
const jobs = [
  ['hero-morning', 'UK2.jpg', [720, 1280, 1920]],
  ['hero-night', 'UK night 2.jpg', [720, 1280, 1620]],
  ['cta-morning', 'UK dawn.webp', [720, 1280, 1600]],
  ['cta-dusk', 'UK1.webp', [720, 1280, 1536]],
  ['rubbish-street', 'UK trash 2.jpg', [400, 678]],
  ['litter-bottles', 'UK trash 5.webp', [400, 640]],
  ['roadside-litter', 'UK trash 3.jpg', [400, 480]],
]

for (const [name, file, widths] of jobs) {
  const src = join(pub, file)
  const meta = await sharp(src).metadata()
  for (const w of widths) {
    const width = Math.min(w, meta.width)
    const base = sharp(src).rotate().resize({ width, withoutEnlargement: true })
    await base.clone().avif({ quality: 48, effort: 5 }).toFile(join(out, `${name}-${width}.avif`))
    await base.clone().webp({ quality: 72 }).toFile(join(out, `${name}-${width}.webp`))
  }
  console.log(name, meta.width + 'x' + meta.height)
}
