# Bottom-right Stats HUD

A small glass panel pinned to the bottom-right of `/game`, next to the existing `?` help button, showing two live readouts.

## What the user sees

- **Elapsed**: `mm:ss` (or `h:mm:ss` past one hour). Counts **simulation time** — scales with the speed multiplier, freezes when paused (speed = 0), resets on Reset (R) and on game-over reset.
- **Mass**: `4.2 Earths` — sum of every body on screen (friendly circles **and** enemies when the enemies system is on). Uses the same glass styling as the `?` button so it reads as part of the chrome.

## Scale convention

Radius in the sim is `sqrt(mass) * 4` pixels. Treating ~40px ≈ 1 cm at typical DPI, a 1 cm body corresponds to **mass = 25 sim units = 1 Earth**. So:

```text
earths = totalMass / 25
```

One source of truth as `EARTH_MASS_UNITS = 25` in `src/lib/orbis/types.ts`.

## Files

### `src/lib/orbis/types.ts`
- Export `export const EARTH_MASS_UNITS = 25;`

### `src/components/orbis/StatsHUD.tsx` (new)
- Presentational component: `{ elapsedSec: number; totalMass: number }`.
- Formats time (`mm:ss` / `h:mm:ss`) and mass (`(totalMass / EARTH_MASS_UNITS).toFixed(1)` + ` Earths`, singular `Earth` when value rounds to 1.0).
- Layout: `fixed bottom-4 right-16 z-20` (sits left of the existing `?` button at `right-4`). Same glass tokens as the `?` button: `var(--orbis-surface)`, `var(--orbis-hairline)`, `var(--orbis-text-muted)`, `backdrop-filter: blur(14px)`, rounded, `DM Sans` + `JetBrains Mono` for numerals, `tabular-nums`.
- Two stacked rows with tiny uppercase labels (`Elapsed`, `Mass`) and the value beneath, e.g.:
  ```
  ELAPSED   02:14
  MASS      4.2 Earths
  ```

### `src/components/orbis/OrbisCanvas.tsx`
- Add `simTimeRef = useRef(0)` and accumulate inside the existing `loop`: when `!gameOverRef.current`, `simTimeRef.current += dt` (note `dt = realDt * speedRef.current`, so pause naturally freezes it and speed scales it).
- Add `totalMassRef = useRef(0)` updated in the same ~4Hz block that updates fps/count: `sum of circles.mass + sum of enemies.mass`.
- Add React state `elapsedSec` and `totalMass` set in that same ~4Hz block (cheap, avoids per-frame re-renders).
- In `handleReset`, set `simTimeRef.current = 0` and reset the state values.
- Render `<StatsHUD elapsedSec={elapsedSec} totalMass={totalMass} />` next to the existing `?` button.

## Out of scope

- No persistence across reloads or page nav.
- No high-score, no "best time", no game-over summary.
- No changes to physics, enemy logic, spawn, or rendering.
- No changes to the homepage or other routes.
