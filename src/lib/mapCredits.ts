import type { Map as MapLibreMap } from 'maplibre-gl'

// MapLibre opens its map credits ("OpenFreeMap © OpenMapTiles…") the first time a map loads and only
// folds them away once the map is dragged. On a phone that line covers the map's own labels and
// legend, so every map starts with them folded behind the small "i" button, which still opens them.
export function foldCredits(m: MapLibreMap) {
  const fold = () => m.getContainer().querySelectorAll('.maplibregl-compact-show').forEach((el) => el.classList.remove('maplibregl-compact-show'))
  m.once('load', fold)
  m.once('idle', fold)
}
