# Radioactive tab: mass-growth fix + fast-forward + 6 chaos agents

## 1. Mass-growth fix (bundled in)

In `src/lib/orbis/sim.ts`:
- Reduce merge energy loss: `newMass = totalMass * 0.9` → `* 0.98`.

In `src/components/orbis/OrbisCanvas.tsx`:
- Switch the spawn timer accumulator to use **sim time** (`dt * speedRef.current`) instead of wall-clock dt, so 10× speed produces 10× spawns.

Result: total mass should visibly climb in Earths over a few minutes at 5–10× speed.

## 2. ">> 1 hour" fast-forward button

Top of the Radioactive tab. Behavior:
- Disables UI, shows a centered overlay "Fast-forwarding 1 hour…".
- In a `setTimeout(0)` so the overlay paints first, runs `step()` for 3600 sim-seconds at a fixed `dt=0.5s` (7200 iterations). Renderer/enemy loops are skipped.
- Advances `simTimeRef` by 3600s so the HUD jumps by 1h.
- Enemies pause for the duration; their state is preserved as-is.
- Triggers a `setCircles(...)` at the end so the canvas updates.

Gated by the existing `xlEnabled` toggle.

## 3. Six chaos agents — each its own button with independent 5s cooldown

A 3×2 grid of buttons above the existing Radioactive controls. Each button:
- Fires its one-shot effect on click.
- Goes into a 5-second cooldown — dimmed, disabled, with a thin progress ring or fill animation around the button showing time remaining.
- Re-enables automatically at t+5s.

Cooldowns tracked per-button in a `cooldownsRef` (map of id → unlock-at timestamp) plus a 4Hz tick state to redraw progress.

The six:

- **Supernova** — Largest body deleted; mass split into 6–10 fragments flying radially outward at high velocity. Mass conserved.
- **Black Hole** — Invisible super-gravity well at canvas center for 3 seconds (G×20 applied as an extra attractor in `step`), then vanishes.
- **Gravity Pulse** — `G *= 5` for 2 seconds via a `gravityMultiplierRef`, then restored.
- **Asteroid Storm** — Spawn 15 small fast bodies from random edges, staggered over ~1 second (5 per 333ms).
- **Comet** — Single large fast body spawned at one edge, aimed across the canvas with high velocity.
- **Inversion** — Gravity sign flipped for 2 seconds via a `gravitySignRef` consumed in the force loop.

All chaos agents work regardless of enemies on/off and respect the `xlEnabled` gate.

## Files touched

- `src/lib/orbis/sim.ts` — merge loss tweak; optional `extraAttractor` / `gravityMultiplier` / `gravitySign` params on `step()`; export `fastForward(circles, cfg, seconds)` and helpers `triggerSupernova(circles)`, `spawnAsteroidStorm(w,h)`, `spawnComet(w,h)`.
- `src/components/orbis/OrbisCanvas.tsx` — sim-time spawn timer; refs for gravity-multiplier / gravity-sign / black-hole; cooldown map; handlers `onFastForward` and `onChaos(id)`; fast-forward overlay.
- `src/components/orbis/DebugPanel.tsx` — new top section in the `radio` tab with the `>> 1 hour` button and the 6 chaos buttons (3×2 grid), each rendering its cooldown progress.

No changes to types, enemies, render, palette, routes, or homepage.
