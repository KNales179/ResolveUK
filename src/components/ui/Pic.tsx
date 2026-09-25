// A picture in AVIF and WebP at a few widths, so each screen downloads only what it needs.
interface Props {
  name: string
  widths: number[]
  width: number
  height: number
  alt: string
  className?: string
  sizes?: string
  eager?: boolean
}

export function Pic({ name, widths, width, height, alt, className = '', sizes = '100vw', eager = false }: Props) {
  const set = (ext: string) => widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ')
  const last = widths[widths.length - 1]
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img
        src={`/img/${name}-${last}.webp`}
        width={width}
        height={height}
        alt={alt}
        className={className}
        loading={eager ? undefined : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
      />
    </picture>
  )
}
