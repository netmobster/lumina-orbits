import type { Circle } from "./types";
import { radiusOf } from "./types";

export type Enemy = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  targetId: number | null;
  attachedTo: number | null;
  attachAngle: number;
  drainAccum: number;
  /** short ring buffer of recent positions, used only while unattached */
  trail: { x: number; y: number }[];
  /** boss-only: pulse fire timer */
  pulseTimer?: number;
  isBoss?: boolean;
};

export type EnemyConfig = {
  enabled: boolean;
  waveRate: number;
  swarmSize: number;
  scoutSpeed: number;
  attachRate: number;
  drainRate: number;
  steerForce: number;
  convertThreshold: number;
  bossRate: number;
  infectionSpread: boolean;
};

export const DEFAULT_ENEMY_CONFIG: EnemyConfig = {
  enabled: false,
  waveRate: 20,
  swarmSize: 5,
  scoutSpeed: 1.0,
  attachRate: 1.0,
  drainRate: 1.0,
  steerForce: 0.5,
  convertThreshold: 0.2,
  bossRate: 5,
  infectionSpread: true,
};

let _enemyId = 1;
const nextEnemyId = () => _enemyId++;
const TRAIL_CAP = 8;

function edgePoint(w: number, h: number) {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * w, y: 10 };
  if (side === 1) return { x: w - 10, y: Math.random() * h };
  if (side === 2) return { x: Math.random() * w, y: h - 10 };
  return { x: 10, y: Math.random() * h };
}

export function spawnEnemyWave(w: number, h: number, swarmSize: number): Enemy[] {
  const origin = edgePoint(w, h);
  const out: Enemy[] = [];
  for (let i = 0; i < swarmSize; i++) {
    out.push({
      id: nextEnemyId(),
      x: origin.x + (Math.random() - 0.5) * 30,
      y: origin.y + (Math.random() - 0.5) * 30,
      vx: 0,
      vy: 0,
      mass: 1 + Math.random() * 2,
      targetId: null,
      attachedTo: null,
      attachAngle: 0,
      drainAccum: 0,
      trail: [],
    });
  }
  return out;
}

export function spawnBoss(w: number, h: number): Enemy {
  const origin = edgePoint(w, h);
  return {
    id: nextEnemyId(),
    x: origin.x,
    y: origin.y,
    vx: 0,
    vy: 0,
    mass: 15 + Math.random() * 10,
    targetId: null,
    attachedTo: null,
    attachAngle: 0,
    drainAccum: 0,
    trail: [],
    pulseTimer: 0,
    isBoss: true,
  };
}

function recomputeRadius(c: Circle) {
  c.radius = radiusOf(c.mass);
}

/**
 * Step enemies. Mutates circles' mass/infected flags directly.
 * Returns { enemies, converted, pulses } — pulses are { x, y, age } visual ripples.
 */
export function stepEnemies(
  enemies: Enemy[],
  circles: Circle[],
  cfg: EnemyConfig,
  dt: number,
  w: number,
  h: number,
  now: number,
  infectionPulseAccum: { t: number },
): { enemies: Enemy[]; pulses: { x: number; y: number; bornAt: number }[] } {
  const pulses: { x: number; y: number; bornAt: number }[] = [];
  const byId = new Map<number, Circle>();
  for (const c of circles) byId.set(c.id, c);

  // pick lowest-mass non-infected circle (fallback: nearest non-infected to enemy)
  const nonInfected = circles.filter((c) => !c.infected);
  const lowest = nonInfected.length
    ? nonInfected.reduce((a, b) => (a.mass <= b.mass ? a : b))
    : null;

  for (const e of enemies) {
    if (e.isBoss) {
      // boss orbits the biggest friendly; fires pulses
      const biggest = circles.length
        ? circles.reduce((a, b) => (a.mass >= b.mass ? a : b))
        : null;
      if (biggest) {
        const orbitR = biggest.radius * 2.5 + 30;
        const dx = e.x - biggest.x, dy = e.y - biggest.y;
        const d = Math.hypot(dx, dy) || 1;
        // tangential motion
        const tx = -dy / d, ty = dx / d;
        const targetX = biggest.x + (dx / d) * orbitR;
        const targetY = biggest.y + (dy / d) * orbitR;
        const speed = 35;
        e.vx = tx * speed + (targetX - e.x) * 0.8;
        e.vy = ty * speed + (targetY - e.y) * 0.8;
        e.x += e.vx * dt;
        e.y += e.vy * dt;

        e.pulseTimer = (e.pulseTimer ?? 0) + dt;
        if (e.pulseTimer >= 3) {
          e.pulseTimer = 0;
          pulses.push({ x: e.x, y: e.y, bornAt: now });
          // drain up to 3 nearest friendlies inside radius 220
          const ranked = circles
            .map((c) => ({ c, d: Math.hypot(c.x - e.x, c.y - e.y) }))
            .filter((r) => r.d < 220)
            .sort((a, b) => a.d - b.d)
            .slice(0, 3);
          for (const { c } of ranked) {
            c.mass = Math.max(0.1, c.mass - cfg.drainRate * 3);
            recomputeRadius(c);
            checkConvert(c, cfg);
          }
        }
      }
      continue;
    }

    if (e.attachedTo != null) {
      const host = byId.get(e.attachedTo);
      if (!host || host.mass < 0.5) {
        // host vanished — detach
        e.attachedTo = null;
        e.targetId = null;
        e.trail.length = 0;
        continue;
      }
      // drift attach angle
      e.attachAngle += 0.4 * dt;
      e.x = host.x + Math.cos(e.attachAngle) * (host.radius + 2);
      e.y = host.y + Math.sin(e.attachAngle) * (host.radius + 2);
      // drain
      host.mass = Math.max(0.1, host.mass - cfg.drainRate * dt);
      recomputeRadius(host);
      // steer host toward another enemy or screen center
      const other = enemies.find(
        (x) => x !== e && !x.isBoss && x.attachedTo !== host.id,
      );
      const tx = other ? other.x : w / 2;
      const ty = other ? other.y : h / 2;
      const sdx = tx - host.x, sdy = ty - host.y;
      const sd = Math.hypot(sdx, sdy) || 1;
      host.vx += (sdx / sd) * cfg.steerForce * dt * 8;
      host.vy += (sdy / sd) * cfg.steerForce * dt * 8;
      checkConvert(host, cfg);
      continue;
    }

    // pick target — simple: lowest mass non-infected
    let target: Circle | null = lowest;
    if (!target && circles.length) {
      // fallback: nearest non-infected, else nearest anything
      let best: Circle | null = null;
      let bestD = Infinity;
      for (const c of circles) {
        if (c.infected) continue;
        const d = Math.hypot(c.x - e.x, c.y - e.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      target = best;
    }
    if (!target) { e.x += e.vx * dt; e.y += e.vy * dt; continue; }
    e.targetId = target.id;

    // move at scoutSpeed * 60 px/s toward target
    const dx = target.x - e.x, dy = target.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = cfg.scoutSpeed * 60;
    e.vx = (dx / d) * speed;
    e.vy = (dy / d) * speed;
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // record short trail
    e.trail.push({ x: e.x, y: e.y });
    if (e.trail.length > TRAIL_CAP) e.trail.shift();

    // latch check
    if (d < target.radius + 2) {
      // attach probability scaled by attachRate (always succeeds at rate >= 1)
      if (Math.random() < cfg.attachRate || cfg.attachRate >= 1) {
        e.attachedTo = target.id;
        const adx = e.x - target.x, ady = e.y - target.y;
        e.attachAngle = Math.atan2(ady, adx);
        e.trail.length = 0;
      }
    }
  }

  // infection spread pulses
  if (cfg.infectionSpread) {
    infectionPulseAccum.t += dt;
    if (infectionPulseAccum.t >= 2) {
      infectionPulseAccum.t = 0;
      for (const c of circles) {
        if (!c.infected) continue;
        pulses.push({ x: c.x, y: c.y, bornAt: now });
        // retarget 1-2 nearest unattached non-boss scouts toward a non-infected neighbor
        const free = enemies
          .filter((e) => !e.isBoss && e.attachedTo == null)
          .map((e) => ({ e, d: Math.hypot(e.x - c.x, e.y - c.y) }))
          .filter((r) => r.d < 250)
          .sort((a, b) => a.d - b.d)
          .slice(0, 2);
        const neighbor = circles.find(
          (x) => !x.infected && x.id !== c.id,
        );
        if (!neighbor) continue;
        for (const { e } of free) e.targetId = neighbor.id;
      }
    }
  }

  return { enemies, pulses };
}

function checkConvert(c: Circle, cfg: EnemyConfig) {
  if (c.infected) return;
  const original = c.originalMass ?? c.mass;
  if (c.mass / original < cfg.convertThreshold) {
    c.infected = true;
    c.infectionFlashUntil = performance.now() + 350;
    c.flashUntil = performance.now() + 350;
  }
}

/** Total friendly (non-infected) mass for game-over checks. */
export function totalFriendlyMass(circles: Circle[]): number {
  let s = 0;
  for (const c of circles) if (!c.infected) s += c.mass;
  return s;
}

/** Count attached scouts on a given host id — used by renderer for spike intensity. */
export function attachedCountMap(enemies: Enemy[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const e of enemies) {
    if (e.attachedTo != null) m.set(e.attachedTo, (m.get(e.attachedTo) ?? 0) + 1);
  }
  return m;
}