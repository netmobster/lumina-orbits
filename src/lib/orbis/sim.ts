import { blendColor, randomPaletteColor, rgbPrefixOf } from "./palette";
import { Circle, SimConfig, radiusOf, type Pulse } from "./types";

export type StepOpts = {
  /** Multiplier applied to G this frame (default 1). */
  gravityMultiplier?: number;
  /** Sign on G this frame (-1 = repulsive, default 1). */
  gravitySign?: number;
  /** Extra invisible attractor (e.g. transient black hole). */
  extraAttractor?: { x: number; y: number; mass: number } | null;
  /** While true, high-velocity crashes between big bodies shatter both. */
  shatterActive?: boolean;
  /** While true, small-vs-small pairs merge at half threshold. */
  coalesceActive?: boolean;
  /** Mutable sink for visual ring pulses pushed during the step. */
  pulsesOut?: Pulse[];
};

let _id = 1;
const nextId = () => _id++;

export function makeCircle(opts: Partial<Circle> & { mass: number; x: number; y: number }): Circle {
  const color = opts.color ?? randomPaletteColor();
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  return {
    id: opts.id ?? nextId(),
    x: opts.x,
    y: opts.y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    mass: opts.mass,
    color: { core: color.core, shadow: color.shadow },
    flashUntil: opts.flashUntil ?? 0,
    stickyWith: new Set<number>(),
    px: opts.x,
    py: opts.y,
    radius: radiusOf(opts.mass),
    rgbPrefix: rgbPrefixOf(color.core),
    originalMass: opts.mass,
    bornAt: opts.bornAt ?? now,
    mergeCount: opts.mergeCount ?? 0,
    lastMergeAt: opts.lastMergeAt ?? now,
  };
}

export function seedCircles(w: number, h: number, cfg: SimConfig): Circle[] {
  const n = 8 + Math.floor(Math.random() * 5);
  const out: Circle[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      makeCircle({
        x: 80 + Math.random() * (w - 160),
        y: 80 + Math.random() * (h - 160),
        vx: 0,
        vy: 0,
        mass: 3 + Math.random() * 55,
      }),
    );
  }
  // Give each circle velocity perpendicular to its direction from center
  const cx = w / 2, cy = h / 2;
  for (const c of out) {
    const dx = c.x - cx, dy = c.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const orbitalSpeed = Math.sqrt((cfg.G * 30 * 8) / dist) * 60;
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const dir = Math.random() > 0.5 ? 1 : -1;
    c.vx = perpX * orbitalSpeed * dir + (Math.random() - 0.5) * 5;
    c.vy = perpY * orbitalSpeed * dir + (Math.random() - 0.5) * 5;
  }
  return out;
}

export function spawnFromEdge(w: number, h: number): Circle {
  const side = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (side === 0) { x = Math.random() * w; y = 10; }
  else if (side === 1) { x = w - 10; y = Math.random() * h; }
  else if (side === 2) { x = Math.random() * w; y = h - 10; }
  else { x = 10; y = Math.random() * h; }
  const cx = w / 2, cy = h / 2;
  const dx = cx - x, dy = cy - y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 15 + Math.random() * 10;
  const jitter = 0.4;
  return makeCircle({
    x, y,
    vx: (dx / len) * speed + (Math.random() - 0.5) * speed * jitter,
    vy: (dy / len) * speed + (Math.random() - 0.5) * speed * jitter,
    mass: 5 + Math.random() * 7,
  });
}

const MIN_DIST = 4;

/** Build a uniform-grid broad-phase index for `circles`. */
function buildGrid(circles: Circle[]) {
  const n = circles.length;
  let maxR = 8;
  for (let i = 0; i < n; i++) if (circles[i].radius > maxR) maxR = circles[i].radius;
  const cell = Math.max(32, maxR * 4);
  const buckets = new Map<number, number[]>();
  const coords = new Int32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(circles[i].x / cell);
    const cy = Math.floor(circles[i].y / cell);
    coords[i * 2] = cx;
    coords[i * 2 + 1] = cy;
    const k = (cx * 73856093) ^ (cy * 19349663);
    let b = buckets.get(k);
    if (!b) { b = []; buckets.set(k, b); }
    b.push(i);
  }
  return { buckets, coords, cell };
}

export function step(
  circles: Circle[],
  cfg: SimConfig,
  dt: number,
  w: number,
  h: number,
  opts: StepOpts = {},
): Circle[] {
  const n = circles.length;
  const gMul = (opts.gravityMultiplier ?? 1) * (opts.gravitySign ?? 1);
  const Geff = cfg.G * gMul;

  // clear sticky markers each frame; re-discovered during collision pass
  for (let i = 0; i < n; i++) circles[i].stickyWith.clear();

  // broad-phase grid (shared by forces + collisions)
  const { buckets, coords } = buildGrid(circles);
  const visitPairs = (cb: (i: number, j: number) => void | boolean) => {
    for (let i = 0; i < n; i++) {
      const cx = coords[i * 2], cy = coords[i * 2 + 1];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const b = buckets.get(((cx + dx) * 73856093) ^ ((cy + dy) * 19349663));
          if (!b) continue;
          for (let k = 0; k < b.length; k++) {
            const j = b[k];
            if (j <= i) continue;
            if (cb(i, j) === false) break;
          }
        }
      }
    }
  };

  // forces
  visitPairs((i, j) => {
    const a = circles[i], b = circles[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d2 = Math.max(dx * dx + dy * dy, MIN_DIST * MIN_DIST);
    const d = Math.sqrt(d2);
    let f = (Geff * a.mass * b.mass) / d2;
    if (f > cfg.maxForce) f = cfg.maxForce;
    else if (f < -cfg.maxForce) f = -cfg.maxForce;
    const fx = (f * dx) / d;
    const fy = (f * dy) / d;
    a.vx += (fx / a.mass) * dt;
    a.vy += (fy / a.mass) * dt;
    b.vx -= (fx / b.mass) * dt;
    b.vy -= (fy / b.mass) * dt;
  });

  // extra attractor (e.g. black hole). Always attractive regardless of opts.gravitySign.
  if (opts.extraAttractor) {
    const att = opts.extraAttractor;
    const Gatt = cfg.G * (opts.gravityMultiplier ?? 1);
    for (let i = 0; i < n; i++) {
      const c = circles[i];
      const dx = att.x - c.x;
      const dy = att.y - c.y;
      const d2 = Math.max(dx * dx + dy * dy, MIN_DIST * MIN_DIST);
      const d = Math.sqrt(d2);
      let f = (Gatt * att.mass * c.mass) / d2;
      if (f > cfg.maxForce * 4) f = cfg.maxForce * 4;
      c.vx += ((f * dx) / d / c.mass) * dt;
      c.vy += ((f * dy) / d / c.mass) * dt;
    }
  }

  // integrate + damping + edges
  const dampPerFrame = Math.pow(cfg.damping, dt * 60);
  for (let i = 0; i < n; i++) {
    const c = circles[i];
    c.vx *= dampPerFrame;
    c.vy *= dampPerFrame;
    // soft random kick when nearly still — keeps things chaotic
    const speed = Math.hypot(c.vx, c.vy);
    if (speed < 2) {
      c.vx += (Math.random() - 0.5) * 8;
      c.vy += (Math.random() - 0.5) * 8;
    }
    // mass-based speed cap — big lumbers slow, small zips fast
    const maxSpeed = 80 / Math.sqrt(c.mass);
    const spd = Math.hypot(c.vx, c.vy);
    if (spd > maxSpeed) {
      c.vx = (c.vx / spd) * maxSpeed;
      c.vy = (c.vy / spd) * maxSpeed;
    }
    c.px = c.x;
    c.py = c.y;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    const r = c.radius;
    if (c.x < r) { c.x = r; c.vx = -c.vx * 0.7; }
    else if (c.x > w - r) { c.x = w - r; c.vx = -c.vx * 0.7; }
    if (c.y < r) { c.y = r; c.vy = -c.vy * 0.7; }
    else if (c.y > h - r) { c.y = h - r; c.vy = -c.vy * 0.7; }
  }

  // collisions
  const mergedIds = new Set<number>();
  const newCircles: Circle[] = [];
  const shatterActive = !!opts.shatterActive;
  const coalesceActive = !!opts.coalesceActive;
  const pulsesOut = opts.pulsesOut;
  // re-grid after integration moved bodies
  const grid2 = buildGrid(circles);
  const buckets2 = grid2.buckets;
  const coords2 = grid2.coords;
  for (let i = 0; i < n; i++) {
    const a = circles[i];
    if (mergedIds.has(a.id)) continue;
    const cx = coords2[i * 2], cy = coords2[i * 2 + 1];
    let consumed = false;
    for (let ddx = -1; ddx <= 1 && !consumed; ddx++) {
      for (let ddy = -1; ddy <= 1 && !consumed; ddy++) {
        const bucket = buckets2.get(((cx + ddx) * 73856093) ^ ((cy + ddy) * 19349663));
        if (!bucket) continue;
        for (let bi = 0; bi < bucket.length; bi++) {
          const j = bucket[bi];
          if (j <= i) continue;
          const b = circles[j];
          if (mergedIds.has(b.id)) continue;
          const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const ra = radiusOf(a.mass), rb = radiusOf(b.mass);
      if (d < ra + rb) {
        const larger = a.mass >= b.mass ? a : b;
        const smaller = larger === a ? b : a;
        const ratio = smaller.mass / larger.mass;
        if (ratio >= 0.6) {
          // sticky
          a.stickyWith.add(b.id);
          b.stickyWith.add(a.id);
          // positional resolution
          const overlap = (ra + rb - d);
          const nx = dx / d, ny = dy / d;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          // gentle damp on relative velocity so they clump
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
          a.vx += rvx * 0.05;
          a.vy += rvy * 0.05;
          b.vx -= rvx * 0.05;
          b.vy -= rvy * 0.05;
          const bothSmall = coalesceActive && a.mass < 5 && b.mass < 5;
          const effThreshold = bothSmall ? cfg.mergeThreshold * 0.5 : cfg.mergeThreshold;
          if (a.mass + b.mass >= effThreshold) {
            const merged = mergeCircles(a, b);
            mergedIds.add(a.id);
            mergedIds.add(b.id);
            newCircles.push(merged);
            consumed = true;
            break;
          }
        } else {
          // bounce
          const nx = dx / d, ny = dy / d;
          const overlap = (ra + rb - d);
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
          const velAlongNormal = rvx * nx + rvy * ny;
          if (velAlongNormal < 0) {
            // shatter on high-energy crash between two non-trivial bodies
            if (shatterActive && a.mass >= 8 && b.mass >= 8 && -velAlongNormal >= 60) {
              const frags = shatterCircle(a, 3).concat(shatterCircle(b, 3));
              mergedIds.add(a.id);
              mergedIds.add(b.id);
              for (const f of frags) newCircles.push(f);
              if (pulsesOut) {
                pulsesOut.push({
                  x: (a.x + b.x) / 2,
                  y: (a.y + b.y) / 2,
                  bornAt: performance.now(),
                  kind: "shatter",
                });
              }
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("orbis:sfx:collision"));
              }
              consumed = true;
              break;
            }
            const e = 0.6;
            const jImp = -(1 + e) * velAlongNormal / (1 / a.mass + 1 / b.mass);
            const ix = jImp * nx, iy = jImp * ny;
            a.vx -= ix / a.mass;
            a.vy -= iy / a.mass;
            b.vx += ix / b.mass;
            b.vy += iy / b.mass;
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("orbis:sfx:collision"));
            }
          }
        }
      }
        }
      }
    }
  }

  let result = mergedIds.size === 0
    ? circles
    : circles.filter((c) => !mergedIds.has(c.id)).concat(newCircles);

  // random auto-splits (splits per second)
  if (cfg.xlEnabled && cfg.splitRate > 0 && result.length < 80) {
    const p = cfg.splitRate * dt;
    if (Math.random() < p) {
      const candidates = result.filter((c) => c.mass > 6);
      if (candidates.length) {
        const victim = candidates[(Math.random() * candidates.length) | 0];
        const [a, b] = splitCircle(victim);
        result = result.filter((c) => c.id !== victim.id).concat([a, b]);
      }
    }
  }
  return result;
}

/** Break a circle into n outward-flung fragments. Conserves 98% of mass. */
export function shatterCircle(c: Circle, n: number): Circle[] {
  const totalMass = c.mass * 0.98;
  const m = totalMass / n;
  const r = radiusOf(m);
  const out: Circle[] = [];
  const baseAng = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const ang = baseAng + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const ox = Math.cos(ang) * (c.radius + r + 1);
    const oy = Math.sin(ang) * (c.radius + r + 1);
    const kick = 70 + Math.random() * 70;
    out.push(
      makeCircle({
        x: c.x + ox,
        y: c.y + oy,
        vx: c.vx * 0.4 + Math.cos(ang) * kick,
        vy: c.vy * 0.4 + Math.sin(ang) * kick,
        mass: m,
        color: c.color,
        flashUntil: performance.now() + 300,
      }),
    );
  }
  return out;
}

/** Eject fragments radially from a point — used by Singularity payoff. */
export function ejectFragments(
  x: number,
  y: number,
  totalMass: number,
  n: number,
  color?: { core: string; shadow: string },
): Circle[] {
  const m = Math.max(0.5, totalMass / n);
  const out: Circle[] = [];
  const baseAng = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const ang = baseAng + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const sp = 120 + Math.random() * 60;
    out.push(
      makeCircle({
        x: x + Math.cos(ang) * 10,
        y: y + Math.sin(ang) * 10,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        mass: m,
        color,
        flashUntil: performance.now() + 450,
      }),
    );
  }
  return out;
}

export function mergeCircles(a: Circle, b: Circle, efficiency = 0.98): Circle {
  const totalMass = a.mass + b.mass;
  const newMass = totalMass * efficiency; // default 2% energy loss; accretion uses 1.0
  const x = (a.x * a.mass + b.x * b.mass) / totalMass;
  const y = (a.y * a.mass + b.y * b.mass) / totalMass;
  // conserve momentum
  let vx = (a.vx * a.mass + b.vx * b.mass) / newMass;
  let vy = (a.vy * a.mass + b.vy * b.mass) / newMass;
  // small outward burst
  const burst = 5 + Math.random() * 10;
  const ang = Math.random() * Math.PI * 2;
  vx += Math.cos(ang) * burst;
  vy += Math.sin(ang) * burst;
  const color = blendColor(a.color, b.color, a.mass, b.mass);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("orbis:sfx:merge"));
  }
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  // lineage: inherit elder lineage (oldest birth) + deepest merge count + 1
  const bornAt = Math.min(a.bornAt ?? now, b.bornAt ?? now);
  const mergeCount = Math.max(a.mergeCount ?? 0, b.mergeCount ?? 0) + 1;
  return {
    id: nextId(),
    x, y, vx, vy,
    mass: newMass,
    color,
    flashUntil: performance.now() + 220,
    stickyWith: new Set<number>(),
    px: x,
    py: y,
    radius: radiusOf(newMass),
    rgbPrefix: rgbPrefixOf(color.core),
    originalMass: newMass,
    bornAt,
    mergeCount,
    lastMergeAt: now,
  };
}

export function splitCircle(c: Circle): [Circle, Circle] {
  const m = c.mass / 2;
  const r = radiusOf(m);
  const ang = Math.random() * Math.PI * 2;
  const ox = Math.cos(ang) * (r + 1);
  const oy = Math.sin(ang) * (r + 1);
  const kick = 40;
  const px = -Math.sin(ang) * kick;
  const py = Math.cos(ang) * kick;
  return [
    makeCircle({ x: c.x + ox, y: c.y + oy, vx: c.vx + px, vy: c.vy + py, mass: m, color: c.color, flashUntil: performance.now() + 180 }),
    makeCircle({ x: c.x - ox, y: c.y - oy, vx: c.vx - px, vy: c.vy - py, mass: m, color: c.color, flashUntil: performance.now() + 180 }),
  ];
}

export function findCircleAt(circles: Circle[], x: number, y: number): Circle | null {
  for (let i = circles.length - 1; i >= 0; i--) {
    const c = circles[i];
    const r = radiusOf(c.mass);
    if ((c.x - x) ** 2 + (c.y - y) ** 2 <= r * r * 1.4) return c;
  }
  return null;
}

/** Run sim forward by `seconds` of sim-time with fixed dt. No rendering. */
export function fastForward(
  circles: Circle[],
  cfg: SimConfig,
  seconds: number,
  w: number,
  h: number,
): Circle[] {
  const dt = 0.5;
  const iters = Math.round(seconds / dt);
  let cur = circles;
  let spawnAcc = 0;
  for (let i = 0; i < iters; i++) {
    cur = step(cur, cfg, dt, w, h);
    spawnAcc += dt;
    if (spawnAcc >= cfg.spawnRate) {
      spawnAcc = 0;
      cur = cur.concat(spawnFromEdge(w, h));
    }
  }
  return cur;
}

/** Delete the largest body and replace it with 6–10 outward fragments. */
export function triggerSupernova(circles: Circle[]): Circle[] {
  if (!circles.length) return circles;
  let big = circles[0];
  for (const c of circles) if (c.mass > big.mass) big = c;
  if (big.mass < 3) return circles;
  const n = 8 + Math.floor(Math.random() * 6);
  const fragMass = (big.mass * 0.95) / n;
  const out: Circle[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const r = radiusOf(fragMass) + 2;
    const sp = 156 + Math.random() * 104;
    out.push(
      makeCircle({
        x: big.x + Math.cos(ang) * r,
        y: big.y + Math.sin(ang) * r,
        vx: big.vx + Math.cos(ang) * sp,
        vy: big.vy + Math.sin(ang) * sp,
        mass: fragMass,
        color: big.color,
        flashUntil: performance.now() + 400,
      }),
    );
  }
  return circles.filter((c) => c.id !== big.id).concat(out);
}

/**
 * Fusion Cascade: scan for clusters of similarly-sized bodies within ~one
 * diameter of each other and merge each cluster into one body. Greedy from
 * largest outward. Pushes a "shatter" pulse at each group centroid.
 */
export function fusionCascade(
  circles: Circle[],
  pulsesOut?: Pulse[],
  opts: { massRatio?: number; reachMultiplier?: number } = {},
): Circle[] {
  if (circles.length < 2) return circles;
  const minRatio = opts.massRatio ?? 0.8;
  const reachMul = opts.reachMultiplier ?? 2;
  const sorted = [...circles].sort((a, b) => b.mass - a.mass);
  const consumed = new Set<number>();
  const newOnes: Circle[] = [];
  const now = performance.now();
  for (const a of sorted) {
    if (consumed.has(a.id)) continue;
    if (a.infected) continue;
    const reach = a.radius * reachMul;
    const reach2 = reach * reach;
    const group: Circle[] = [];
    for (const b of sorted) {
      if (b.id === a.id) continue;
      if (consumed.has(b.id)) continue;
      if (b.infected) continue;
      const ratio = Math.min(a.mass, b.mass) / Math.max(a.mass, b.mass);
      if (ratio < minRatio) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy > reach2) continue;
      group.push(b);
    }
    if (group.length === 0) continue;
    consumed.add(a.id);
    let merged = a;
    let cx = a.x * a.mass, cy = a.y * a.mass, mTot = a.mass;
    for (const b of group) {
      consumed.add(b.id);
      cx += b.x * b.mass; cy += b.y * b.mass; mTot += b.mass;
      merged = mergeCircles(merged, b);
    }
    newOnes.push(merged);
    if (pulsesOut) {
      pulsesOut.push({ x: cx / mTot, y: cy / mTot, bornAt: now, kind: "shatter" });
    }
  }
  if (consumed.size === 0) return circles;
  return circles.filter((c) => !consumed.has(c.id)).concat(newOnes);
}

/** Forced nearest-neighbor merge: smallest first, prefers a partner ≥2× its mass
 * (falls back to plain nearest). Guarantees population drops AND biases toward
 * feeding larger bodies instead of producing new mids. */
function forcedNearestMerge(circles: Circle[]): Circle[] {
  if (circles.length < 2) return circles;
  const sorted = [...circles].sort((a, b) => a.mass - b.mass);
  const consumed = new Set<number>();
  const newOnes: Circle[] = [];
  for (const a of sorted) {
    if (consumed.has(a.id)) continue;
    if (a.infected) continue;
    if (a.binaryWith != null) continue;
    let bestBig: Circle | null = null;
    let bestBigD2 = Infinity;
    let bestAny: Circle | null = null;
    let bestAnyD2 = Infinity;
    const bigThreshold = a.mass * 2;
    for (const b of sorted) {
      if (b.id === a.id) continue;
      if (consumed.has(b.id)) continue;
      if (b.infected) continue;
      if (b.binaryWith != null) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestAnyD2) { bestAnyD2 = d2; bestAny = b; }
      if (b.mass >= bigThreshold && d2 < bestBigD2) { bestBigD2 = d2; bestBig = b; }
    }
    const best = bestBig ?? bestAny;
    if (!best) continue;
    consumed.add(a.id);
    consumed.add(best.id);
    newOnes.push(mergeCircles(a, best));
  }
  if (consumed.size === 0) return circles;
  return circles.filter((c) => !consumed.has(c.id)).concat(newOnes);
}

/**
 * Accretion pass: largest bodies first eat their nearest small neighbors.
 * Concentrates mass into giants instead of producing new mid-tier bodies.
 * Lossless merges (efficiency=1) so growth compounds across cap cycles.
 */
function accretionMerge(circles: Circle[], pulsesOut?: Pulse[]): Circle[] {
  if (circles.length < 2) return circles;
  const sorted = [...circles].sort((a, b) => b.mass - a.mass);
  const consumed = new Set<number>();
  const replaced = new Map<number, Circle>(); // giant.id -> grown giant
  const now = performance.now();
  for (const giantOrig of sorted) {
    if (consumed.has(giantOrig.id)) continue;
    if (giantOrig.infected) continue;
    if (giantOrig.binaryWith != null) continue;
    let giant = giantOrig;
    const smallCap = giant.mass * 0.4;
    const reach = giant.radius * 6;
    const reach2 = reach * reach;
    // gather candidates (small + nearby + not consumed)
    const candidates: { c: Circle; d2: number }[] = [];
    for (const b of sorted) {
      if (b.id === giantOrig.id) continue;
      if (consumed.has(b.id)) continue;
      if (b.infected) continue;
      if (b.binaryWith != null) continue;
      if (b.mass > smallCap) continue;
      const dx = b.x - giant.x, dy = b.y - giant.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > reach2) continue;
      candidates.push({ c: b, d2 });
    }
    if (candidates.length === 0) continue;
    candidates.sort((p, q) => p.d2 - q.d2);
    // eat up to N nearest small bodies
    const eatN = Math.min(candidates.length, 6);
    for (let i = 0; i < eatN; i++) {
      const prey = candidates[i].c;
      consumed.add(prey.id);
      giant = mergeCircles(giant, prey, 1.0); // lossless
    }
    consumed.add(giantOrig.id);
    replaced.set(giantOrig.id, giant);
    if (pulsesOut) {
      pulsesOut.push({ x: giant.x, y: giant.y, bornAt: now, kind: "shatter" });
    }
  }
  if (consumed.size === 0) return circles;
  const survivors = circles.filter((c) => !consumed.has(c.id));
  return survivors.concat([...replaced.values()]);
}

/**
 * Enforce a hard population cap by collapsing bodies into bigger ones.
 * Ladder: accretion → strict fusion → loose fusion → forced nearest merge.
 * Target: ≤ cap * 0.5. Up to 4 passes; aborts if no progress.
 */
export function enforcePopulationCap(
  circles: Circle[],
  cap: number,
  pulsesOut?: Pulse[],
): Circle[] {
  if (circles.length <= cap) return circles;
  const target = Math.floor(cap * 0.5);
  let cur = circles;
  for (let pass = 0; pass < 4 && cur.length > target; pass++) {
    const before = cur.length;
    // accretion: giants eat small neighbors (mass concentrates)
    cur = accretionMerge(cur, pulsesOut);
    if (cur.length <= target) break;
    // strict peer fusion
    cur = fusionCascade(cur, pulsesOut, { massRatio: 0.8, reachMultiplier: 2 });
    if (cur.length <= target) break;
    // loose peer fusion
    cur = fusionCascade(cur, pulsesOut, { massRatio: 0.5, reachMultiplier: 4 });
    if (cur.length <= target) break;
    // forced floor (now biased toward partners ≥2× small body's mass)
    cur = forcedNearestMerge(cur);
    if (cur.length >= before) break; // no progress, bail
  }
  return cur;
}

/** Spawn a single fast comet streaking across the canvas. */
export function spawnComet(w: number, h: number): Circle {
  const side = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (side === 0) { x = Math.random() * w; y = 10; }
  else if (side === 1) { x = w - 10; y = Math.random() * h; }
  else if (side === 2) { x = Math.random() * w; y = h - 10; }
  else { x = 10; y = Math.random() * h; }
  const tx = w / 2 + (Math.random() - 0.5) * w * 0.4;
  const ty = h / 2 + (Math.random() - 0.5) * h * 0.4;
  const dx = tx - x, dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 180 + Math.random() * 60;
  return makeCircle({
    x, y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    mass: 25 + Math.random() * 20,
    flashUntil: performance.now() + 400,
  });
}

/** Spawn one burst of small fast bodies (call multiple times for a storm). */
export function spawnAsteroidBurst(w: number, h: number, n: number): Circle[] {
  const out: Circle[] = [];
  for (let i = 0; i < n; i++) out.push(spawnFromEdge(w, h));
  // make them faster than default edge spawns
  for (const c of out) { c.vx *= 2.5; c.vy *= 2.5; c.mass = 2 + Math.random() * 3; c.radius = radiusOf(c.mass); }
  return out;
}