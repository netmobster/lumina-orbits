# Sound Effects feature

Mirror the existing `MusicControl` UI/UX with a second floating control for sound effects, then fire one-shot atmospheric clips on three sim events: **merge**, **object collision**, **baddie attach**.

Assets are already copied to `src/assets/sfx-merge.mp3`, `src/assets/sfx-collision.mp3`, `src/assets/sfx-attach.mp3`.

## 1. New component: `src/components/orbis/SfxControl.tsx`

Near-clone of `MusicControl.tsx` with these differences:

- Position: `fixed left-4 top-[64px]` (directly below the music button).
- Icon: lucide `AudioLines` (on) / `VolumeX` (muted). Tooltip "Sound effects (F) — NN%".
- **MAX_VOLUME = 0.20** (hard 20% cap of file volume).
- **DEFAULT_SLIDER = 0.30** (slider sits at "3" on a 0–10 feel → 30% of the 20% cap = ~6% real loudness).
- No autoplay / first-gesture logic — these only play on events. Drop the "started" pulse.
- Keyboard toggle: listens for `orbis:toggle-sfx` (added as `F` to the global handler).

### Stacking rule (max 2 per clip type)

For each of the 3 SFX types, keep a **pool of exactly 2 `HTMLAudioElement` instances** (preloaded clones of the same source). State per type: `{ a: Audio, b: Audio, lastUsed: "a" | "b" | null }`.

On an event:

1. If neither is currently playing → play the first one at full target volume.
2. If exactly one is playing → **duck that one to 80% of its current volume** and start the other on top at full target volume. (Two concurrent voices of the same clip, second one louder.)
3. If both are already playing → restart the **older** one (the one that started first) at full target volume, leave the newer one ducked at 80%. This caps concurrent voices at 2 forever, regardless of event rate.

Target volume per play = `muted ? 0 : sliderVolume * MAX_VOLUME`.

Different clip types can overlap each other freely (merge + attach at once stays atmospheric); the cap is per-type.

### Volume slider live-updates

When the slider moves or mute toggles, recompute target volume and apply to any currently-playing instances (preserving the 80% duck ratio on the older one).

### Event listeners

The component listens on `window` for:

- `orbis:sfx:merge`
- `orbis:sfx:collision`
- `orbis:sfx:attach`

Vertical slider hover UI: identical to `MusicControl`.

## 2. Event emission

No throttling in emitters — the 2-voice pool is the throttle.

### `src/lib/orbis/sim.ts`

- In `step()` (and `mergeCircles` if it's the single merge codepath), dispatch `window.dispatchEvent(new CustomEvent("orbis:sfx:merge"))` on every successful merge.
- On every elastic collision resolution that doesn't merge, dispatch `window.dispatchEvent(new CustomEvent("orbis:sfx:collision"))`.

Guard each with `typeof window !== "undefined"` for SSR safety.

### `src/lib/orbis/enemies.ts`

In `stepEnemies`, at the latch branch where `e.attachedTo = target.id` is assigned, dispatch `window.dispatchEvent(new CustomEvent("orbis:sfx:attach"))`.

## 3. Mount + shortcut

In `OrbisCanvas.tsx`:

- Render `<SfxControl />` right after `<MusicControl />`.
- Add `F` to the global key handler → `window.dispatchEvent(new CustomEvent("orbis:toggle-sfx"))`.

## 4. Help overlay

Add one line to the shortcuts list: **F** — toggle sound effects.

## Out of scope

- No per-event volume sliders.
- No persistence of mute/volume across reloads (matches music).
- Chaos agents, supernova, boss pulses — not wired in this pass.
