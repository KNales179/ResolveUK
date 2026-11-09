import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from main.tsx instead of an auto-injected inline <script>, so the site's
      // Content-Security-Policy can require scripts to come from this origin with no exceptions.
      injectRegister: false,
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      // Without these, a newly-installed service worker sits "waiting" until every open tab for
      // the site is closed before it actually takes over — which is exactly the "I have to open
      // it again to see the update" symptom. skipWaiting activates the new worker immediately;
      // clientsClaim hands it control of any already-open tab right away, instead of leaving that
      // tab on the old worker until its next full reload. cleanupOutdatedCaches drops the previous
      // deploy's cached assets once the new worker takes over, instead of leaving them around.
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Resolve UK',
        short_name: 'Resolve UK',
        description: 'Report environmental issues in your area and track their resolution.',
        theme_color: '#99b788',
        background_color: '#0b3d36',
        display: 'standalone',
        start_url: '/report',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
