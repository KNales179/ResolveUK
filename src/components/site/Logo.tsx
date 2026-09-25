// The Resolve UK mark. On the dark theme it sits on a light tile so the dark green stays readable.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`grid size-9 place-items-center rounded-xl dark:bg-white/95 ${className}`}>
      <picture>
        <source type="image/webp" srcSet="/img/logo-mark.webp" />
        <img src="/img/logo-mark.png" width="24" height="28" alt="" className="h-7 w-auto" />
      </picture>
    </span>
  )
}
