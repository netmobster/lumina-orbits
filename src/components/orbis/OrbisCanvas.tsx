import { useEffect, useRef, useState } from "react";
import { DebugPanel } from "./DebugPanel";
import { BackgroundAura } from "./BackgroundAura";
import { LoadingOrb } from "./LoadingOrb";
import { findCircleAt, seedCircles, spawnFromEdge, splitCircle, step, mergeCircles } from "@/lib/orbis/sim";
import { render } from "@/lib/orbis/render";
import { DEFAULT_CONFIG, PRESETS, type Circle, type Preset, type SimConfig } from "@/lib/orbis/types";

export function OrbisCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const circlesRef = useRef<Circle[]>([]);
  const configRef = useRef<SimConfig>({ ...DEFAULT_CONFIG, ...PRESETS.orbit });
  const selectedRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const spawnAccRef = useRef(0);
  const speedRef = useRef(1);
  const showTrailsRef = useRef(true);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [configState, setConfigState] = useState<SimConfig>({ ...DEFAULT_CONFIG, ...PRESETS.orbit });
  const [activePreset, setActivePreset] = useState<Preset | null>("orbit");
  const [fps, setFps] = useState(0);
  const [count, setCount] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showTrails, setShowTrails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [, force] = useState(0);

  // setup
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 1200);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // offscreen trail buffer
    const trailCanvas = document.createElement("canvas");
    const trailCtx = trailCanvas.getContext("2d")!;
    trailCanvasRef.current = trailCanvas;
    trailCtxRef.current = trailCtx;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      trailCanvas.width = w * dpr;
      trailCanvas.height = h * dpr;
      trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      trailCtx.clearRect(0, 0, w, h);
      // clamp circles
      for (const c of circlesRef.current) {
        c.x = Math.min(Math.max(c.x, 10), w - 10);
        c.y = Math.min(Math.max(c.y, 10), h - 10);
        c.px = c.x;
        c.py = c.y;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    circlesRef.current = seedCircles(sizeRef.current.w, sizeRef.current.h, configRef.current);

    let raf = 0;
    let last = performance.now();
    let fpsAcc = 0, fpsFrames = 0, fpsTimer = 0;

    const loop = (now: number) => {
      const realDt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const dt = realDt * speedRef.current;

      // spawn
      spawnAccRef.current += realDt;
      if (spawnAccRef.current >= configRef.current.spawnRate) {
        spawnAccRef.current = 0;
        circlesRef.current = circlesRef.current.concat(
          spawnFromEdge(sizeRef.current.w, sizeRef.current.h),
        );
      }

      if (dt > 0) {
        circlesRef.current = step(circlesRef.current, configRef.current, dt, sizeRef.current.w, sizeRef.current.h);
      }
      render(
        ctx,
        circlesRef.current,
        selectedRef.current,
        sizeRef.current.w,
        sizeRef.current.h,
        now,
        { showTrails: showTrailsRef.current, trailCtx: trailCtxRef.current, trailCanvas: trailCanvasRef.current },
        configRef.current.trailOpacity,
        configRef.current.glowSoftness,
        configRef.current.tailFadeRate,
        configRef.current.trailLength,
      );

      // fps update ~4Hz
      fpsAcc += realDt; fpsFrames++; fpsTimer += realDt;
      if (fpsTimer >= 0.25) {
        setFps(Math.round(fpsFrames / fpsAcc));
        setCount(circlesRef.current.length);
        const cs = circlesRef.current;
        if (cs.length > 0) {
          let sum = 0;
          for (const c of cs) sum += Math.hypot(c.vx, c.vy);
          setAvgSpeed(sum / cs.length);
        } else {
          setAvgSpeed(0);
        }
        fpsAcc = 0; fpsFrames = 0; fpsTimer = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  // input
  useEffect(() => {
    const canvas = canvasRef.current!;
    const getXY = (e: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const { x, y } = getXY(e);
      const hit = findCircleAt(circlesRef.current, x, y);
      if (!hit) { selectedRef.current = null; force((v) => v + 1); return; }
      const sel = selectedRef.current;
      if (sel == null || sel === hit.id) {
        selectedRef.current = hit.id;
      } else {
        const a = circlesRef.current.find((c) => c.id === sel);
        if (a) {
          const dist = Math.hypot(a.x - hit.x, a.y - hit.y);
          const ra = Math.sqrt(a.mass) * 4;
          const rb = Math.sqrt(hit.mass) * 4;
          if (dist < (ra + rb) * 1.5) {
            const merged = mergeCircles(a, hit);
            circlesRef.current = circlesRef.current.filter((c) => c.id !== a.id && c.id !== hit.id).concat(merged);
            selectedRef.current = merged.id;
          } else {
            selectedRef.current = hit.id;
          }
        } else {
          selectedRef.current = hit.id;
        }
      }
      force((v) => v + 1);
    };

    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      const { x, y } = getXY(e);
      const hit = findCircleAt(circlesRef.current, x, y);
      const sel = selectedRef.current;
      if (hit && sel === hit.id && hit.mass >= 6) {
        const [a, b] = splitCircle(hit);
        circlesRef.current = circlesRef.current.filter((c) => c.id !== hit.id).concat(a, b);
        selectedRef.current = null;
        force((v) => v + 1);
      }
    };

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("contextmenu", onContext);
    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("contextmenu", onContext);
    };
  }, []);

  const handleChange = (patch: Partial<SimConfig>) => {
    configRef.current = { ...configRef.current, ...patch };
    setConfigState((s) => ({ ...s, ...patch }));
    setActivePreset(null);
  };

  const handleReset = () => {
    circlesRef.current = seedCircles(sizeRef.current.w, sizeRef.current.h, configRef.current);
    selectedRef.current = null;
    spawnAccRef.current = 0;
    const tctx = trailCtxRef.current;
    if (tctx) tctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h);
  };

  const handlePreset = (p: Preset) => {
    const { speed: presetSpeed, ...patch } = PRESETS[p];
    configRef.current = { ...configRef.current, ...patch };
    setConfigState((s) => ({ ...s, ...patch }));
    if (presetSpeed != null) {
      speedRef.current = presetSpeed;
      setSpeed(presetSpeed);
    }
    setActivePreset(p);
  };

  const handleSpeed = (s: number) => {
    speedRef.current = s;
    setSpeed(s);
  };

  // global keyboard shortcuts: Space pause, R reset, ? / H help, Esc close help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        const next = speedRef.current === 0 ? 1 : 0;
        speedRef.current = next;
        setSpeed(next);
      } else if (e.key === "r" || e.key === "R") {
        handleReset();
      } else if (e.key === "?" || e.key === "/" || e.key === "h" || e.key === "H") {
        setHelpOpen((v) => !v);
      } else if (e.key === "Escape") {
        setHelpOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleToggleTrails = (v: boolean) => {
    showTrailsRef.current = v;
    setShowTrails(v);
  };

  return (
    <>
      <BackgroundAura intensity={configState.auraIntensity} driftSpeed={configState.ribbonDrift} />
      <canvas ref={canvasRef} className="fixed inset-0 z-10 block cursor-crosshair" />
      <LoadingOrb visible={loading} />
      <DebugPanel
        config={configState}
        onChange={handleChange}
        fps={fps}
        count={count}
        avgSpeed={avgSpeed}
        onReset={handleReset}
        onPreset={handlePreset}
        activePreset={activePreset}
        speed={speed}
        onSpeed={handleSpeed}
        showTrails={showTrails}
        onToggleTrails={handleToggleTrails}
      />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <button
        onClick={() => setHelpOpen(true)}
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
        className="fixed bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border text-[13px] tabular-nums transition-colors hover:bg-white/5"
        style={{
          background: "var(--orbis-surface)",
          borderColor: "var(--orbis-hairline)",
          color: "var(--orbis-text-muted)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        ?
      </button>
    </>
  );
}

function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const rows: [string, string][] = [
    ["Space", "Pause / play simulation"],
    ["R", "Reset — reseed circles"],
    ["1 – 5", "Switch debug panel tab (Time, Planets, Background, Visuals, Experimental)"],
    ["? / H", "Toggle this help"],
    ["Esc", "Close help"],
    ["Click", "Select a circle"],
    ["Click + click", "Attempt merge with the selected circle"],
    ["Right-click", "Split the selected circle in two"],
  ];
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-6"
      style={{ background: "rgba(4, 14, 18, 0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border p-6 text-[13px]"
        style={{
          background: "var(--orbis-surface)",
          borderColor: "var(--orbis-hairline)",
          color: "var(--orbis-text)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--orbis-text-muted)" }}>
            Controls
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border px-2 py-0.5 text-[11px] uppercase tracking-wider transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--orbis-hairline)", color: "var(--orbis-text-muted)" }}
          >
            Esc
          </button>
        </div>
        <ul className="space-y-2">
          {rows.map(([key, desc]) => (
            <li key={key} className="flex items-start gap-3">
              <kbd
                className="shrink-0 rounded-md border px-2 py-0.5 text-[11px] tabular-nums"
                style={{
                  borderColor: "var(--orbis-hairline)",
                  color: "var(--orbis-accent)",
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  minWidth: "5.5rem",
                  textAlign: "center",
                }}
              >
                {key}
              </kbd>
              <span style={{ color: "var(--orbis-text-muted)" }}>{desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}