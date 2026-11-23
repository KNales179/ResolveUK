import type { SVGProps } from 'react'

// Simple line icons, drawn on a 24 grid and coloured by the surrounding text.
const PATHS = {
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c3 .2 5 2.2 5 5.3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1.5 2h5L16 13h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  road: '<path d="M3 20 8 4M21 20 16 4M12 5v3M12 11v3M12 17v3"/>',
  spray: '<rect x="8" y="10" width="8" height="11" rx="1.5"/><path d="M10 10V7h4v3M11 4h2M18 6h2M18 9l2-1"/>',
  car: '<path d="M3 15v-4l2-5h14l2 5v4M3 15h18M3 15v3h3v-3M18 15v3h3v-3"/><circle cx="7.5" cy="12.5" r=".8"/><circle cx="16.5" cy="12.5" r=".8"/>',
  lamp: '<path d="M12 21V8M12 8c0-3 5-4 7-2M9 21h6"/><path d="M17 5.5l4 1.5-1.5 3z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  'chevron-left': '<path d="M15 6l-6 6 6 6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>',
  crosshair: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  building: '<path d="M4 21V9l8-5 8 5v12M9 21v-6h6v6M8 12h.01M12 12h.01M16 12h.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M6.2 6.3C3.9 7.9 2 12 2 12s4 7 10 7c1.9 0 3.6-.5 5-1.3M17.9 17.8C19.9 16.2 22 12 22 12s-1.7-3-4.6-5"/><path d="M14.1 5.3A10 10 0 0 0 12 5C6 5 2 12 2 12"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  minus: '<path d="M5 12h14"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  more: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4.1 3.1-7 7-7s7 2.9 7 7"/>',
  sparkles: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  rotate: '<path d="M20 11A8 8 0 1 0 19 16"/><path d="M20 4v7h-7"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 1.9-.7 1.9-1.4 0-.4-.2-.7-.4-1-.3-.4-.1-.9.4-1h1.1a4 4 0 0 0 4-4A8 8 0 0 0 12 3z"/><circle cx="8.2" cy="11" r="1"/><circle cx="8.2" cy="15" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="15.8" cy="11" r="1"/>',
  bell: '<path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  logout: '<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'size-5', ...rest }: { name: IconName; className?: string } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
      {...rest}
    />
  )
}
