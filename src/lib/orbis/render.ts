import { Circle } from "./types";

export function render(
  ctx: CanvasRenderingContext2D,
  circles: Circle[],
  selectedId: number | null,
  w: number,
  h: number,
  now: number,
  opts: { showTrails?: boolean; trailCtx?: CanvasRenderingContext2D | null; trailCanvas?: HTMLCanvasElement | null } = {},
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
    if (r < 3) {
      ctx.fillStyle = c.color.core;
    } else {
      const inner = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, r * 0.1, c.x, c.y, r);
      inner.addColorStop(0, c.color.core);
      inner.addColorStop(1, c.color.shadow);
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
  }
}

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}