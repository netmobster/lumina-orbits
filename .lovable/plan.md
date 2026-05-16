# Replace `drift` with `CHAOS` preset + auto-split slider

## 1. New `chaos` preset

In `src/lib/orbis/types.ts`:

- Change `Preset` type: `"drift"` → `"chaos"`.
- Replace the `drift` entry in `PRESETS` with an extreme `chaos` entry:
  - `G: 0.7` (strong gravity → wild slingshots)
  - `damping: 1.0` (no energy loss)
  - `mergeThreshold: 15` (frequent merges)
  - `maxForce: 400` (allow violent kicks)
  - `spawnRate: 15` (constant new bodies)
  - `auraIntensity: 10`, `ribbonDrift: 5`
  - `trailLength: 1400`, `trailOpacity: 200` (max visuals)
  - `glowSoftness: 6`, `tailFadeRate: 0.4` (long, slow-fading glowing tails)
  - `splitRate: 0.6` (new field, see §2)
  - `speed: 8`

## 2. New `splitRate` slider (random auto-splits)

Add `splitRate: number` to `SimConfig` (0–2, default `0`, meaning splits per second across the whole field).

In `src/lib/orbis/sim.ts` `step(...)`:

- Each frame, with probability `splitRate * dt`, pick a random circle with `mass > ~6` and call existing `splitCircle(c)`, replacing it with the two halves (mirroring the right-click split path).
- Skip if circle count is already at a sane cap (e.g. 80) to avoid runaway.

In `src/components/orbis/DebugPanel.tsx`:

- Add slider "Split randomness" 0–2 step 0.05, formatted `×/s`.
- Replace the `"drift"` entry in the preset button list with `"chaos"` (label uppercase "CHAOS").

In `src/components/orbis/OrbisCanvas.tsx`:

- Default preset stays `orbit`; just update any `"drift"` references (none in render path beyond types).

## 3. Suggested extras (asking before building)

You asked "Can you figure out/suggest what" — I'd add these to really push the extremes, let me know which to include:

- **Burst spawn on preset switch**: when CHAOS is activated, immediately seed ~25 extra circles with random velocities, so it kicks off chaotic instead of ramping up.
- **Random velocity kicks**: a `turbulence` slider (0–1) that every ~0.5s adds a small random impulse to a random subset of circles.
- **Mass-jitter on split**: instead of 50/50 split, randomize 30/70 → 70/30 so fragments are uneven and orbits get weirder.

## Files touched

- `src/lib/orbis/types.ts` — rename preset, add `splitRate`, retune `chaos`.
- `src/lib/orbis/sim.ts` — random auto-split inside `step`.
- `src/components/orbis/DebugPanel.tsx` — preset label + new slider.
- `src/components/orbis/OrbisCanvas.tsx` — preset key rename only.
