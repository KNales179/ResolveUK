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
      // 'prompt' instead of 'autoUpdate': a new service worker installs in the background but
      // waits for someone to actually click "Install update" (see swUpdate.ts/UpdateBanner)
      // before it takes over — autoUpdate was activating silently, which is why the page's
      // on-screen content kept lagging a version behind until an unexplained manual refresh.
      registerType: 'prompt',
      // Registered from main.tsx instead of an auto-injected inline <script>, so the site's
      // Content-Security-Policy can require scripts to come from this origin with no exceptions.
      injectRegister: false,
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      // clientsClaim hands the new worker control of any already-open tab the moment it does
      // activate, instead of waiting for that tab's next full reload; cleanupOutdatedCaches drops
      // the previous deploy's cached assets once that happens. skipWaiting is deliberately left
      // off — with it on, the worker activates itself regardless of the 'prompt' setting above,
      // which defeats the whole point of waiting for the click.
      workbox: {
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
        // The installed app opens on the app itself (signed in: home; otherwise sign-in), as in Fico.
        // `id` stays what the old start address made it, so phones that already installed Resolve
        // treat this as the same app and update it rather than seeing a new one.
        id: '/report',
        start_url: '/app',
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
