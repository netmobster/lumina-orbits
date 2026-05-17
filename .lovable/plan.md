## Player Mode — Scenario-driven minimal UI

When a scenario is active, the debug panel collapses into a player-friendly shell. All tuning tabs hide; only the scenario row, an Enemies toggle, and a Spawn-rate slider remain. Exit returns to the full debug UI.

### Changes (single file: `src/components/orbis/DebugPanel.tsx`)

1. **Detect player mode**
   - `const playerMode = activeScenarioId !== null;`

2. **Header tweak**
   - When `playerMode`, show the active scenario name in place of the FPS/count/speed stats (keep FPS small as a corner detail, or drop entirely). Keep collapse chevron.

3. **Hide everything below the Scenarios row when `playerMode`**
   - Skip the tab strip (`tabs.map(...)`).
   - Skip all `tab === "..."` content blocks.
   - Render a compact "Player controls" block instead:
     - `Toggle` — Enemies (`enemyConfig.enabled`)
     - `Slider` — Spawn rate (s) (`config.spawnRate`)
     - (Optional) `Slider` — Wave rate (s), only when enemies enabled
   - Keep a small muted hint line: "Scenario running — exit to access full controls."

4. **Scenarios row stays as-is** (already exists at top of panel body). Active pill + Exit button continue to work.

5. **No behavioral / state changes** — purely conditional render. Tabs state is preserved so exiting the scenario restores the previously selected tab.

### Out of scope
- No changes to `OrbisCanvas`, `sim.ts`, `scenarios.ts`, or any chaos-agent logic.
- No new files. No new props. No styling token changes.

### Visual sketch

```text
┌─ Orbis ──────────── Singularity Cycle ▾┐
│ [Singularity Cycle*] [Bullet Hell] [Slow Bloom] [Exit] │
│                                                        │
│ PLAYER CONTROLS                                        │
│ ◉ Enemies                                              │
│ Spawn rate (s)  ───●────────────  12                   │
│ Wave rate (s)   ──────●──────────  8                   │
│                                                        │
│ Scenario running — exit for full controls.             │
└────────────────────────────────────────────────────────┘
```
