# ORBIS — Phase 1: The Living System

A meditative canvas-based physics sim. Glowing circles drift through deep-space, attract each other, clump, and merge. All physics hand-rolled. No external physics libs.

## Files to create

- `src/routes/index.tsx` — replace placeholder; mount the simulation full-viewport
- `src/components/orbis/OrbisCanvas.tsx` — canvas + RAF loop + input handlers
- `src/components/orbis/DebugPanel.tsx` — collapsible glass panel with sliders + reset
- `src/components/orbis/BackgroundAura.tsx` — CSS vignette + slow drifting gradient blobs + noise overlay
- `src/lib/orbis/types.ts` — `Circle`, `SimConfig`, palette types
- `src/lib/orbis/palette.ts` — the 5 circle color presets (core + shadow) and enemy red
- `src/lib/orbis/sim.ts` — pure physics step: forces, integration, edge bounce, collisions, merges, splits, spawns
- `src/lib/orbis/render.ts` — canvas drawing: radial-gradient glow, sticky connecting arcs, merge flash, selection ring
- `src/styles.css` — add ORBIS tokens (deep teal bg, teal accent, glass surface vars)

## Architecture

```text
index route
  └── BackgroundAura (fixed, behind canvas: vignette + drifting blobs + noise)
  └── OrbisCanvas (full viewport)
        ├── useRef<HTMLCanvasElement>
        ├── useRef<Circle[]> (mutable, avoid React re-render per frame)
        ├── useRef<SimConfig> (live-mutated by sliders)
        ├── RAF loop: step(sim, config, dt) -> render(ctx, sim)
        ├── pointer handlers: click select / second-click merge / right-click split
        └── 15s spawn timer (inside RAF, accumulator)
  └── DebugPanel (top-right, controls config refs + FPS + circle count + reset)
```

State strategy: circles and config live in refs so the RAF loop never triggers React re-renders. The debug panel keeps its own React state for slider values and writes through to the shared `configRef` on change. FPS + circle count update via a lightweight `setState` throttled to ~4Hz.

## Physics (per frame, dt-normalized)

1. **Attraction** — O(n²) pairs. `F = G * m1 * m2 / max(dist², minDist²)`. Cap force magnitude (e.g. 50) to prevent tunneling. Apply equal-and-opposite acceleration `a = F/m`.
2. **Integrate** — `v += a*dt; v *= damping; pos += v*dt` (use dt in seconds; scale G accordingly so defaults feel right at 60fps).
3. **Edge bounce** — clamp pos to `[r, W-r]`, flip velocity component, multiply by `-0.7`.
4. **Collisions** — pairwise `dist < r1+r2`:
   - smaller.mass / larger.mass ≥ 0.6 → **sticky**: positional resolution (push apart to just-touching), strong mutual attraction bias, mark `stickyWith` set; if `m1+m2 ≥ mergeThreshold` → merge
   - else → **bounce**: standard elastic 2D collision response, scale resulting velocities by 0.6
5. **Merge** — new mass = `m1+m2` minus 10% energy converted to small random outward burst on the survivor; weighted-center position; momentum-conserving velocity; blended color (weighted by mass); `flashUntil = now + 180ms`.
6. **Split** (right-click selected) — replace with 2 circles, each half mass, placed on either side along a random axis, velocities = parent.v ± perpendicular kick.
7. **Spawn** — every `spawnRate` seconds, new small circle (mass 5–12) at random edge with velocity aimed loosely at center (+jitter), random palette color.

Radius: `r = sqrt(mass) * 4`.

## Rendering

- Clear with semi-transparent dark fill (`rgba(8,13,18,1)`) — no motion trails (keeps it crisp; can be tuned later).
- For each circle:
  - Outer radial gradient (r → r*1.8) with core color at low alpha (0.15–0.25, scaling slightly with mass) fading to transparent — drawn with `globalCompositeOperation = 'lighter'` for bloom feel.
  - Inner filled disc with core color.
  - If `flashUntil > now` → overlay white disc fading out.
  - If selected → 1px white ring at r+3.
- For each sticky pair → faint arc/line between centers, alpha pulsing via `sin(now)`.
- Reset composite op after.

## Input

- **Left click** on a circle → select (store id in ref + setState).
- **Left click** on second circle while one selected:
  - if centers within `(r1+r2)*1.5` → force-merge respecting normal merge math
  - else → clear selection
- **Right click** on selected circle → split. `preventDefault` on contextmenu.
- Click empty space → deselect.

## Debug Panel

Glass-morphism card, top-right, collapsible (chevron toggles a `collapsed` state).

Sliders (shadcn `Slider`):
- G (attraction): 0 – 0.5, step 0.005, default 0.05
- Damping: 0.95 – 1.0, step 0.001, default 0.999
- Merge threshold: 20 – 200, step 1, default 60
- Spawn rate (sec): 3 – 30, step 1, default 15

Readouts: FPS, circle count. Button: **Reset** (re-seeds 8–12 circles).

## Visual / Theme

Add to `src/styles.css`:
- `--orbis-bg: oklch(0.13 0.02 200)` (~#080d12)
- `--orbis-bg-2: oklch(0.18 0.025 200)` (~#0d1a1f)
- `--orbis-accent: oklch(0.7 0.12 175)` (teal)
- `--orbis-surface: color-mix(in oklab, var(--orbis-bg) 80%, transparent)`
- `--orbis-hairline: oklch(1 0 0 / 0.06)`

`BackgroundAura`: fixed inset-0, behind canvas (`z-index: -1`):
- radial-gradient vignette
- 2–3 absolutely-positioned blurred divs (huge blur, low opacity) with CSS `@keyframes` slow drift (60–90s) and hue-rotate
- SVG noise turbulence overlay at 5% opacity

Font: load DM Sans via existing index html or fall back to `system-ui` (use system-ui to avoid new deps).

No sharp corners — `rounded-2xl`/`rounded-3xl` on the panel.

## Notable details / non-goals for Phase 1

- O(n²) is fine; expected n stays under ~50.
- Use `devicePixelRatio` scaling so the glow looks crisp on retina.
- Resize listener re-sizes canvas; circles clamped on resize.
- No enemies, no scoring, no audio — Phase 2 territory. The desaturated red is registered in the palette module but unused.
- No external physics or animation libs added. shadcn `Slider`, `Button`, `Card` only.

## Verification

After build I'll check the preview console for runtime errors and confirm: canvas fills viewport, circles spawn and drift, panel sliders mutate live behavior, merge flash visible, right-click splits.
