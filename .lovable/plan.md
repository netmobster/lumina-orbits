## Performance audit + fast-forward freeze fix

### What I found

**1. Fast-forward freeze (root cause)**
`handleFastForward` runs `10 chunks × 60 iterations × DT=1.0` of `step()` synchronously, yielding only between chunks with `setTimeout(0)`. `step()` is **O(n²)** in both the force pass and the collision pass. At n=200, one chunk = 60 × ~40 000 pair checks + allocations = **1–3 s of blocked main thread**, ten times in a row. Browsers register that as a freeze.

Compounding it: `DT=1.0` is way above the live loop's ~0.05; shatter (3 frags per crash) and edge spawns keep adding bodies during FF with no cap.

**2. No population cap anywhere.** Long sessions naturally bloom to 200–400 bodies.

**3. `step()` is O(n²) — twice.** Force pass + collision pass both iterate every pair. At n=300 that's 90 000 pair checks per frame.

**4. `render()` allocates 1–2 gradients per body per frame.** `createRadialGradient` isn't free; at n=300 that's 600 per frame.

**5. Console runtime error: `IndexSizeError: radius (-40.4) is negative` in `ctx.arc`.** Defensive clamps needed.

**6. Auto-chaos doesn't care about population.** Storm/Comet/Supernova/Shatter all add bodies; can fire when already crowded.

---

### Plan

#### A. Fix fast-forward (highest priority)
Rewrite `handleFastForward` to be **wall-clock-budgeted**:
- `DT=0.5` (matches existing helper, half the per-iter explosion vs DT=1.0).
- Total sim-time advanced unchanged (~600 sim-seconds).
- Inner loop: run iters until `performance.now() - chunkStart > 8 ms`, then yield via `requestAnimationFrame`.
- Apply the population cap (B) inside the FF loop so n can't balloon mid-FF.
- Progress UI based on sim-time elapsed / target.

#### B. Population cap via **forced Fusion Cascade** (thematic)
Add `MAX_BODIES = 220`. Whenever `circles.length > MAX_BODIES`, run a cap-enforcer that **collapses bodies into bigger ones** instead of deleting them — preserves total mass and rewards the player with more high-gravity actors causing more chaos (gravity is `G·m₁·m₂/d²`, so bigger = disproportionately more interesting).

The enforcer ladder, applied in order until `circles.length ≤ MAX_BODIES * 0.5`:

1. **Run `fusionCascade`** with default params (±20% mass, ≤1 diameter). Usually clears the easy clusters.
2. **Run `fusionCascade` with widened params** — `massRatio ≥ 0.5`, reach `≤ 2 × diameter`. Catches looser groupings.
3. **Forced nearest-neighbor merge** — sort bodies by mass ascending; for each, find the nearest other body and merge regardless of size/distance. Guarantees `n` drops by ~half per pass.
4. Loop the ladder up to 4 times; abort if `n` ever stops decreasing (safety).

This is exported from `sim.ts` as `enforcePopulationCap(circles, cap)` and called:
- After every live-loop `step()`.
- After every FF iteration.
- Inside the live loop *before* auto-chaos fires, so a spawn-heavy agent (storm/comet) doesn't push over the cap.

Refactor `fusionCascade` signature to accept `{ massRatio?: number; reachMultiplier?: number }` so the same code powers the chaos agent (current defaults) and the cap enforcer (widened).

Also: in `pickAutoChaos()`, when `n > MAX_BODIES * 0.85`, bias the weighted pool toward `fusion` / `singularity` / `blackhole` and zero out `storm` / `comet` / `shatter`. The game self-regulates instead of fighting the cap.

#### C. Spatial grid for `step()` pair passes
Add a uniform-grid broad-phase in `sim.ts`:
- Cell size = `2 × maxRadiusInFrame`.
- Bucket bodies once per `step()`. Force + collision passes check only the body's cell + 8 neighbors.
- Cuts pair checks by 70–90% at n=200. Gravity is effectively short-range here (`1/d²` + `maxForce` clamp), so the cutoff has no visible effect.

#### D. Render micro-optimizations
- Wrap every `ctx.arc(x, y, R, ...)` with `Math.max(0, R)` — silences the negative-radius error.
- Widen the flat-fill threshold from `r < 3` to `r < 6` for glow + body passes. Saves one `createRadialGradient` per small body.

#### E. Fix negative-radius error at the source
In `OrbisCanvas`, clamp the `singularity.progress` value to `[0, 1]` (currently only `Math.min(1, …)`). Belt-and-suspenders with the render clamps in D.

---

### Expected impact
- FF: from "freezes 10+ s" → smooth progress, never blocks > ~10 ms per frame.
- Live loop at n=200: ~3–5× faster `step()`, frame time well under 8 ms.
- Population bounded at 220; when hit, the game **collapses bodies into bigger, more gravitationally interesting ones** instead of deleting mass. Feels like an emergent generation jump rather than a cleanup.
- Negative-radius console spam gone.

### Files touched
- `src/components/orbis/OrbisCanvas.tsx` — rewrite `handleFastForward`, call `enforcePopulationCap` after `step()` in live + FF loops, clamp singularity progress, bias `pickAutoChaos` when crowded.
- `src/lib/orbis/sim.ts` — add uniform-grid broad-phase used by `step()`; refactor `fusionCascade` to accept tuning params; add `enforcePopulationCap(circles, cap)` exporter.
- `src/lib/orbis/render.ts` — clamp arc radii; widen flat-fill threshold.

### Non-goals
- No Web Worker — serializing circle arrays each frame would cost more than it saves at n=220.
- No SFX changes, no UI changes, no chaos-agent behavior changes beyond the auto-pool bias.
