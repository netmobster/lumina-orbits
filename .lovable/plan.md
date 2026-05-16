# Add an enemy ("Radioactive") system to ORBIS

A separate entity type that hunts, latches, drains, and can convert friendly circles. Visually wrong on purpose — sharp shapes, sickly red/green, no gravity. Surfaced through a sixth debug panel tab.

## What the user sees

- A new **Radioactive** tab in the debug panel (sixth icon, sharp red-tinted star, slightly glowing). Keyboard shortcut **6** opens it. The existing Experimental tab keeps its current Radiation icon but gets a small star badge to distinguish it from the new tab.
- The tab is OFF by default. Toggling **Enemies ON** starts wave spawning.
- Scouts appear from random edges as small red 4-point stars and fly straight at the smallest friendly circle, ignoring gravity. In transit they leave a **short, sharp, bright-red trail (5–8 segments max)** — visibly more knife-like than the soft aquatic tails of friendlies. Once latched, the trail stops; the spike pulses on the host instead.
- On contact they latch on as spikes around the host circle, slowly draining its mass and nudging it around.
- If a circle is drained past the convert threshold, it flashes and turns infected red. With **infection spread** on, infected circles pulse and redirect nearby scouts toward neighbors.
- Every N waves (boss rate), a larger enemy spawns, orbits the biggest friendly circle, and fires drain pulses every 3 s instead of latching.
- If total friendly mass drops below 15% of starting mass → **"The system collapsed."** overlay with a Reset button.

## Files added

- `src/lib/orbis/enemies.ts` — `Enemy` and `EnemyConfig` types exactly as specified, plus `DEFAULT_ENEMY_CONFIG`, `spawnEnemyWave(w, h, swarmSize)`, `spawnBoss(w, h)`, and `stepEnemies(enemies, circles, cfg, dt, w, h)` that does target selection, pathfinding, latching, drain, steer, conversion, infection-spread pulses, and boss pulse fire. Returns updated enemies plus any newly-spawned scout (from infection pulses) and reports converted circle ids so the host loop can recolor them. Each `Enemy` also carries a tiny `trail: {x,y}[]` ring buffer (cap 8) populated only while unattached.

## Files changed

- `src/lib/orbis/types.ts`
  - Add `infected?: boolean`, `originalMass?: number`, `infectionFlashUntil?: number` to `Circle`.
  - No change to `SimConfig` — enemy state lives outside it.
- `src/lib/orbis/sim.ts`
  - `makeCircle` records `originalMass`.
  - Friendly circle–circle physics unchanged (enemies are **not** part of `step`).
- `src/lib/orbis/render.ts`
  - New helpers `drawScout` (sharp 4-point star, core `#8b1a1a`, screen-composited green `#1a3d0a` glow, plus a **short sharp trail**: stroke the scout's own 5–8 point ring buffer as straight segments with linearly fading alpha, color `#ff3a3a` — brighter and harder than attached/spike red, no blur halo), `drawAttachedSpike` (drawn radially at host's `attachAngle`, intensity scales with host's attached drain rate, dimmer/darker red than in-transit scouts), and `drawInfectionPulse` (expanding ripple ring).
  - Infected circles lerp body color toward `#6b1a1a` based on `mass / originalMass`.
  - Accepts new `enemies` arg; nothing changes when array is empty (preserves current visuals exactly).
  - Scout trails render on the main canvas (not the friendly trail buffer) so they fade fast and don't bleed into the aquatic glow pipeline.
- `src/components/orbis/OrbisCanvas.tsx`
  - `enemiesRef: Enemy[]`, `enemyConfigRef: EnemyConfig`, `enemyConfigState`, `waveAccRef`, `wavesFiredRef`, `startingMassRef`, `gameOver` state.
  - Main loop: tick `stepEnemies`, integrate wave spawning (`waveRate` seconds), boss every `bossRate` waves, and game-over check (`total friendly mass < 0.15 × startingMass`).
  - Reset clears enemies, recomputes `startingMass`, clears game-over.
  - Passes enemies + config into `render` and `DebugPanel`.
  - Adds a `GameOverOverlay` (centered, blood-tinted glass, "The system collapsed.", Reset button).
- `src/components/orbis/DebugPanel.tsx`
  - `Tab` adds `"radio"`; `tabs` array gets a 6th entry with a sharp star icon (`Star` from lucide) tinted red.
  - The existing `xl` tab keeps its `Radiation` icon but renders a small red star dot overlay so the two tabs are visually distinct, addressing the "existing XL tab gets a new star icon" note.
  - Keyboard shortcut map extended to `1–6`.
  - New props `enemyConfig`, `onEnemyChange`.
  - When `tab === "radio"`, the panel wrapper switches to `background: rgba(60, 8, 8, 0.75)`, a red border accent, and an inline override `--orbis-accent: #d94a4a` so all sliders/toggles inside that tab pick up red without touching other tabs.
  - Sliders inside `radio` tab (all with `hint` text):
    - Enemies on/off toggle (default OFF)
    - Wave rate 5–60 s, step 1, default 20
    - Swarm size 1–20, step 1, default 5
    - Scout speed 0.1–5, step 0.1, default 1.0
    - Attach rate 0.1–3, step 0.1, default 1.0
    - Drain rate 0.1–5, step 0.1, default 1.0
    - Steer force 0–2, step 0.1, default 0.5
    - Convert threshold 5–90 %, step 5, default 20
    - Boss rate 0–10, step 1, default 5 (0 disables)
    - Infection spread toggle (default ON)
  - Help overlay updated to mention "6 — Radioactive" and the new game-over reset.

## Technical notes (for me to keep straight)

- **Enemies are not in `step()`** — no G, no `maxForce`, no damping, no merge. They have their own pure-intent integrator in `enemies.ts`.
- **Target selection (kept simple)**: pick the friendly circle with the lowest `mass` that is not yet infected. No look-ahead about who's already being drained — over-engineering would cause scouts to ignore obviously dying circles. Falls back to nearest non-infected if every circle is infected.
- Attached scouts store `attachAngle` and drift it by ~0.4 rad/s. Position = `host.x + cos(angle)*(host.radius+2)`.
- In-transit scouts push the current position onto an 8-entry ring buffer each frame; the buffer is cleared on latch so the trail snaps off cleanly.
- Conversion sets `circle.infected = true`, sets `flashUntil = now + 350`, and color lerps in renderer using `mass/originalMass`. Once infected, the circle stops being a valid target and counts as enemy territory; for `infectionSpread`, every ~2 s it emits a pulse that retargets the nearest 1–2 unattached scouts to a non-infected neighbor.
- Boss: mass 15–25, orbits biggest friendly at radius `bigR * 2.5`, every 3 s emits a drain pulse that subtracts `drainRate * 3` from up to 3 nearest friendlies inside a radius.
- All enemy-driven mass changes call a small `recomputeRadius(c)` (since `radius` is cached on `Circle`).
- Game-over halts the loop's `step` and `stepEnemies` calls but keeps rendering, so the final frame stays visible behind the overlay.

## Out of scope

- No new music/SFX.
- No mass-conservation accounting from drain (drained mass simply disappears, matching the spec).
- No persistence of enemy state across resets.
