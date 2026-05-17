import type { Circle } from "./types";

/**
 * Body archetypes. Drifter = young/small feedstock, Wanderer = fast disruptor,
 * Anchor = settled gravity well, Elder = long-lived deep-lineage body.
 * Elder overrides all others.
 */
export type Archetype = "drifter" | "wanderer" | "anchor" | "elder";

const DRIFTER_MAX_MASS = 8;
const WANDERER_MAX_MASS = 40;
const ANCHOR_MIN_MASS = 40;
const ANCHOR_MAX_SPEED = 8;
const ANCHOR_STILL_SECONDS = 10;
const ELDER_MIN_AGE_MS = 90_000;
const ELDER_MIN_MERGES = 4;

/**
 * Classify every body's archetype in-place. Cheap O(n) + one median pass.
 * Call every ~30 frames, not per frame.
 */
export function classifyArchetypes(circles: Circle[], dtSinceLastCall: number): void {
  const n = circles.length;
  if (n === 0) return;
  const now = performance.now();

  // median speed (for wanderer threshold)
  const speeds = new Float32Array(n);
  for (let i = 0; i < n; i++) speeds[i] = Math.hypot(circles[i].vx, circles[i].vy);
  const sorted = Array.from(speeds).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const wandererSpeedThresh = median * 1.5;

  for (const c of circles) {
    if (c.infected) { c.archetype = undefined; continue; }
    const speed = Math.hypot(c.vx, c.vy);

    // track time-still for anchor classification
    if (c.mass >= ANCHOR_MIN_MASS && speed < ANCHOR_MAX_SPEED) {
      c.stillSince = (c.stillSince ?? 0) + dtSinceLastCall;
    } else {
      c.stillSince = 0;
    }

    const age = now - (c.bornAt ?? now);
    const merges = c.mergeCount ?? 0;

    // elder overrides everything
    if (age >= ELDER_MIN_AGE_MS && merges >= ELDER_MIN_MERGES) {
      c.archetype = "elder";
      continue;
    }
    if (c.mass < DRIFTER_MAX_MASS) {
      c.archetype = "drifter";
      continue;
    }
    if (c.mass >= ANCHOR_MIN_MASS && (c.stillSince ?? 0) >= ANCHOR_STILL_SECONDS) {
      c.archetype = "anchor";
      continue;
    }
    if (c.mass < WANDERER_MAX_MASS && speed > wandererSpeedThresh) {
      c.archetype = "wanderer";
      continue;
    }
    c.archetype = undefined;
  }
}

/**
 * Binary partnership tracker. Two bodies in close, low-variance orbit for
 * BIND_SECONDS get mutually flagged. Bonded bodies are skipped by the
 * cap-enforcer and rendered with a shared halo.
 *
 * Internal state is held by the returned closure so the canvas owns one.
 */
const BIND_SECONDS = 20;
const BIND_RADIUS_MULT = 1.2; // within this much of sum-of-radii
const VARIANCE_TOLERANCE = 0.15;
const SAMPLE_WINDOW = 30; // samples we keep per pair

type PairKey = string;
type PairState = {
  samples: number[]; // recent distances
  firstSeen: number;
  lastSeen: number;
};

export type BinaryTracker = {
  step: (circles: Circle[], now: number) => { formed: { x: number; y: number }[] };
};

export function createBinaryTracker(): BinaryTracker {
  const pairs = new Map<PairKey, PairState>();

  const keyOf = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

  return {
    step(circles, now) {
      const byId = new Map<number, Circle>();
      for (const c of circles) byId.set(c.id, c);
      const formed: { x: number; y: number }[] = [];
      const seenThisFrame = new Set<PairKey>();

      // examine candidate pairs (near + similar mass, not infected, not already bonded to others)
      for (let i = 0; i < circles.length; i++) {
        const a = circles[i];
        if (a.infected) continue;
        for (let j = i + 1; j < circles.length; j++) {
          const b = circles[j];
          if (b.infected) continue;
          // skip if either already bonded to a different partner
          if (a.binaryWith != null && a.binaryWith !== b.id) continue;
          if (b.binaryWith != null && b.binaryWith !== a.id) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const sumR = a.radius + b.radius;
          if (d > sumR * BIND_RADIUS_MULT * 2) continue;
          // similar mass (within 3x)
          const ratio = Math.min(a.mass, b.mass) / Math.max(a.mass, b.mass);
          if (ratio < 0.33) continue;
          const k = keyOf(a.id, b.id);
          seenThisFrame.add(k);
          let st = pairs.get(k);
          if (!st) {
            st = { samples: [], firstSeen: now, lastSeen: now };
            pairs.set(k, st);
          }
          st.lastSeen = now;
          st.samples.push(d);
          if (st.samples.length > SAMPLE_WINDOW) st.samples.shift();

          // promote to binary if conditions met
          if (a.binaryWith == null && b.binaryWith == null) {
            if (
              now - st.firstSeen >= BIND_SECONDS * 1000 &&
              st.samples.length >= SAMPLE_WINDOW
            ) {
              const mean = st.samples.reduce((s, v) => s + v, 0) / st.samples.length;
              let varSum = 0;
              for (const v of st.samples) varSum += (v - mean) * (v - mean);
              const stddev = Math.sqrt(varSum / st.samples.length);
              const cv = mean > 0 ? stddev / mean : 1;
              if (cv < VARIANCE_TOLERANCE) {
                a.binaryWith = b.id;
                b.binaryWith = a.id;
                a.binarySince = now;
                b.binarySince = now;
                formed.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("orbis:sfx:merge"));
                }
              }
            }
          }
        }
      }

      // expire pair states we didn't see this frame (bodies merged / shattered)
      for (const [k, st] of pairs) {
        if (!seenThisFrame.has(k) && now - st.lastSeen > 1000) pairs.delete(k);
      }

      // dissolve binaries whose partner vanished
      for (const c of circles) {
        if (c.binaryWith != null && !byId.has(c.binaryWith)) {
          c.binaryWith = undefined;
          c.binarySince = undefined;
        }
      }

      return { formed };
    },
  };
}