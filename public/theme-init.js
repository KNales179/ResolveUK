// Follows the device's light or dark setting before the first paint, so there is no flash.
// Kept as its own file (not an inline <script> in index.html) so the site's security headers
// can require every script to come from this origin, with no inline-script exception needed.
document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
document.documentElement.classList.add('js')
