# Make velocity vectors clearer

## Diagnosis

Vector length is `velocity * 0.6`. After damping, typical speeds settle around 3–10 (the velocity floor is 3), giving arrows of only ~2–6px — invisible behind the circle's glow. The arrow color and width are fixed regardless of speed, so faster bodies don't stand out either.

## Changes in `src/lib/orbis/render.ts`

1. **Longer arrows with a minimum length**
   - Replace `scale = 0.6` with `scale = 1.6`, and clamp output length to `max(minLen, …)` where `minLen = r + 14` (always pokes out past the body) and a cap of `220px` to keep huge bursts on-screen.
   - Anchor the arrow at the body's edge rather than its center: start at `(c.x + nx*r, c.y + ny*r)` where `(nx, ny)` is the velocity unit vector. The center dot stays at `(c.x, c.y)`.

2. **Speed-driven brightness and thickness**
   - Map speed to a normalized factor `k = clamp(speed / 60, 0, 1)`.
   - `alpha = 0.55 + k * 0.45` → always at least 0.55 (never fades to nothing while moving), brighter when fast.
   - `lineWidth = 1.2 + k * 1.8` (1.2–3px).
   - Arrowhead size scales similarly: `ah = 5 + k * 5`.
   - Stationary case (`speed < 0.5`): skip the line/arrow but still draw the center dot in dim teal so the body is marked.

3. **Subtle outer glow for legibility over bright circles**
   - Draw each vector twice: a wider, semi-transparent dark teal stroke underneath (`rgba(10,30,28,0.55)`, `lineWidth + 2`), then the bright stroke on top. Reads cleanly over any ribbon color.

4. **Keep composite mode `source-over`** (already correct) so vectors aren't washed out by `lighter` blending with the glow underneath.

## Notes

- No new props, no debug-panel changes needed — the toggle already exists.
- Color stays teal (`rgb(120,255,220)`) so it ties to the accent.
- The arrow now visibly grows/brightens with speed, so users can read momentum at a glance.
