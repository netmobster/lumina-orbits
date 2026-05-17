## Super Merge + buffs to Supernova / Black Hole / G-Pulse

### Re: "is this what Coalesce already does?"
No. **Coalesce** currently just lowers the merge threshold for small-vs-small pairs (mass < 5) for 6s — it nudges dust to clump *on contact*. It does **not** reach out and pull same-size bodies together. So Super Merge is genuinely a new agent. Worth keeping both.

---

### 1. New chaos agent: **Fusion Cascade** (Super Merge)

Science-y name beats "Super Merge". Alt picks: *Resonance Cascade*, *Roche Collapse*. I'd go **Fusion Cascade**.

**Behavior:** one-shot scan over all bodies. For each body A, find all other bodies B where:
- `|massA - massB| / max(massA, massB) ≤ 0.20` (within ±20% mass)
- `distance(A, B) ≤ 2 × radiusOf(A)` (your "1 AU = diameter" → center-to-center ≤ diameter)
- Neither already consumed this tick
- Skip infected bodies (consistent with singularity)

Group them greedily (largest first claims its neighbors), then merge each group via repeated `mergeCircles` calls so the existing 2% mass loss, color blending, momentum conservation, and `orbis:sfx:merge` event all fire naturally. Push one `"shatter"` pulse at each group's centroid for visual feedback (reuse existing pulse kind — no new render code needed).

**Why it'll feel good:** as you said, on a crowded board it should clear ~10% of bodies in one beat and leave behind a handful of fat new ones — instant "the colony just had a generation jump" moment. On a sparse board it'll mostly no-op, which is fine.

**Wiring:**
- `src/lib/orbis/sim.ts` — new exported `fusionCascade(circles): Circle[]`.
- `src/components/orbis/OrbisCanvas.tsx` — `case "fusion":` calls it; add to `AUTO_CHAOS_POOL` with weight 2; add to safety-valve and reset paths if needed (it's stateless, so no timer ref).
- `src/components/orbis/DebugPanel.tsx` — add button (icon: `Combine` or `GitMerge` from lucide), add `"fusion"` to the random-pick `all` array.

### 2. Dial up Supernova / Black Hole / G-Pulse by 30%

- **Supernova** (`triggerSupernova` in `sim.ts`): fragment count `6–10 → 8–13`, eject speed `120 + rand*80 → 156 + rand*104`. Mass retained stays 95%.
- **Black Hole** (OrbisCanvas line 565): duration `3s → 3.9s`, attractor mass `800 → 1040`.
- **G-Pulse** (OrbisCanvas line 207 + 568): duration `2s → 2.6s`, gravity multiplier `5× → 6.5×`.

### Risks / non-goals
- Fusion Cascade is O(n²) for the pair scan — fine at n ≤ ~200. No spatial index needed.
- No new sounds, no new pulse kinds, no UI beyond the one button. No config sliders for Fusion (keep it punchy and parameterless like Supernova).
- Cooldown handling is automatic — DebugPanel already starts a 5s cooldown on click and on auto-fire via the `orbis:chaos-cooldown` event.

### Files touched
- `src/lib/orbis/sim.ts` (new `fusionCascade`, tweak `triggerSupernova`)
- `src/components/orbis/OrbisCanvas.tsx` (new case, pool entry, black-hole + pulse numbers)
- `src/components/orbis/DebugPanel.tsx` (new button, add to random pool)
