## Vision

Three threads, woven into one phased rollout. Theme: **the sim is a living organism that doesn't need the player.** "Enemies" become its immune system, bodies age into characters, and time itself becomes a felt presence via seasons and a return-journal.

Phased so each phase ships standalone value.

---

## Phase 1 — Body roles & elder/binary emergence

Foundation: every later thread reads from these signals.

### Schema additions (`src/lib/orbis/types.ts`)

```ts
type Circle = {
  // ...existing
  bornAt: number;          // performance.now() at creation
  mergeCount: number;      // lineage depth
  lastMergeAt: number;     // for "stillness" decay
  binaryWith?: number;     // id of stable partner
  binarySince?: number;    // when partnership formed
  archetype?: 'drifter' | 'wanderer' | 'anchor' | 'elder';
}
```

Wire `bornAt`/`mergeCount` into `makeCircle` and `mergeCircles` (inherit max + 1).

### Archetype classifier (`src/lib/orbis/roles.ts`, new)

Runs every ~30 frames (cheap):
- **Drifter**: `mass < 8`
- **Wanderer**: `mass 8–40` AND `|v| > median velocity × 1.5`
- **Anchor**: `mass > 40` AND `|v| < 8` for ≥10s
- **Elder**: `age > 90s` AND `mergeCount ≥ 4` — overrides others

Returns map `id → archetype`. Cached on the circle.

### Binary detection

After integration step: pair scan among bodies within 1.2× sum-of-radii. If a pair maintains relative-distance variance < 15% for 20s, mark `binaryWith` mutually. Binaries:
- Render with a shared faint halo (uses average color).
- Cap-enforcer treats them as one unit (skip if either is in a binary; binaries dissolve only via explicit chaos).
- Emit a soft "binary formed" pulse + one-shot SFX.

### Visual treatment (`render.ts`)

- **Elder**: extra-soft outer glow ring (radius × 1.6, opacity 0.15), color = body color.
- **Anchor**: subtle dust accretion particles drifting inward (4 motes, very dim).
- **Binary**: shared halo ellipse around both bodies' centroid.
- **No HUD spam** — the visual *is* the indicator. Optional: small archetype glyph appears in the existing focus/inspect popover only.

---

## Phase 2 — Equilibrium machines (reframe enemies)

No new entities. Rename + retune existing behavior + state-driven spawning.

### Spawn triggers (replace timer-based waves)

In `OrbisCanvas` enemy loop, replace `waveRate` ticking with a state-driven check every ~2s:

- **Pruners** (current scouts): spawn iff `bodyCount < 30 AND avgMass > 25`. Target bodies where `mass > median × 2`.
- **Conductor** (current boss): spawn iff `top1.mass / median > 8`. Despawn (drift off-edge) when ratio normalizes.
- Cap simultaneous pruners at 6, max 1 conductor.

### Behavior tweaks

- **Pruner drain → recycle**: when drain finishes, instead of just shrinking the host, *emit* the drained mass as 2–3 fresh drifters at the host's edge. Mass is conserved (visible recycling).
- **Conductor pulse → redistribute**: pulse targets the single largest body, peels off 20% of its mass, ejects as drifters in a ring. No HP loss to the player.
- **Infected → seeder**: drop the "infected" framing. Renamed `seeding` state. Color shifts warmer (not corrupted). Periodically emits one drifter (every 4s) for up to 30s, then dissolves into 3–4 final drifters. Becomes a *bloom event*, not a death.

### Naming pass

Replace user-facing strings: "enemy" → "pruner", "boss" → "conductor", "infected" → "seeding". Internal types/files stay (cheaper churn). HUD/labels updated.

---

## Phase 3 — Idle, seasons, journal, lineage

### Seasons (`src/lib/orbis/seasons.ts`, new)

Cycle every ~10 min of cumulative play (persisted). Four seasons:

| Season   | Bias                                    | Palette shift     |
|----------|-----------------------------------------|-------------------|
| Bloom    | spawnRate ×2, autoChaos favors comet/storm | warm desaturated |
| Drift    | damping 0.9998, autoChaos rare          | cool muted        |
| Collapse | autoChaos favors fusion/singularity ×3  | deep contrast     |
| Bright   | rare supernova auto-fires               | high luminance    |

Tiny glyph in HUD corner. Smooth crossfade between seasons over 30s.

### Background-tab continuation

When `document.hidden`:
- Cancel rAF, switch to `setInterval(stepHeadless, 250)` running sim at ¼ speed.
- Track events into a ring buffer: `{ t, kind, detail }`.

On `visibilitychange → visible`:
- Resume rAF.
- If away > 60s, surface a single toast/card: *"While you were away — 12m: 3 fusions, 1 singularity, an elder emerged."*

### Lineage persistence

`localStorage` key `orbis:lineage`:
```ts
{ totalPlayMs, witnessed: { singularities, supernovae, eldersBorn, bindingsFormed }, season, seasonProgressMs }
```

Hydrate on mount, save every 30s + on visibility-hide. Surfaces in a small "since you started" line on the focus/inspect popover. No leaderboards, no comparisons — just a personal record.

### No-failure framing

Remove any "game over" pathway tied to `totalFriendlyMass`. If it reaches 0, fire an auto-bloom (seed 8 fresh drifters with the current season palette) and pulse the screen softly. Caption: *"the system rests."*

---

## Soundscape (Phase 2.5, optional)

Could be folded into Phase 2 if you want. Pre-generate 4 ElevenLabs Music stems (one per season, 60s loops). Crossfade based on active season. Drone bed only — keeps scope tight. The per-body voice idea is deferred (heavier scope).

---

## File map

- **New**: `src/lib/orbis/roles.ts`, `src/lib/orbis/seasons.ts`, `src/lib/orbis/lineage.ts`, `src/lib/orbis/journal.ts`
- **Edited**: `types.ts` (schema), `sim.ts` (binary detection, bornAt wiring), `enemies.ts` (state-driven spawn, recycle/redistribute), `render.ts` (elder/binary/anchor visuals), `OrbisCanvas.tsx` (background-tab loop, season application, lineage save), `StatsHUD.tsx` (season glyph), `MusicControl.tsx` (stem crossfade, if 2.5)

## Recommended order

1. **Phase 1** first — pure foundation, immediate visible payoff (elders, binaries), no behavior risk.
2. **Phase 2** next — biggest thematic shift, builds on Phase 1's archetype signals to pick pruner targets.
3. **Phase 3** last — needs Phase 1+2 stable to make the journal entries meaningful.

Each phase is ~one focused implementation pass. Phase 2.5 (sound) slots in wherever you want.
