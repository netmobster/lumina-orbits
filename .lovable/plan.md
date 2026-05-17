# Randomized SFX envelopes

Each trigger picks a fresh slice and applies a fade-in / sustain / fade-out envelope so the clips never sound the same twice.

## Per-trigger parameters

For every event, roll once:

- **Start offset**: `random(0, max(0, duration - playLen))`. If a file ends up shorter than 60s, the offset is clamped to what fits. We will not exceed 60s either way: `maxOffset = min(60, duration - playLen)`.
- **Play length**: `3 + random() * 2` seconds (3.0 – 5.0s).
- **Fade-in**: 2.0s linear from 0 → target.
- **Sustain**: `playLen - 2.0 - 0.5` seconds at target (so 0.5s – 2.5s of full-volume body).
- **Fade-out**: 0.5s linear from target → 0, then `pause()` + reset.

Total audible time per trigger = `playLen` (3 – 5s).

Note: with playLen as low as 3.0s, fade-in (2s) + fade-out (0.5s) only leaves 0.5s sustain. That's fine for atmospheric tones — they'll feel like soft swells. If it feels too bell-curvy I can bump min playLen to 3.5s later.

## Volume math

Each voice tracks its own envelope value `env ∈ [0, 1]` plus a duck multiplier `duckMul ∈ {1.0, 0.8}` (still using the existing max-2-voices rule — older voice ducks to 80% when a second one starts).

```
audio.volume = (muted ? 0 : sliderVolume * MAX_VOLUME) * env * duckMul
```

A single `requestAnimationFrame` loop in `SfxControl` walks all 6 voices (3 types × 2 voices), computes `env` from the elapsed time vs. the voice's timestamps, and writes `audio.volume`. When `env` reaches 0 after the fade-out, the loop calls `audio.pause()` and marks the voice idle.

The slider/mute live-update effect stays — it just changes the `target` factor that the rAF loop multiplies in, so an in-progress fade keeps its shape.

## Stacking rule (unchanged)

- 1 voice playing → start the other on top, duck the first to 80%.
- 2 voices playing → restart the older voice's slice (new random offset + envelope), keep the newer one ducked at 80%.
- Per-type 60ms cooldown stays as belt-and-suspenders against frame-rate spam.

## File-duration handling

`audio.duration` is `NaN` until metadata loads. Set `audio.preload = "auto"` (already done) and read duration lazily inside `trigger()` — if it's still `NaN` on the very first call, fall back to a 30s assumed duration for that one trigger.

## Files touched

Only `src/components/orbis/SfxControl.tsx`. No changes to event emitters, sim code, or UI chrome.
