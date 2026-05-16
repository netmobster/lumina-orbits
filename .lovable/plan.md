# Background polish — caustics, ribbon drift, brighter aura

## 1. `BackgroundAura.tsx` — add caustics, brighter ribbons, drift control

**Two new ribbons** (appended to existing 6):
- Ribbon 7: bright mint `#7be3c4`, 100vw × 18vh, top 35%, left 10%, depth 22
- Ribbon 8: pale seafoam `#a8e8d4`, 95vw × 14vh, top 60%, left 50%, depth 16

Each gets its own keyframe (`orbis-drift-7`, `orbis-drift-8`) with the same translate/rotate/scaleX pattern as the others.

**Intensity remap (1–10, default 5):**
- `baseOpacity = 0.025 * intensity` → 0.025 (at 1) to 0.25 (at 10), `~0.125` at default 5
- `blur = 40 + intensity * 6` → 46–100px

**Ribbon drift control:**
- New prop `driftSpeed: number` (1 = baseline). Each ribbon's `animation-duration` is `baseDuration / driftSpeed`, applied inline via the `animationDuration` style (the `@keyframes` definitions stay static; only durations scale).
- Range 0–5, default 1. At 0 the animation is paused (`animationPlayState: "paused"`).

**Caustics overlay:**
- New `<svg>` layer between ribbons and vignette, full-viewport, `mixBlendMode: "screen"`, `pointerEvents: "none"`.
- Uses `<feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="2">` feeding a `<feDisplacementMap>` over a faint teal-to-transparent radial gradient rect, producing organic flowing light patches.
- Animate `baseFrequency` via SMIL `<animate>` between `"0.010 0.018"` and `"0.016 0.026"` over ~14s for slow shimmer (SMIL works for SVG filter primitives).
- Opacity tied to intensity: `0.04 + intensity * 0.025` (so 0.065 at 1, ~0.29 at 10, ~0.165 at default 5).

## 2. `types.ts` — extend `SimConfig`

```ts
auraIntensity: number;  // 1–10, default 5
ribbonDrift: number;    // 0–5, default 1
```

Update `DEFAULT_CONFIG` accordingly. Presets untouched.

## 3. `DebugPanel.tsx` — sliders

- Update "Aura intensity" slider to `min={1} max={10} step={0.1}`, format `v.toFixed(1)`.
- Add new slider "Ribbon drift" `min={0} max={5} step={0.1}`, format `v.toFixed(1) + "×"`.

## 4. `OrbisCanvas.tsx` — pass new prop

Pass `intensity={configState.auraIntensity}` and `driftSpeed={configState.ribbonDrift}` to `<BackgroundAura />`.

## Technical notes

- Driving `animation-duration` per-element via inline `style` is reactive — React rewriting the style attribute restarts the animation seamlessly because the keyframes name is unchanged.
- `mixBlendMode: "screen"` on the caustics + ribbons stays additive over the dark `--orbis-bg`, so brightening intensity actually shows up. Vignette stays normal-blend on top so edges still feel deep.
- SMIL animation of `baseFrequency` is widely supported in Chromium/Safari/Firefox and avoids needing a JS animation loop for the caustics shimmer.
