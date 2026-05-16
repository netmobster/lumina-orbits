# Make 50–100 circles feel as smooth as 10

## The bottleneck

The trail loop dominates the frame. With `trailLength=1400` (CHAOS default) and 20 circles, every frame can stroke ~20 × 1400 × 2 = **56,000 line segments**, each with its own `beginPath` / `stroke` and an `hexA()` string parse — that's the cliff users hit around 20 bodies. Forces (`O(n²)`) and DOM react state are minor by comparison until ~100 bodies.

## Plan — keep the look, kill the cost

### 1. Persistent trail buffer (biggest single win, ~10×)

Replace the per-segment redraw with an **offscreen canvas that fades in place**.

Each frame in `render.ts`:
- Apply a fade pass on the trail buffer (`globalCompositeOperation = "destination-out"`, fill black with alpha derived from `tailFadeRate`). This naturally produces the smooth fade curve the slider controls — no per-point math.
- For each circle, draw ONE short segment from previous → current position into the buffer: a wide soft halo stroke + a thin core stroke (both still `"lighter"`, both using `glowSoftness` for width). That's **2 strokes per circle per frame** instead of 2 strokes × hundreds of trail points.
- Blit the buffer onto the main canvas.

Visual feel preserved:
- Long, glowing, aquatic tails (fade rate controls how far back they reach instead of a hard length cap).
- Speed-scaled width/alpha applied to the single drawn segment (fast = wider/brighter, slow = thin/dim) — same signal users see today.
- `glowSoftness` still controls halo width.
- `trailOpacity` still scales drawn alpha.

`trailLength` becomes a derived value of `tailFadeRate` (we can keep the slider and map it to a min fade clamp, so the user still controls "how long do trails persist"). The per-circle `c.trail[]` array can be dropped — saves memory and the per-frame `push/shift` work in `sim.ts`.

### 2. Cache colors once

Each circle gets a precomputed `rgbPrefix: string` (`"120,200,180"`) set when the circle is created or merged. `hexA(c.color.core, a)` becomes `` `rgba(${c.rgbPrefix},${a})` `` — drops hundreds of `parseInt` calls per frame.

### 3. Cache radius

`radiusOf(c.mass)` is called 4–6 times per circle per frame. Store `c.radius` and only recompute on mass change (merge/split/create). Trivial change in `sim.ts` + `makeCircle`.

### 4. Index sticky lookups

`circles.find((x) => x.id === otherId)` inside the sticky-arc loop is `O(n²)`. Build a `Map<id, Circle>` once per frame in `render`.

### 5. Adaptive quality (optional safety net)

When `count > 60` OR measured fps drops below 45, automatically:
- halve halo stroke width contribution,
- skip the radial-gradient body fill for the smallest 30% of circles (use flat fill).
Reverts when load drops. Keeps the door open for 200+ bodies.

### 6. Small fixes

- Skip the body radial-gradient creation when `r < 3` (use flat fill).
- Use `ctx.fillStyle = ...; ctx.fill()` without recreating gradients for tiny far-away circles.
- Read viewport DPR cap is already at 2 — good. Leave it.

## Files touched

- `src/lib/orbis/render.ts` — buffer-based trail pipeline, color cache usage, map lookup, adaptive quality.
- `src/lib/orbis/sim.ts` — drop `trail[]` push/shift; cache `radius`; populate `rgbPrefix` on create/merge.
- `src/lib/orbis/types.ts` — add `radius: number` and `rgbPrefix: string` to `Circle`.
- `src/components/orbis/OrbisCanvas.tsx` — allocate the offscreen trail buffer alongside the main canvas; reset it on resize.

No UI changes. Slider semantics preserved.

## Expected outcome

- 20 circles with CHAOS visuals: 60 fps comfortably (was ~25–30).
- 60+ circles still interactive (was a slideshow).
- Same aquatic glow, same fade, same speed-based brightness.
