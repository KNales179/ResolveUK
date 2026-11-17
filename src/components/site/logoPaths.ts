// Geometry for the Resolve UK mark, shared by Logo (static) and AnimatedLogo so they can never drift
// apart. viewBox 0 0 198 223.
//
// Redrawn from clean geometry against the brand's Deep Green lockup rather than traced: one flat
// baseline (y 223) shared by the foot and both leaves, true verticals/horizontals where the letter is
// straight, curvature-matched joins on the long S-sweeps, and the pin as a real map pin — a circle with
// straight sides to a point, with a concentric round hole. Draw R + PIN together with
// fill-rule="evenodd"; that's what punches the hole out of the pin.

// Starts at the bottom-left of the foot and heads right along the baseline, then climbs the leg — the
// order the grow-in animation relies on (the vine sprouts at ground level).
export const R_PATH =
  'M 0 223 L 31.4 223 C 32.42 223 33.28 222.23 33.39 221.21 C 39.35 164.45 72.9 146.82 119.61 126.47 C 141.88 116.77 172.8 103.43 172.8 65 C 172.8 32.21 148.03 0 116 0 L 6 0 C 2.69 0 0 2.69 0 6 L 0 133 C 5.73 123.83 25.99 105.76 35.66 104.74 C 36.42 104.66 37 104.02 37 103.25 L 37 33.5 C 37 30.74 39.24 28.5 42 28.5 L 88 28.5 C 109.35 28.5 124 42.25 124 66 C 124 100.53 82.62 109.98 60.47 120.24 C 37.05 131.09 0 159.19 0 183 L 0 223 Z'

// Outer pin, then its hole.
export const PIN_PATH =
  'M 76.5 91 L 90.49 71.59 C 94.28 66.33 94.81 59.4 91.86 53.64 C 88.9 47.88 82.98 44.25 76.5 44.25 C 70.02 44.25 64.1 47.88 61.14 53.64 C 58.19 59.4 58.72 66.33 62.51 71.59 L 76.5 91 Z M 83.25 61.5 C 83.25 65.23 80.23 68.25 76.5 68.25 C 72.77 68.25 69.75 65.23 69.75 61.5 C 69.75 57.77 72.77 54.75 76.5 54.75 C 80.23 54.75 83.25 57.77 83.25 61.5 Z'

export const LEAF_RIGHT_PATH =
  'M 198 223 C 178.57 191.9 155.68 137.9 118 137.9 C 107.64 137.9 97.35 144.49 90 148.4 C 111.24 158.76 113.05 170.29 126.56 188.59 C 134.19 198.92 154.11 223 166 223 L 198 223 Z'

export const LEAF_LEFT_PATH =
  'M 81.4 157 C 60.73 175.61 50 192.44 50 223 L 68 223 C 87.12 216.04 92 184.9 92 168 C 92 161.56 86.56 159.75 81.4 157 Z'
