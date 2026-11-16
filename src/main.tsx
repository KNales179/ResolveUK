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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
 