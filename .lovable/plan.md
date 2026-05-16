Chunk the 1-hour fast-forward so Chrome stops killing the tab.

## Changes

**`src/components/orbis/OrbisCanvas.tsx`** — Replace synchronous `handleFastForward` with a chunked version:
- 60 chunks × 60 iterations × `dt = 1.0` = 3600 sim-seconds total.
- Each chunk runs synchronously, then yields via `setTimeout(0)` before the next.
- Spawn timer accumulator is preserved across chunks.
- After each chunk, update `simTimeRef`, `elapsedSec`, `totalMass`, and a new `ffProgress` state (0–1).
- Final chunk clears the overlay.

**Overlay update** — show "Fast-forwarding 1 hour… NN%" using `ffProgress`.

**Drop** the now-unused `fastForward` helper import (keep the export in `sim.ts` for now — harmless).

No changes to types, enemies, render, or `DebugPanel`.