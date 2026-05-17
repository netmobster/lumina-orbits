import { useEffect, useRef, useState } from "react";
import { DebugPanel } from "./DebugPanel";
import { MusicControl } from "./MusicControl";
import { SfxControl } from "./SfxControl";
import { BackgroundAura } from "./BackgroundAura";
import { LoadingOrb } from "./LoadingOrb";
import { StatsHUD } from "./StatsHUD";
import {
  findCircleAt, seedCircles, spawnFromEdge, splitCircle, step, mergeCircles, ejectFragments,
  triggerSupernova, spawnComet, spawnAsteroidBurst, fusionCascade,
  enforcePopulationCap,
} from "@/lib/orbis/sim";
import { render } from "@/lib/orbis/render";
import { DEFAULT_CONFIG, PRESETS, type Circle, type Preset, type Pulse, type SimConfig } from "@/lib/orbis/types";
import {
  DEFAULT_ENEMY_CONFIG,
  spawnEnemyWave,
  spawnBoss,
  stepEnemies,
  totalFriendlyMass,
  type Enemy,
  type EnemyConfig,
} from "@/lib/orbis/enemies";
import { SCENARIOS, type Scenario } from "@/lib/orbis/scenarios";

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
  const enemiesRef = useRef<Enemy[]>([]);
  const enemyConfigRef = useRef<EnemyConfig>({ ...DEFAULT_ENEMY_CONFIG });
  const waveAccRef = useRef(0);
  const wavesFiredRef = useRef(0);
  const startingMassRef = useRef(0);
  const infectionPulseAccRef = useRef({ t: 0 });
  const pulsesRef = useRef<Pulse[]>([]);
  const gameOverRef = useRef(false);
  const simTimeRef = useRef(0);
  // chaos agent effect timers (sim-time deadlines)
  const gravityPulseUntilRef = useRef(0);
  const inversionUntilRef = useRef(0);
  const blackHoleUntilRef = useRef(0);
  const blackHolePosRef = useRef<{ x: number; y: number } | null>(null);
  const shatterUntilRef = useRef(0);
  const coalesceUntilRef = useRef(0);
  // singularity state machine
  const singularityRef = useRef<{
    x: number;
    y: number;
    absorbed: number;
    color?: { core: string; shadow: string };
    phase: "charge" | "suck";
    chargeUntil: number;
    suckUntil: number;
  } | null>(null);
  // scenario script runner
  const activeScenarioRef = useRef<Scenario | null>(null);
  const scenarioStartSimTimeRef = useRef(0);
  const scenarioFiredRef = useRef<Set<number>>(new Set());
  const handleChaosRef = useRef<((id: string) => void) | null>(null);
  // random event generator — always on, fires a weighted-random agent every N sim seconds
  const nextAutoChaosAtRef = useRef(0);
  const AUTO_CHAOS_POOL: { id: string; weight: number }[] = [
    { id: "storm", weight: 3 },
    { id: "comet", weight: 3 },
    { id: "pulse", weight: 3 },
    { id: "shatter", weight: 3 },
    { id: "coalesce", weight: 3 },
    { id: "supernova", weight: 1 },
    { id: "blackhole", weight: 1 },
    { id: "fusion", weight: 2 },
    { id: "inversion", weight: 1 },
    { id: "singularity", weight: 1 },
  ];
  const SPAWN_AGENTS = new Set(["storm", "comet", "shatter"]);
  const COLLAPSE_AGENTS = new Set(["fusion", "singularity", "blackhole"]);
  const MAX_BODIES = 220;
  const pickAutoChaos = () => {
    const n = circlesRef.current.length;
    const crowded = n > MAX_BODIES * 0.85;
    const pool = AUTO_CHAOS_POOL.map((p) => {
      if (crowded && SPAWN_AGENTS.has(p.id)) return { ...p, weight: 0 };
      if (crowded && COLLAPSE_AGENTS.has(p.id)) return { ...p, weight: p.weight * 3 };
      return p;
    });
    const total = pool.reduce((s, p) => s + p.weight, 0);
    if (total <= 0) return "fusion";
    let r = Math.random() * total;
    for (const p of pool) {
      r -= p.weight;
      if (r <= 0) return p.id;
    }
    return pool[0].id;
  };

  const [configState, setConfigState] = useState<SimConfig>({ ...DEFAULT_CONFIG, ...PRESETS.orbit });
  const [enemyConfigState, setEnemyConfigState] = useState<EnemyConfig>({ ...DEFAULT_ENEMY_CONFIG });
  const [activePreset, setActivePreset] = useState<Preset | null>("orbit");
  const [fps, setFps] = useState(0);
  const [count, setCount] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showTrails, setShowTrails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [totalMass, setTotalMass] = useState(0);
  const [fastForwarding, setFastForwarding] = useState(false);
  const [ffProgress, setFfProgress] = useState(0);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
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
    startingMassRef.current = circlesRef.current.reduce((s, c) => s + c.mass, 0);

    let raf = 0;
    let last = performance.now();
    let fpsAcc = 0, fpsFrames = 0, fpsTimer = 0;

    const loop = (now: number) => {
      const realDt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      // base timeline runs 20% faster than wall-clock
      const dt = realDt * speedRef.current * 1.2;

      // spawn — ticks on SIM time so faster speeds = more spawns
      spawnAccRef.current += dt;
      if (spawnAccRef.current >= configRef.current.spawnRate) {
        spawnAccRef.current = 0;
        circlesRef.current = circlesRef.current.concat(
          spawnFromEdge(sizeRef.current.w, sizeRef.current.h),
        );
      }

      if (dt > 0 && !gameOverRef.current) {
        simTimeRef.current += dt;
        // random event generator — fire a weighted-random agent on sim-time cadence
        if (nextAutoChaosAtRef.current === 0) {
          nextAutoChaosAtRef.current = simTimeRef.current + configRef.current.autoChaosInterval;
        }
        if (simTimeRef.current >= nextAutoChaosAtRef.current) {
          const picked = pickAutoChaos();
          handleChaosRef.current?.(picked);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("orbis:chaos-cooldown", { detail: { id: picked } }));
          }
          const interval = configRef.current.autoChaosInterval;
          // ±20% jitter so it doesn't feel metronomic
          const jitter = (Math.random() * 0.4 - 0.2) * interval;
          nextAutoChaosAtRef.current = simTimeRef.current + interval + jitter;
        }
        // mass safety valve — runaway megabodies auto-collapse into a singularity
        if (!singularityRef.current) {
          for (const c of circlesRef.current) {
            if (!c.infected && c.mass >= 250) {
              handleChaosRef.current?.("singularity");
              break;
            }
          }
        }
        // scenario script — fire any step whose `at` has been crossed
        const sc = activeScenarioRef.current;
        if (sc?.script) {
          const elapsedScenario = simTimeRef.current - scenarioStartSimTimeRef.current;
          for (let i = 0; i < sc.script.length; i++) {
            const stp = sc.script[i];
            if (elapsedScenario >= stp.at && !scenarioFiredRef.current.has(i)) {
              scenarioFiredRef.current.add(i);
              handleChaosRef.current?.(stp.agent);
            }
          }
        }
        // resolve chaos-agent modifiers for this frame
        const t = simTimeRef.current;
        const gravityMul = t < gravityPulseUntilRef.current ? 6.5 : 1;
        const gravitySign = t < inversionUntilRef.current ? -1 : 1;
        // singularity suck-phase attractor takes precedence over the black-hole agent
        const sing = singularityRef.current;
        let extraAttractor: { x: number; y: number; mass: number } | null = null;
        if (sing && sing.phase === "suck" && t < sing.suckUntil) {
          extraAttractor = { x: sing.x, y: sing.y, mass: Math.max(300, sing.absorbed * 1.5) };
        } else if (t < blackHoleUntilRef.current && blackHolePosRef.current) {
          extraAttractor = { x: blackHolePosRef.current.x, y: blackHolePosRef.current.y, mass: 1040 };
        }
        circlesRef.current = step(
          circlesRef.current,
          configRef.current,
          dt,
          sizeRef.current.w,
          sizeRef.current.h,
          {
            gravityMultiplier: gravityMul,
            gravitySign,
            extraAttractor,
            shatterActive: t < shatterUntilRef.current,
            coalesceActive: t < coalesceUntilRef.current,
            pulsesOut: pulsesRef.current,
          },
        );
        if (circlesRef.current.length > MAX_BODIES) {
          circlesRef.current = enforcePopulationCap(
            circlesRef.current,
            MAX_BODIES,
            pulsesRef.current,
          );
        }

        // singularity progression
        if (sing) {
          if (sing.phase === "charge" && t >= sing.chargeUntil) {
            sing.phase = "suck";
            sing.suckUntil = t + 2.5;
          }
          if (sing.phase === "suck") {
            const sx = sing.x, sy = sing.y;
            const kept: Circle[] = [];
            for (const c of circlesRef.current) {
              const d = Math.hypot(c.x - sx, c.y - sy);
              if (d < 30) {
                sing.absorbed += c.mass;
              } else {
                kept.push(c);
              }
            }
            if (kept.length !== circlesRef.current.length) circlesRef.current = kept;
            if (t >= sing.suckUntil) {
              const totalOut = sing.absorbed * 0.9;
              const n = Math.max(8, Math.min(24, Math.round(sing.absorbed / 8)));
              const frags = ejectFragments(sing.x, sing.y, totalOut, n, sing.color);
              circlesRef.current = circlesRef.current.concat(frags);
              pulsesRef.current.push({
                x: sing.x, y: sing.y, bornAt: now, kind: "singularity-burst",
              });
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("orbis:sfx:merge"));
              }
              singularityRef.current = null;
            }
          }
        }

        // enemy waves
        const ecfg = enemyConfigRef.current;
        if (ecfg.enabled) {
          waveAccRef.current += realDt;
          // if wave rate was just shortened in the panel, don't sit on a stale long timer
          if (waveAccRef.current > ecfg.waveRate) waveAccRef.current = ecfg.waveRate;
          if (waveAccRef.current >= ecfg.waveRate) {
            waveAccRef.current = 0;
            wavesFiredRef.current++;
            const newOnes = spawnEnemyWave(sizeRef.current.w, sizeRef.current.h, ecfg.swarmSize);
            enemiesRef.current = enemiesRef.current.concat(newOnes);
            if (ecfg.bossRate > 0 && wavesFiredRef.current % ecfg.bossRate === 0) {
              enemiesRef.current = enemiesRef.current.concat(spawnBoss(sizeRef.current.w, sizeRef.current.h));
            }
          }
          const result = stepEnemies(
            enemiesRef.current,
            circlesRef.current,
            ecfg,
            dt,
            sizeRef.current.w,
            sizeRef.current.h,
            now,
            infectionPulseAccRef.current,
          );
          enemiesRef.current = result.enemies;
          // keep pulses for ~1.2s
          pulsesRef.current = pulsesRef.current
            .concat(result.pulses)
            .filter((p) => now - p.bornAt < 1200);
          // drop tiny circles
          circlesRef.current = circlesRef.current.filter((c) => c.mass >= 0.5);

          // game-over check
          if (startingMassRef.current > 0 && totalFriendlyMass(circlesRef.current) < startingMassRef.current * 0.15) {
            gameOverRef.current = true;
            setGameOver(true);
          }
        }
      }
      render(
        ctx,
        circlesRef.current,
        selectedRef.current,
        sizeRef.current.w,
        sizeRef.current.h,
        now,
        {
          showTrails: showTrailsRef.current,
          trailCtx: trailCtxRef.current,
          trailCanvas: trailCanvasRef.current,
          enemies: enemiesRef.current,
          pulses: pulsesRef.current,
          singularity: singularityRef.current
            ? {
                x: singularityRef.current.x,
                y: singularityRef.current.y,
                phase: singularityRef.current.phase,
                progress:
                  singularityRef.current.phase === "charge"
                    ? Math.max(0, Math.min(1, 1 - (singularityRef.current.chargeUntil - simTimeRef.current) / 1.5))
                    : 1,
              }
            : null,
        },
        configRef.current.trailOpacity,
        configRef.current.glowSoftness,
        configRef.current.tailFadeRate,
        configRef.current.trailLength,
      );

      if (pulsesRef.current.length > 0) {
        pulsesRef.current = pulsesRef.current.filter((p) => now - p.bornAt < 1600);
      }

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
        let mSum = 0;
        for (const c of cs) mSum += c.mass;
        for (const e of enemiesRef.current) mSum += e.mass;
        setTotalMass(mSum);
        setElapsedSec(simTimeRef.current);
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
    enemiesRef.current = [];
    pulsesRef.current = [];
    waveAccRef.current = 0;
    wavesFiredRef.current = 0;
    infectionPulseAccRef.current.t = 0;
    startingMassRef.current = circlesRef.current.reduce((s, c) => s + c.mass, 0);
    gameOverRef.current = false;
    setGameOver(false);
    simTimeRef.current = 0;
    setElapsedSec(0);
    setTotalMass(circlesRef.current.reduce((s, c) => s + c.mass, 0));
    gravityPulseUntilRef.current = 0;
    inversionUntilRef.current = 0;
    blackHoleUntilRef.current = 0;
    blackHolePosRef.current = null;
    shatterUntilRef.current = 0;
    coalesceUntilRef.current = 0;
    singularityRef.current = null;
    scenarioStartSimTimeRef.current = 0;
    scenarioFiredRef.current = new Set();
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
      } else if (e.key === "m" || e.key === "M") {
        window.dispatchEvent(new CustomEvent("orbis:toggle-music"));
      } else if (e.key === "f" || e.key === "F") {
        window.dispatchEvent(new CustomEvent("orbis:toggle-sfx"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleToggleTrails = (v: boolean) => {
    showTrailsRef.current = v;
    setShowTrails(v);
  };

  const handleEnemyChange = (patch: Partial<EnemyConfig>) => {
    enemyConfigRef.current = { ...enemyConfigRef.current, ...patch };
    setEnemyConfigState((s) => ({ ...s, ...patch }));
  };

  const handleFastForward = () => {
    if (fastForwarding) return;
    setFastForwarding(true);
    setFfProgress(0);
    const { w, h } = sizeRef.current;
    const CHUNKS = 10;
    const ITERS_PER_CHUNK = 60;
    const DT = 1.0;
    let chunk = 0;
    let spawnAcc = spawnAccRef.current;
    const runChunk = () => {
      let cur = circlesRef.current;
      for (let i = 0; i < ITERS_PER_CHUNK; i++) {
        cur = step(cur, configRef.current, DT, w, h);
        spawnAcc += DT;
        if (spawnAcc >= configRef.current.spawnRate) {
          spawnAcc = 0;
          cur = cur.concat(spawnFromEdge(w, h));
        }
      }
      circlesRef.current = cur;
      simTimeRef.current += ITERS_PER_CHUNK * DT;
      chunk++;
      setFfProgress(chunk / CHUNKS);
      setElapsedSec(simTimeRef.current);
      let mSum = 0;
      for (const c of cur) mSum += c.mass;
      for (const e of enemiesRef.current) mSum += e.mass;
      setTotalMass(mSum);
      if (chunk < CHUNKS) {
        window.setTimeout(runChunk, 0);
      } else {
        spawnAccRef.current = spawnAcc;
        setFastForwarding(false);
      }
    };
    window.setTimeout(runChunk, 30);
  };

  const handleChaos = (id: string) => {
    const { w, h } = sizeRef.current;
    const t = simTimeRef.current;
    switch (id) {
      case "supernova":
        circlesRef.current = triggerSupernova(circlesRef.current);
        break;
      case "blackhole":
        blackHolePosRef.current = { x: w / 2, y: h / 2 };
        blackHoleUntilRef.current = t + 3.9;
        break;
      case "pulse":
        gravityPulseUntilRef.current = t + 2.6;
        break;
      case "storm": {
        // 3 bursts of 5 over ~1s of real time
        const burst = () => {
          circlesRef.current = circlesRef.current.concat(spawnAsteroidBurst(w, h, 5));
        };
        burst();
        window.setTimeout(burst, 333);
        window.setTimeout(burst, 666);
        break;
      }
      case "comet":
        circlesRef.current = circlesRef.current.concat(spawnComet(w, h));
        break;
      case "inversion":
        inversionUntilRef.current = t + 2;
        break;
      case "shatter":
        shatterUntilRef.current = t + 4;
        break;
      case "coalesce":
        coalesceUntilRef.current = t + 6;
        break;
      case "fusion":
        circlesRef.current = fusionCascade(circlesRef.current, pulsesRef.current);
        break;
      case "singularity": {
        if (singularityRef.current) break; // already in progress
        let big: Circle | null = null;
        for (const c of circlesRef.current) {
          if (c.infected) continue;
          if (!big || c.mass > big.mass) big = c;
        }
        if (!big || big.mass < 60) break;
        // remove it and seed the singularity
        singularityRef.current = {
          x: big.x,
          y: big.y,
          absorbed: big.mass,
          color: big.color,
          phase: "charge",
          chargeUntil: t + 1.5,
          suckUntil: t + 1.5 + 2.5,
        };
        circlesRef.current = circlesRef.current.filter((c) => c.id !== big!.id);
        pulsesRef.current.push({
          x: big.x, y: big.y, bornAt: performance.now(), kind: "singularity-charge",
        });
        break;
      }
    }
  };
  // expose for the scenario script runner (avoids referencing before declaration)
  handleChaosRef.current = handleChaos;

  const handleScenario = (id: string | null) => {
    if (id == null) {
      activeScenarioRef.current = null;
      scenarioFiredRef.current = new Set();
      setActiveScenarioId(null);
      return;
    }
    const sc = SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    // apply patches
    configRef.current = { ...configRef.current, ...sc.sim };
    setConfigState((s) => ({ ...s, ...sc.sim }));
    enemyConfigRef.current = { ...enemyConfigRef.current, ...sc.enemies };
    setEnemyConfigState((s) => ({ ...s, ...sc.enemies }));
    activeScenarioRef.current = sc;
    scenarioStartSimTimeRef.current = simTimeRef.current;
    scenarioFiredRef.current = new Set();
    setActiveScenarioId(id);
  };

  return (
    <>
      <BackgroundAura intensity={configState.auraIntensity} driftSpeed={configState.ribbonDrift} />
      <canvas ref={canvasRef} className="fixed inset-0 z-10 block cursor-crosshair" />
      <LoadingOrb visible={loading} />
      <MusicControl />
      <SfxControl />
      <StatsHUD elapsedSec={elapsedSec} totalMass={totalMass} />
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
        enemyConfig={enemyConfigState}
        onEnemyChange={handleEnemyChange}
        onFastForward={handleFastForward}
        onChaos={handleChaos}
        scenarios={SCENARIOS}
        activeScenarioId={activeScenarioId}
        onScenario={handleScenario}
      />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      {fastForwarding && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          style={{ background: "rgba(30, 4, 4, 0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        >
          <div
            className="rounded-3xl border px-8 py-6 text-center"
            style={{
              background: "rgba(60, 8, 8, 0.85)",
              borderColor: "rgba(217, 74, 74, 0.5)",
              color: "#f0d0d0",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              minWidth: 280,
            }}
          >
            <div className="mb-2 text-[11px] uppercase tracking-[0.3em]" style={{ color: "#d94a4a" }}>
              Radioactive
            </div>
            <div className="mb-3 text-[16px]">Fast-forwarding 10 minutes… {Math.round(ffProgress * 100)}%</div>
            <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(217,74,74,0.2)" }}>
              <div
                className="h-full"
                style={{ width: `${ffProgress * 100}%`, background: "#d94a4a", transition: "width 80ms linear" }}
              />
            </div>
          </div>
        </div>
      )}
      {gameOver && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-6"
          style={{ background: "rgba(30, 4, 4, 0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        >
          <div
            className="rounded-3xl border p-8 text-center"
            style={{
              background: "rgba(60, 8, 8, 0.85)",
              borderColor: "rgba(217, 74, 74, 0.5)",
              color: "#f0d0d0",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              minWidth: 320,
            }}
          >
            <div className="mb-2 text-[11px] uppercase tracking-[0.3em]" style={{ color: "#d94a4a" }}>
              Radioactive
            </div>
            <div className="mb-6 text-[18px]">The system collapsed.</div>
            <button
              onClick={handleReset}
              className="rounded-2xl border px-5 py-2 text-[13px] transition-colors hover:bg-white/5"
              style={{ borderColor: "#d94a4a", color: "#f0d0d0" }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
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
    ["1 – 6", "Switch debug panel tab (Time, Planets, Background, Visuals, Experimental, Radioactive)"],
    ["? / H", "Toggle this help"],
    ["Esc", "Close help"],
    ["M", "Mute / unmute music"],
    ["F", "Mute / unmute sound effects"],
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