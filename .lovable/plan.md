## SFX: 5-voice layered pool with gentle per-voice ducking

### Goal
Replace the 2-voice rotation per sound type with a 5-voice pool. Each new trigger ducks every other currently-playing voice in that pool by 10% (multiplicative), so after 5 rapid collisions you hear five slightly-quieter overlapping layers instead of a hard cut.

### File
`src/components/orbis/SfxControl.tsx` only — no other files touched.

### Changes

1. **Constants**
   - `POOL_SIZE = 5` (was 2).
   - `DUCK_STEP = 0.9` — multiplier applied per new layer (was a one-shot `DUCK_RATIO = 0.8`).
   - `MIN_DUCK = 0.4` — floor so the oldest voice never disappears entirely.

2. **Pool shape**
   - `Pool.voices: Voice[]` (length 5) instead of a fixed tuple.
   - Drop the binary "older vs newer" logic in `trigger()`.

3. **Trigger logic** (rewrite of the `trigger(key)` body)
   - Find a free voice (`fadeOutUntil === 0`). If none, steal the oldest by `startedAt`.
   - Before starting it, walk every *other* voice in the pool that is still playing and multiply its `duckMul` by `DUCK_STEP`, clamped to `MIN_DUCK`.
   - Start the new voice with `duckMul = 1` and the existing envelope (fade-in 2s, sustain, fade-out 0.5s).
   - When a voice finishes (existing block in the rAF tick), reset its `duckMul = 1` as today.

4. **Volume math** — unchanged.
   `audio.volume = target * envelope * duckMul` already handles arbitrary `duckMul` values, so no rAF changes needed.

5. **Keep as-is**
   - `MIN_INTERVAL_MS` rate limit (60ms) — still prevents rAF-frame machine-gunning.
   - Random offset, fade envelope, mute toggle, slider, event names — all unchanged.

### Behavior after change
- 1 collision: one voice at full envelope, no ducking.
- 5 rapid collisions: voices at duckMul ≈ `0.9⁴, 0.9³, 0.9², 0.9, 1.0` → `0.66, 0.73, 0.81, 0.90, 1.00`. Airy, layered, no harsh stacking.
- 6th rapid collision: steals the oldest, all five layers get one more `×0.9` (floored at 0.4).

### Risks / non-goals
- More simultaneous `HTMLAudioElement` playback per type (5 instead of 2). Cheap — browsers handle dozens. No Web Audio refactor.
- No change to merge vs collision vs attach event semantics.
- No new UI.
