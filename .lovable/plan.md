# Tabbed debug panel

Replace the long scrolling list of sliders with 5 icon-only tabs at the top of the panel. Header (fps/count/speed) and Reset button stay; only the slider section is tabbed.

## Tab layout

5 equal-width buttons in a `grid-cols-5` row, icon-only (16px), active tab gets the accent border + color treatment already used by preset buttons. Tooltip via native `title` attribute so hover reveals the name.

| Tab | Icon (lucide) | Contains |
|---|---|---|
| TIME | `Clock` | Preset picker, pause/play + speed multipliers |
| PLANETS | `Orbit` | Attraction (G), Max force, Damping, Merge threshold, Spawn rate |
| BG | `Mountain` | Aura intensity, Ribbon drift |
| VISUALS | `Sparkles` | Trail length, Trail visibility, Glow softness, Tail fade rate, Motion trails toggle |
| XL | `Radiation` | Split randomness (and future experimental sliders) |

## Implementation

Single file: `src/components/orbis/DebugPanel.tsx`.

- Add `const [tab, setTab] = useState<"time"|"planets"|"bg"|"visuals"|"xl">("time")`.
- Render icon-only tab bar just below the collapsed header.
- Wrap each existing slider group in `{tab === "..." && (...)}` blocks — no logic changes, just regrouping the existing JSX.
- Keep Reset button + help text below the tab content, always visible.
- Active tab styling reuses preset button style (accent border + accent text).

No changes to types, sim, or canvas.

## Files touched

- `src/components/orbis/DebugPanel.tsx`
