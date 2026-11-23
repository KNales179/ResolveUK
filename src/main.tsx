import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/newsreader/wght.css'
// Temporary: a live try of Hanken Grotesk (the free, open-licensed descendant of HK Grotesk,
// released by the same foundry) swapped in for the body font — see --font-sans in index.css.
import '@fontsource-variable/hanken-grotesk'
import './index.css'
import App from './App.tsx'
import { initServiceWorker } from './lib/swUpdate'

initServiceWorker()

// Photos shimmer (index.css) until they arrive; this marks each one as loaded, or as failed, so the
// shimmer stops. Load and error events don't bubble, so this listens in the capture phase.
const markLoaded = (e: Event) => {
  if (e.target instanceof HTMLImageElement) e.target.classList.add('is-loaded')
}
document.addEventListener('load', markLoaded, true)
document.addEventListener('error', markLoaded, true)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
 