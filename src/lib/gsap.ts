import { gsap } from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import Flip from 'gsap/Flip'

gsap.registerPlugin(ScrollTrigger, Flip)

export { gsap, ScrollTrigger, Flip }

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Development only: lets automated checks slow every animation down to inspect it frame by frame.
if (import.meta.env.DEV) (window as unknown as { __gsap: typeof gsap }).__gsap = gsap
