# Background music with top-left volume control

## What the user sees

A small **volume icon** fixed at the top-left of the screen (mirroring the DebugPanel at top-right).

- **Click** the icon → toggle mute/unmute. Icon swaps between `Volume2` (playing) and `VolumeX` (muted).
- **Hover** the icon → a thin vertical slider slides out beside it for adjusting volume.
- The slider's **0–100% range maps to 0–30% actual audio volume** (user "100%" = HTMLAudio `volume = 0.30`).
- **Default slider value: 20%** (= actual volume `0.06`).
- The track **loops forever** — `audio.loop = true`. It keeps replaying seamlessly until the user mutes. Mute does not stop playback, it just sets volume to 0, so unmuting resumes instantly without a restart.
- Autoplay starts on the **first user interaction** anywhere on the page (browsers block silent autoplay). Until that first gesture, the icon shows a subtle pulse hint.

## Files

### Added
- `src/assets/geyserlight-sonar.mp3` — copied from `user-uploads://Geyserlight_Sonar.mp3`.
- `src/components/orbis/MusicControl.tsx`:
  - Owns one `HTMLAudioElement` (created in `useEffect`, `loop = true`, `preload = "auto"`, source imported from `@/assets/geyserlight-sonar.mp3`).
  - State: `muted` (default `false`), `sliderVolume` (0–1, default `0.2`), `hovering`.
  - Effective volume each render: `audio.volume = muted ? 0 : sliderVolume * 0.30`.
  - First-gesture autoplay: one-shot `window` listener on `pointerdown`/`keydown` that calls `audio.play()` (try/catch on the play promise) then removes itself.
  - Layout: `fixed left-4 top-4 z-20` container. Icon is a 36×36 round glass button matching the existing bottom-right reset button. On `group-hover`, a `h-24 w-9` panel fades in to the right with a vertical shadcn `Slider` (`orientation="vertical"`).
  - Tooltip: "Music (M)". Keyboard shortcut **M** toggles mute.

### Changed
- `src/components/orbis/OrbisCanvas.tsx`
  - Render `<MusicControl />` once alongside the existing fixed UI.
  - Add **M** to the global keydown handler — dispatches a `CustomEvent("orbis:toggle-music")` that `MusicControl` listens for, keeping audio ownership inside the component.
  - Extend the keyboard-shortcut help overlay to list **M — Mute / unmute music**.

## Out of scope

- No playlist, track selection, or crossfade.
- No persistence across reloads (volume resets to 20%, unmuted).
- No ducking on game-over.
- No changes to simulation or enemies.

## Technical notes

- Vite imports `mp3` as a URL string out of the box — no extra type shim required.
- The 30% hard cap lives in exactly one place (`MusicControl.tsx`); the slider UI never shows a number above 100%.
- Looping is handled by the browser via `audio.loop = true`, so there is no gap between iterations and no JS timer involved.
