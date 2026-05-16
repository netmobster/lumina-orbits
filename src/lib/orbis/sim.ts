import { blendColor, randomPaletteColor, rgbPrefixOf } from "./palette";
import { Circle, SimConfig, radiusOf } from "./types";

let _id = 1;
const nextId = () => _id++;

export function makeCircle(opts: Partial<Circle> & { mass: number; x: number; y: number }): Circle {
  const color = opts.color ?? randomPaletteColor();
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

export function step(circles: Circle[], cfg: SimConfig, dt: number, w: number, h: number): Circle[] {
  const n = circles.length;

  // clear sticky markers each frame; re-discovered during collision pass
  for (let i = 0; i < n; i++) circles[i].stickyWith.clear();

  // forces
  for (let i = 0; i < n; i++) {
    const a = circles[i];
    for (let j = i + 1; j < n; j++) {
      const b = circles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = Math.max(dx * dx + dy * dy, MIN_DIST * MIN_DIST);
      const d = Math.sqrt(d2);
      let f = (cfg.G * a.mass * b.mass) / d2;
      if (f > cfg.maxForce) f = cfg.maxForce;
      const fx = (f * dx) / d;
      const fy = (f * dy) / d;
      a.vx += (fx / a.mass) * dt;
      a.vy += (fy / a.mass) * dt;
      b.vx -= (fx / b.mass) * dt;
      b.vy -= (fy / b.mass) * dt;
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
  for (let i = 0; i < n; i++) {
    const a = circles[i];
    if (mergedIds.has(a.id)) continue;
    for (let j = i + 1; j < n; j++) {
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
          if (a.mass + b.mass >= cfg.mergeThreshold) {
            const merged = mergeCircles(a, b);
            mergedIds.add(a.id);
            mergedIds.add(b.id);
            newCircles.push(merged);
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
            const e = 0.6;
            const jImp = -(1 + e) * velAlongNormal / (1 / a.mass + 1 / b.mass);
            const ix = jImp * nx, iy = jImp * ny;
            a.vx -= ix / a.mass;
            a.vy -= iy / a.mass;
            b.vx += ix / b.mass;
            b.vy += iy / b.mass;
          }
        }
      }
    }
  }

  let result = mergedIds.size === 0
    ? circles
    : circles.filter((c) => !mergedIds.has(c.id)).concat(newCircles);

  // random auto-splits (splits per second)
  if (cfg.splitRate > 0 && result.length < 80) {
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

export function mergeCircles(a: Circle, b: Circle): Circle {
  const totalMass = a.mass + b.mass;
  const newMass = totalMass * 0.9; // 10% energy loss
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