# Three new chaos agents + scenario presets

Wire shatter, critical-mass collapse, and small-mass merge bonus into the chaos-agent grid, then add a "Scenario" preset row that bakes specific chaos behaviors in and hides the deep-settings panel.

## Part 1 — Three new chaos agents

All three follow the existing `onChaos(id)` pattern: a button in the radio tab, a 5s cooldown, dispatch handled in `OrbisCanvas.handleChaos`.

### Agent A — "Shatter" (`shatter`)

One-shot rule-flip lasting 4 seconds (sim time). While active, any collision between two bodies where:

- both mass ≥ 8, AND
- relative impact speed ≥ 60 px/s (the `velAlongNormal` we already compute)

…replaces the elastic-bounce branch with: split both bodies into 3 fragments each via a new `shatterCircle(c, n)` helper (same conserve-mass-minus-2% pattern as `splitCircle`, but n-way and with outward kicks), plus push a one-shot visual ring pulse at the impact midpoint.

State: new ref `shatterUntilRef` in `OrbisCanvas`; passed through `StepOpts.shatterActive: boolean` so `sim.step` knows to branch.

### Agent B — "Singularity" (`singularity`)

The collapse-and-eject cycle. On click:

1. Pick the most-massive friendly body. If its mass < 60, no-op (with a brief toast or just silently — TBD).
2. Mark a 1.5s sim-time "charging" phase (visual: that body pulses red on top of its normal flash, plus an inward shrinking ring).
3. Replace it with a transient invisible attractor at its position, reusing the existing `extraAttractor` pipeline. Sucks for 2.5s with `mass: absorbedMass * 1.5`.
4. Any body that comes within radius 30 during the suck phase is absorbed: removed from sim, mass added to a running `absorbed` total.
5. On expire, eject `N = clamp(round(absorbed / 8), 8, 24)` fragments radially, total mass `absorbed * 0.9` (10% loss), velocities 120–180 px/s outward, slight jitter. Plus a big white ring burst.

State: new ref `singularityRef = { x, y, absorbed, chargeUntil, suckUntil } | null` in `OrbisCanvas`. Resolved inside the loop each frame (charging → sucking → ejecting → cleared).

### Agent C — "Coalesce" (`coalesce`)

Small-mass merge bonus. 6-second sim-time window. While active, `sim.step` uses an effective merge threshold of `cfg.mergeThreshold * 0.5` for any pair where both bodies have mass < 5. Big bodies are unaffected.

State: new ref `coalesceUntilRef`; passed through `StepOpts.coalesceActive: boolean`.

### Burst visuals

Extend the existing `pulses` array (currently used for infection ripples) with a discriminated `kind: "infection" | "shatter" | "singularity-charge" | "singularity-burst"` and per-kind color/radius/duration in `render.ts`. No new render layer — the geometry-wars feel comes from:

- shatter pulse: white→orange ring, 600ms, expands fast
- singularity charge: inward-shrinking red ring, 1500ms
- singularity burst: white→cyan ring, 900ms, expands huge

Real fragments (the gameplay chunks) come from the actual `Circle` objects we already create — they get the existing `flashUntil` for the cheap glow flash on spawn.

### UI

Add three buttons to the chaos grid in `DebugPanel.tsx`:

```
{ id: "shatter",     label: "Shatter",     Icon: Sparkles }
{ id: "singularity", label: "Singularity", Icon: Orbit }
{ id: "coalesce",    label: "Coalesce",    Icon: Magnet }
```

Same cooldown system (5s) and disabled-state styling as the existing six. Grid stays 3 columns and just wraps to 3 rows.

## Part 2 — Scenario presets ("Player Mode")

A new top-level toggle and a strip of preset scenarios. When a scenario is active:

- The deep-settings tabs (Physics, Visual, Experimental) are **hidden**. Only the Spawning + Baddies + Chaos-Agent controls remain.
- The scenario auto-applies a `SimConfig` patch and an `EnemyConfig` patch.
- Optionally fires a sequence of chaos agents on a timer (declared in the scenario definition).

### Scenario shape

New file `src/lib/orbis/scenarios.ts`:

```ts
export type Scenario = {
  id: string;
  name: string;
  blurb: string;
  sim: Partial<SimConfig>;
  enemies: Partial<EnemyConfig>;
  /** Auto-fire chaos agents at these sim-time offsets (seconds). */
  script?: { at: number; agent: string }[];
};
```

Three starter scenarios:

- **"Singularity Cycle"** — high spawn rate, no enemies, script fires `singularity` every 60s. Watch the universe collapse and reform on a clock.
- **"Bullet Hell"** — enemies on, fast waves, shatter agent fires every 12s so any kinetic crash blows things apart. Boss every 3 waves.
- **"Slow Bloom"** — low gravity, coalesce fires every 20s, no enemies, no chaos beyond that. Meditative growth.

### Player Mode UI

In `DebugPanel.tsx`:

- New top row (above the tab strip) with a "Scenarios" pill toggle. When opened, shows a horizontal strip of scenario cards (name + 1-line blurb). Click one to activate; click again to deactivate.
- While a scenario is active, render only the radio tab (Chaos / Enemies). The tab strip itself collapses to just those tabs.
- A small "Exit scenario" link returns the full panel.

### Script runner

In `OrbisCanvas`, when a scenario activates: store `activeScenarioRef` and `scenarioStartSimTimeRef`. Each frame inside the loop, walk the script and fire any `{ at, agent }` whose `at` has been crossed since the last frame. This runs on sim-time, so pause/speed work correctly.

## Files touched

- `src/lib/orbis/sim.ts` — add `shatterCircle`, extend `StepOpts` with `shatterActive` and `coalesceActive`, branch in the collision pass.
- `src/lib/orbis/render.ts` — extend `pulses` with `kind`, render per-kind ring styles.
- `src/lib/orbis/scenarios.ts` — new file, the three starter scenarios.
- `src/components/orbis/OrbisCanvas.tsx` — refs for shatter/coalesce/singularity timers, handlers in `handleChaos`, scenario activation + script runner.
- `src/components/orbis/DebugPanel.tsx` — three new chaos buttons, scenarios row, conditional tab hiding.

## Out of scope

- No physics-affecting particles (visual rings only; real chunks are real `Circle`s).
- No persistence of scenario across reload.
- No "build your own scenario" UI — just the three hardcoded ones for now.

## Open questions

1. **Singularity threshold** — should it no-op below mass 60, or grab the biggest body regardless and just produce a tiny burst? I lean no-op with a tiny "needs mass" hint, but happy to make it always-fire.
2. **Player Mode trust** — when a scenario is active, should the chaos-agent buttons still be clickable by the player, or read-only / hidden so only the script controls them? My instinct: keep them clickable (player can amplify), but the script's auto-fires respect cooldowns so it can't double-trigger.
3. **Shatter min-velocity** — 60 px/s is a guess. If it feels stingy, I can drop to 40. Worth tuning after first playtest, not pre-deciding.
