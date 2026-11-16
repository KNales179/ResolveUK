import { registerSW } from 'virtual:pwa-register'

// Fired once a new service worker is installed and waiting — see UpdateBanner, which listens for
// this to show the "update available" message instead of the page reloading on its own.
export const SW_UPDATE_EVENT = 'resolve:sw-update-available'

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null

export function initServiceWorker(): void {
  applyUpdate = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT))
    },
  })
}

// Only called from the banner's own "Install update" click — never automatically — so a visit
// never reloads out from under someone mid-form.
export async function applyPendingUpdate(): Promise<void> {
  if (applyUpdate) await applyUpdate(true)
}
