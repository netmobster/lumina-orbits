import { Circle, radiusOf } from "./types";

export function render(
  ctx: CanvasRenderingContext2D,
  circles: Circle[],
  selectedId: number | null,
  w: number,
  h: number,
  now: number,
  opts: { showVectors?: boolean; showTrails?: boolean } = {},
) {
  // transparent canvas — background aura shows through
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  // trails (under everything)
  if (opts.showTrails !== false) {
    ctx.globalCompositeOperation = "lighter";
    for (const c of circles) {
      if (c.trail.length < 2) continue;
      ctx.lineCap = "round";
      for (let i = 1; i < c.trail.length; i++) {
        const t = i / c.trail.length;
        const a = 0.04 + t * 0.18;
        ctx.strokeStyle = hexA(c.color.core, a);
        ctx.lineWidth = Math.max(0.5, radiusOf(c.mass) * 0.35 * t);
        ctx.beginPath();
        ctx.moveTo(c.trail[i - 1].x, c.trail[i - 1].y);
        ctx.lineTo(c.trail[i].x, c.trail[i].y);
        ctx.stroke();
      }
    }
  }

  // sticky arcs (under bodies)
  ctx.globalCompositeOperation = "lighter";
  const drawn = new Set<string>();
  for (const c of circles) {
    for (const otherId of c.stickyWith) {
      const key = c.id < otherId ? `${c.id}-${otherId}` : `${otherId}-${c.id}`;
      if (drawn.has(key)) continue;
      drawn.add(key);
      const o = circles.find((x) => x.id === otherId);
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
    const r = radiusOf(c.mass);
    const glowR = r * 1.9;
    const alpha = Math.min(0.28, 0.15 + r / 200);
    const grad = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, glowR);
    grad.addColorStop(0, hexA(c.color.core, alpha));
    grad.addColorStop(0.5, hexA(c.color.shadow, alpha * 0.5));
    grad.addColorStop(1, hexA(c.color.shadow, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // solid disc on top
  ctx.globalCompositeOperation = "source-over";
  for (const c of circles) {
    const r = radiusOf(c.mass);
    const inner = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, r * 0.1, c.x, c.y, r);
    inner.addColorStop(0, c.color.core);
    inner.addColorStop(1, c.color.shadow);
    ctx.fillStyle = inner;
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

  // velocity vectors overlay
  if (opts.showVectors) {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(120,255,220,0.85)";
    ctx.fillStyle = "rgba(120,255,220,0.85)";
    ctx.lineWidth = 1;
    for (const c of circles) {
      const r = radiusOf(c.mass);
      const scale = 0.6;
      const ex = c.x + c.vx * scale;
      const ey = c.y + c.vy * scale;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      const len = Math.hypot(ex - c.x, ey - c.y);
      if (len > 4) {
        const ang = Math.atan2(ey - c.y, ex - c.x);
        const ah = 4;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - Math.cos(ang - 0.4) * ah, ey - Math.sin(ang - 0.4) * ah);
        ctx.lineTo(ex - Math.cos(ang + 0.4) * ah, ey - Math.sin(ang + 0.4) * ah);
        ctx.closePath();
        ctx.fill();
      }
      // small center dot
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.min(2, r * 0.2), 0, Math.PI * 2);
      ctx.fill();
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