## Goal

Currently the population cap correctly limits *object count* (220), but the merge ladder produces a flat mass distribution — peers fuse with peers, smallest pair up with smallest. Result: ~200 mid-mass bodies forever, no giants.

Target end-state after a long fast-forward: **a handful of giants (mass 200–1000+) surrounded by scattered small debris.** Bigger gravity wells → more chaos, exactly the theme you want.

Auto-split logic stays untouched. Single-body explicit chaos events (supernova, etc.) stay untouched.

## Changes (all in `src/lib/orbis/sim.ts`)

### 1. New helper: `accretionMerge(circles)`

Largest-first accretion pass:

- Sort bodies **largest → smallest**.
- For each giant (in order), find its **N nearest small neighbors** (where "small" = mass ≤ giant.mass × 0.4) within a generous reach (e.g. `giant.radius * 6`).
- Eat them all in one go via successive `mergeCircles` calls.
- Skip `infected` bodies (preserves enemy logic).
- Pushes a `"shatter"` pulse at the giant's position for visual feedback.

This is the new floor of the ladder — guaranteed population drop, *and* guaranteed mass concentration.

### 2. Rewire `enforcePopulationCap`'s ladder

New order (target still 50% of cap, max 4 passes, same bail-out guard):

```text
pass 1: accretionMerge          ← giants eat small neighbors (NEW, primary)
pass 2: fusionCascade strict    ← peer fusion for similar-sized clusters
pass 3: fusionCascade loose     ← wider peer fusion
pass 4: forcedNearestMerge      ← last-resort floor (kept as safety net)
```

Accretion runs first so growth concentrates into existing large bodies before peer-fusion creates new mid-tier bodies.

### 3. Reduce merge mass-loss for accretion

`mergeCircles` currently bakes in `* 0.98` (2% loss). Over hundreds of merges that's the difference between mass-300 giants and mass-50 mids.

Option: add an optional `efficiency` parameter to `mergeCircles` (default 0.98 to preserve current behaviour everywhere else), and call it with `1.0` (lossless) from `accretionMerge`. Peer fusion + organic collisions keep the 2% loss so total system mass still drifts down slowly — only directed accretion is lossless.

### 4. Tune `forcedNearestMerge` to bias accretion

Currently sorts smallest-first and pairs each with its nearest *anything*, so small+small is common. Change: when picking the partner for a small body, **prefer the nearest body with mass ≥ 2× the small body's mass** (falls back to plain nearest if none in range). This means even the safety-net floor feeds giants instead of producing new mids.

## Technical notes

- No changes to `OrbisCanvas.tsx`, render, or fast-forward loop. The cap-enforce call site stays per-iteration as previously discussed.
- No changes to auto-split (kept as-is per your answer).
- No changes to `splitRate` or `MAX_BODIES`.
- `infected` bodies remain untouched by all cap passes (enemy logic preserved).
- Pulse output continues to flow through `pulsesOut` so the existing visual feedback fires on cap events.

## Expected behaviour after change

- Short FF: subtle, similar to today.
- Long FF: population repeatedly approaches 220, accretion fires, count drops to ~110 but **the dropped mass concentrates into the existing largest bodies** instead of vanishing into mid-tier merges. Over multiple cap cycles, the top 3–8 bodies grow steadily into mass 200–1000+ giants while smaller debris keeps spawning and getting eaten.
- Auto-split still produces fresh small bodies when population dips below 80, maintaining baseline chaos and feedstock for giants.
