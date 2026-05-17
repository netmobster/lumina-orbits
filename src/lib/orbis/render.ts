import { Circle, type Pulse } from "./types";
import type { Enemy } from "./enemies";
import { attachedCountMap } from "./enemies";

export function render(
  ctx: CanvasRenderingContext2D,
  circles: Circle[],
  selectedId: number | null,
  w: number,
  h: number,
  now: number,
  opts: {
    showTrails?: boolean;
    trailCtx?: CanvasRenderingContext2D | null;
    trailCanvas?: HTMLCanvasElement | null;
    enemies?: Enemy[];
    pulses?: Pulse[];
    /** Active singularity marker (charging or sucking). */
    singularity?: { x: number; y: number; phase: "charge" | "suck"; progress: number } | null;
  } = {},
  trailOpacity: number = 100,
  glowSoftness: number = 3.2,
  tailFadeRate: number = 1.5,
  trailLength: number = 550,
) {
  // transparent canvas — background aura shows through
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  // ---- trails: persistent offscreen buffer ----
  const tctx = opts.trailCtx ?? null;
  const tcanvas = opts.trailCanvas ?? null;
  if (opts.showTrails !== false && tctx && tcanvas) {
    // 1. fade existing buffer — alpha derives from tailFadeRate and trailLength
    //    longer trail → slower fade; higher fade rate → faster fade
    const fadeAlpha = Math.min(
      0.25,
      Math.max(0.005, (tailFadeRate * 0.022) / Math.max(0.4, trailLength / 550)),
    );
    tctx.globalCompositeOperation = "destination-out";
    tctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    tctx.fillRect(0, 0, w, h);

    // 2. draw one segment per circle into the buffer
    tctx.globalCompositeOperation = "lighter";
    tctx.lineCap = "round";
    tctx.lineJoin = "round";
    const userMul = trailOpacity / 100;
    for (const c of circles) {
      const dx = c.x - c.px, dy = c.y - c.py;
      const segLen = Math.hypot(dx, dy);
      // skip teleport jumps (edge bounce / reset / split)
      if (segLen < 0.05 || segLen > 80) continue;
      const speed = Math.hypot(c.vx, c.vy);
      const speedFactor = Math.min(1, speed / 60);
      const headAlpha = 0.45 * (0.35 + speedFactor * 0.65) * userMul;
      if (headAlpha < 0.005) continue;
      const coreW = Math.max(0.8, c.radius * 0.55 * (0.5 + speedFactor * 0.5));
      const glowW = coreW * glowSoftness;
      const prefix = c.rgbPrefix;
      // outer halo
      tctx.strokeStyle = `rgba(${prefix},${headAlpha * 0.22})`;
      tctx.lineWidth = glowW;
      tctx.beginPath();
      tctx.moveTo(c.px, c.py);
      tctx.lineTo(c.x, c.y);
      tctx.stroke();
      // bright core
      tctx.strokeStyle = `rgba(${prefix},${headAlpha})`;
      tctx.lineWidth = coreW;
      tctx.beginPath();
      tctx.moveTo(c.px, c.py);
      tctx.lineTo(c.x, c.y);
      tctx.stroke();
    }

    // 3. blit buffer onto main canvas additively
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(tcanvas, 0, 0, w, h);
  }

  // sticky arcs (under bodies)
  ctx.globalCompositeOperation = "lighter";
  const drawn = new Set<string>();
  const byId = new Map<number, Circle>();
  for (const c of circles) byId.set(c.id, c);
  for (const c of circles) {
    for (const otherId of c.stickyWith) {
      const key = c.id < otherId ? `${c.id}-${otherId}` : `${otherId}-${c.id}`;
      if (drawn.has(key)) continue;
      drawn.add(key);
      const o = byId.get(otherId);
      if (!o) continue;
      const pulse = 0.15 + 0.1 * Math.sin(now / 400);
      ctx.strokeStyle = `rgba(180, 220, 220, ${pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(o.x, o.y);
      ctx.stroke();
    }
  }

  // glow + body
  for (const c of circles) {
    const r = c.radius;
    const glowR = r * 1.9;
    const alpha = Math.min(0.28, 0.15 + r / 200);
    if (r < 3) {
      ctx.fillStyle = `rgba(${c.rgbPrefix},${alpha})`;
    } else {
      const grad = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, glowR);
      grad.addColorStop(0, `rgba(${c.rgbPrefix},${alpha})`);
      grad.addColorStop(0.5, hexA(c.color.shadow, alpha * 0.5));
      grad.addColorStop(1, hexA(c.color.shadow, 0));
      ctx.fillStyle = grad;
    }
    ctx.beginPath();
    ctx.arc(c.x, c.y, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // solid disc on top
  ctx.globalCompositeOperation = "source-over";
  for (const c of circles) {
    const r = c.radius;
    // infected lerp toward deep red
    let coreColor = c.color.core;
    let shadowColor = c.color.shadow;
    if (c.infected) {
      const orig = c.originalMass ?? c.mass;
      const t = Math.min(1, Math.max(0, 1 - c.mass / orig));
      coreColor = lerpHex(c.color.core, "#6b1a1a", 0.4 + t * 0.6);
      shadowColor = lerpHex(c.color.shadow, "#3a0a0a", 0.5 + t * 0.5);
    }
    if (r < 3) {
      ctx.fillStyle = coreColor;
    } else {
      const inner = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, r * 0.1, c.x, c.y, r);
      inner.addColorStop(0, coreColor);
      inner.addColorStop(1, shadowColor);
      ctx.fillStyle = inner;
    }
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();

    if (c.flashUntil > now) {
      const t = (c.flashUntil - now) / 220;
      ctx.fillStyle = `rgba(255,255,255,${t * 0.9})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (selectedId === c.id) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // subtle red glow around infected circles
    if (c.infected) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(c.x, c.y, r * 0.5, c.x, c.y, r * 2.2);
      g.addColorStop(0, "rgba(180, 30, 30, 0.25)");
      g.addColorStop(1, "rgba(180, 30, 30, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---- enemies ----
  const enemies = opts.enemies ?? [];
  const pulses = opts.pulses ?? [];
  const singularity = opts.singularity ?? null;

  // ---- visual ring pulses (sim + enemy events) ----
  if (pulses.length) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of pulses) {
      const kind = p.kind ?? "infection";
      const ageMs = now - p.bornAt;
      if (kind === "infection") {
        const age = ageMs / 1000;
        if (age > 1.2) continue;
        const t = age / 1.2;
        const radius = 20 + t * 180;
        ctx.strokeStyle = `rgba(220, 60, 60, ${(1 - t) * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (kind === "shatter") {
        if (ageMs > 600) continue;
        const t = ageMs / 600;
        const radius = 10 + t * 110;
        // bright white core ring
        ctx.strokeStyle = `rgba(255, 240, 220, ${(1 - t) * 0.9})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        // outer orange echo
        ctx.strokeStyle = `rgba(255, 140, 60, ${(1 - t) * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 1.35, 0, Math.PI * 2);
        ctx.stroke();
      } else if (kind === "singularity-charge") {
        if (ageMs > 1500) continue;
        const t = ageMs / 1500;
        // shrinking inward ring
        const radius = 90 * (1 - t);
        ctx.strokeStyle = `rgba(220, 74, 74, ${0.4 + 0.4 * t})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (kind === "singularity-burst") {
        if (ageMs > 900) continue;
        const t = ageMs / 900;
        const radius = 15 + t * 320;
        ctx.strokeStyle = `rgba(240, 250, 255, ${(1 - t) * 0.95})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(120, 210, 255, ${(1 - t) * 0.55})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---- singularity body (charging dot or active black void) ----
  if (singularity) {
    const { x, y, phase, progress } = singularity;
    ctx.save();
    if (phase === "charge") {
      // dark inward-collapsing dot
      const r = 20 + progress * 6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(20, 0, 0, 0.95)");
      g.addColorStop(1, "rgba(20, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // pulsing red rim
      const rim = 0.5 + 0.5 * Math.sin(now / 80);
      ctx.strokeStyle = `rgba(220, 74, 74, ${0.6 * rim})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // suck phase — black hole core
      ctx.globalCompositeOperation = "source-over";
      const coreR = 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, coreR * 2.5);
      g.addColorStop(0, "rgba(0, 0, 0, 1)");
      g.addColorStop(0.55, "rgba(10, 0, 10, 0.7)");
      g.addColorStop(1, "rgba(10, 0, 10, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, coreR * 2.5, 0, Math.PI * 2);
      ctx.fill();
      // accretion ring
      ctx.globalCompositeOperation = "lighter";
      const rim = 0.7 + 0.3 * Math.sin(now / 60);
      ctx.strokeStyle = `rgba(255, 120, 220, ${0.55 * rim})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, coreR + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(120, 200, 255, ${0.35 * rim})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, coreR + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (enemies.length) {
    const byId = new Map<number, Circle>();
    for (const c of circles) byId.set(c.id, c);
    const attachCounts = attachedCountMap(enemies);

    // unattached scouts — sharp trail + 4-point star
    ctx.save();
    for (const e of enemies) {
      if (e.attachedTo != null) continue;
      // sharp short trail
      if (e.trail.length >= 2) {
        ctx.globalCompositeOperation = "source-over";
        ctx.lineCap = "butt";
        ctx.lineJoin = "miter";
        for (let i = 1; i < e.trail.length; i++) {
          const a = e.trail[i - 1];
          const b = e.trail[i];
          const alpha = (i / e.trail.length) * 0.85;
          ctx.strokeStyle = `rgba(255, 58, 58, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      drawScout(ctx, e.x, e.y, e.mass, !!e.isBoss);
    }
    ctx.restore();

    // attached spikes around host
    ctx.save();
    for (const e of enemies) {
      if (e.attachedTo == null) continue;
      const host = byId.get(e.attachedTo);
      if (!host) continue;
      const count = attachCounts.get(host.id) ?? 1;
      drawAttachedSpike(ctx, host.x, host.y, host.radius, e.attachAngle, count, now);
    }
    ctx.restore();
  }
}

function drawScout(ctx: CanvasRenderingContext2D, x: number, y: number, mass: number, isBoss: boolean) {
  const size = isBoss ? 14 + mass * 0.3 : 4 + mass * 0.8;
  // sickly green halo
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(26, 61, 10, 0.45)";
  ctx.beginPath();
  ctx.arc(x, y, size * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 4-point star
  ctx.save();
  ctx.fillStyle = isBoss ? "#a83232" : "#8b1a1a";
  ctx.strokeStyle = "#ff6060";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.35, y - size * 0.35);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.35, y + size * 0.35);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.35, y + size * 0.35);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - size * 0.35, y - size * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAttachedSpike(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  hr: number,
  angle: number,
  count: number,
  now: number,
) {
  const pulse = 0.7 + 0.3 * Math.sin(now / 180 + angle * 4);
  const len = 5 + Math.min(8, count) * 0.6;
  const baseX = hx + Math.cos(angle) * hr;
  const baseY = hy + Math.sin(angle) * hr;
  const tipX = hx + Math.cos(angle) * (hr + len);
  const tipY = hy + Math.sin(angle) * (hr + len);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);
  ctx.fillStyle = `rgba(139, 26, 26, ${0.8 * pulse})`;
  ctx.strokeStyle = `rgba(255, 80, 80, ${0.7 * pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(baseX + perpX * 2, baseY + perpY * 2);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(baseX - perpX * 2, baseY - perpY * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function lerpHex(a: string, b: string, t: number): string {
  const ah = a.replace("#", ""), bh = b.replace("#", "");
  const ar = parseInt(ah.slice(0, 2), 16), ag = parseInt(ah.slice(2, 4), 16), ab = parseInt(ah.slice(4, 6), 16);
  const br = parseInt(bh.slice(0, 2), 16), bg = parseInt(bh.slice(2, 4), 16), bb = parseInt(bh.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}