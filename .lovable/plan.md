# Why the background is invisible

`OrbisCanvas` paints an opaque `#080d12` fill every frame in `render.ts` (line 14–15). The canvas sits at `z-10` over `BackgroundAura` (`z-0`), so the ribbons render correctly but are completely covered. Fix the canvas, then layer on the new features.

## Changes

### 1. `src/lib/orbis/render.ts` — let the aura show through
- Replace the opaque base fill (`ctx.fillStyle = "#080d12"; ctx.fillRect(...)`) with `ctx.clearRect(0, 0, w, h)` so the canvas is transparent.
- Keep the page background dark via `--orbis-bg` on the `BackgroundAura` wrapper (already set) so there's no flash.

### 2. `src/components/orbis/BackgroundAura.tsx` — pointer-events, parallax, intensity
- Add `pointerEvents: "none"` on the root wrapper, the vignette div, and the SVG noise overlay so nothing intercepts clicks (the wrapper already has `pointer-events-none` via Tailwind, but make it explicit on children too as a safety net).
- Accept new props: `intensity: number` (0–1, default ~0.5) and `mouse: { x: number; y: number }` (normalized -0.5…0.5).
  - `intensity` scales each ribbon's `opacity` (base 0.06 → range 0.02 to 0.12) and `blur` radius (40px to 90px).
  - Each ribbon gets a per-ribbon parallax depth (e.g. 8px, 14px, 20px, 26px, 18px, 12px). The component composes the CSS keyframe animation with an inline `translate(...)` offset by wrapping each ribbon in an outer "parallax" div that gets `transform: translate3d(mouse.x * depth, mouse.y * depth, 0)` with `transition: transform 600ms ease-out`. The inner div keeps the existing `@keyframes orbis-drift-N` animation untouched.
- Mouse tracking lives in this component (single `pointermove` listener on `window`, throttled via `requestAnimationFrame`), so `OrbisCanvas` stays untouched.

### 3. `src/lib/orbis/types.ts` — extend `SimConfig`
- Add `auraIntensity: number` to `SimConfig` (default `0.5`, range 0–1). Keep it in `SimConfig` so it lives alongside the other tunables and persists with presets if we ever want it to.
- Leave presets unchanged (they don't need to override aura intensity).

### 4. `src/components/orbis/DebugPanel.tsx` — new slider
- Add a `Slider` row "Aura intensity" with `min={0} max={1} step={0.01}`, formatted `v.toFixed(2)`, wired to `config.auraIntensity` via the existing `onChange` handler.

### 5. `src/components/orbis/OrbisCanvas.tsx` — pass intensity through
- Pass `intensity={configState.auraIntensity}` to `<BackgroundAura />`.
- No mouse handling here — the aura owns it.

## Technical notes

- Canvas transparency: `clearRect` is sufficient because the body / aura wrapper already paints `--orbis-bg` (`#080d12`). The trails use `globalCompositeOperation = "lighter"`, which works correctly over a transparent canvas — additive blending is on the canvas pixels, not the page underneath.
- Parallax depth values are small (≤26px) and `ease-out` smoothed so the effect reads as "deep water" not "panning."
- The intensity slider remaps both opacity and blur because reducing only opacity makes ribbons feel sharp/digital; reducing blur in tandem keeps the soft bioluminescent feel at all levels.
- All ribbon overlays remain `mix-blend-mode: screen`; the vignette stays normal blend.
