# Radioactive tab: smarter targeting + faster spawn ceiling

## What changes for the user

- Each scout now picks its **own** target using a score that combines circle mass and distance, so a fresh wave fans out across multiple friendlies instead of dogpiling whichever circle is smallest globally.
- **Wave rate** slider goes faster: minimum drops from `5 s` → `1.5 s` (max stays `60 s`). That's the ~3× higher spawn rate. Default stays `20 s`.
- The five sliders the message calls out — **Enemies on/off, Wave rate, Swarm size, Drain rate, Convert threshold** — already exist in the Radioactive tab and are already wired to `enemyConfigRef` in `OrbisCanvas`, so they take effect every frame. I'll do a quick live-verification pass and fix anything that turns out to be one-shot (e.g. `waveAccRef` not clamping when you shorten wave rate mid-run).

## Files changed

- `src/lib/orbis/enemies.ts`
  - Replace the single global `lowest` pick with **per-enemy target scoring**:
    ```text
    score(c) = c.mass + PROX_WEIGHT * distance(e, c)
    ```
    with `PROX_WEIGHT ≈ 0.05` (tunable constant — small circles still preferred, but a nearby medium circle beats a faraway tiny one). Picked only from non-infected; fallback unchanged.
  - Targets are recomputed each frame for unattached scouts, so as one circle gets crowded its growing distance from later arrivals naturally pushes them elsewhere.
- `src/components/orbis/DebugPanel.tsx`
  - Wave rate slider `min={5}` → `min={1.5}`, `step={1}` → `step={0.5}`. Hint text updated to reflect new range. Display format kept (`.toFixed(1) + "s"` if currently `.0`, otherwise `.1`).
- `src/components/orbis/OrbisCanvas.tsx`
  - In the wave-spawn block, clamp `waveAccRef.current` to at most `ecfg.waveRate` whenever the config changes (or simply each frame: `if (waveAccRef.current > ecfg.waveRate) waveAccRef.current = ecfg.waveRate`). This makes shortening wave rate mid-run feel instant instead of waiting out the old interval.

## Out of scope

- No new sliders (the listed five are already present).
- No changes to attached-scout behavior, boss logic, infection spread, or render.
- No new keyboard shortcuts.
