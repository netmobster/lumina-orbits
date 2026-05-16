import { Circle, radiusOf } from "./types";

export function render(
  ctx: CanvasRenderingContext2D,
  circles: Circle[],
  selectedId: number | null,
  w: number,
  h: number,
  now: number,
  opts: { showVectors?: boolean; showTrails?: boolean } = {},
  trailOpacity: number = 100,
  glowSoftness: number = 3.2,
  tailFadeRate: number = 1.5,
) {
  // transparent canvas — background aura shows through
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  // trails (under everything)
  if (opts.showTrails !== false) {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const userMul = trailOpacity / 100; // slider as multiplier
    for (const c of circles) {
      if (c.trail.length < 2) continue;
      const speed = Math.hypot(c.vx, c.vy);
      const speedFactor = Math.min(1, speed / 60); // 0..1
      // visible portion of stored trail scales with speed
      const portion = 0.2 + speedFactor * 0.8;
      const visible = Math.max(2, Math.floor(c.trail.length * portion));
      const start = c.trail.length - visible;
      // head alpha cap ~30% at top speed, ~9% when nearly still
      const headAlpha = 0.30 * (0.3 + speedFactor * 0.7) * userMul;
      const r = radiusOf(c.mass);
      const coreMaxWidth = Math.max(0.8, r * 0.55);

      for (let i = start + 1; i < c.trail.length; i++) {
        const local = (i - start) / visible; // 0 (tail) → 1 (head)
        const fade = Math.pow(local, tailFadeRate);
        const a = headAlpha * fade;
        if (a < 0.005) continue;
        const coreW = Math.max(0.6, coreMaxWidth * local);
        const glowW = coreW * glowSoftness;
        const x0 = c.trail[i - 1].x, y0 = c.trail[i - 1].y;
        const x1 = c.trail[i].x,     y1 = c.trail[i].y;
        // outer glow halo — wider, ~25% of core alpha
        ctx.strokeStyle = hexA(c.color.core, a * 0.25);
        ctx.lineWidth = glowW;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        // bright core on top
        ctx.strokeStyle = hexA(c.color.core, a);
        ctx.lineWidth = coreW;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
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
    for (const c of circles) {
      const r = radiusOf(c.mass);
      const speed = Math.hypot(c.vx, c.vy);

      if (speed < 0.5) {
        ctx.fillStyle = "rgba(120,255,220,0.55)";
        ctx.beginPath();
        ctx.arc(c.x, c.y, Math.min(2.5, r * 0.22), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      const nx = c.vx / speed;
      const ny = c.vy / speed;
      const minLen = r + 14;
      const rawLen = speed * 1.6;
      const len = Math.min(220, Math.max(minLen, rawLen));

      const sx = c.x + nx * r;
      const sy = c.y + ny * r;
      const ex = c.x + nx * len;
      const ey = c.y + ny * len;

      const k = Math.min(1, speed / 60);
      const alpha = 0.55 + k * 0.45;
      const lineWidth = 1.2 + k * 1.8;
      const ah = 5 + k * 5;
      const ang = Math.atan2(ey - sy, ex - sx);

      // dark backing stroke for legibility
      ctx.strokeStyle = "rgba(10,30,28,0.55)";
      ctx.lineWidth = lineWidth + 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // bright teal stroke
      ctx.strokeStyle = `rgba(120,255,220,${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // arrowhead (backed + bright)
      const p1x = ex - Math.cos(ang - 0.45) * ah;
      const p1y = ey - Math.sin(ang - 0.45) * ah;
      const p2x = ex - Math.cos(ang + 0.45) * ah;
      const p2y = ey - Math.sin(ang + 0.45) * ah;
      ctx.fillStyle = "rgba(10,30,28,0.55)";
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(120,255,220,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.closePath();
      ctx.fill();

      // center dot
      ctx.fillStyle = `rgba(120,255,220,${alpha})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.min(2.5, r * 0.22), 0, Math.PI * 2);
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