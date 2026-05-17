import { useEffect, useState } from "react";
import {
  ChevronDown, ChevronUp, RotateCcw, Pause, Play, Clock, Orbit, Mountain,
  Sparkles, Radiation, Star, FastForward, Zap, CircleDot, Wind, Flame, Repeat, Bomb, Magnet, Atom,
} from "lucide-react";
import type { Preset, SimConfig } from "@/lib/orbis/types";
import type { EnemyConfig } from "@/lib/orbis/enemies";
import type { Scenario } from "@/lib/orbis/scenarios";

type Props = {
  config: SimConfig;
  onChange: (patch: Partial<SimConfig>) => void;
  fps: number;
  count: number;
  avgSpeed: number;
  onReset: () => void;
  onPreset: (p: Preset) => void;
  activePreset: Preset | null;
  speed: number;
  onSpeed: (s: number) => void;
  showTrails: boolean;
  onToggleTrails: (v: boolean) => void;
  enemyConfig: EnemyConfig;
  onEnemyChange: (patch: Partial<EnemyConfig>) => void;
  onFastForward: () => void;
  onChaos: (id: string) => void;
  scenarios: Scenario[];
  activeScenarioId: string | null;
  onScenario: (id: string | null) => void;
};

export function DebugPanel({
  config, onChange, fps, count, avgSpeed, onReset,
  onPreset, activePreset, speed, onSpeed,
  showTrails, onToggleTrails,
  enemyConfig, onEnemyChange,
  onFastForward, onChaos,
  scenarios, activeScenarioId, onScenario,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  type Tab = "time" | "planets" | "bg" | "visuals" | "xl" | "radio";
  const [tab, setTab] = useState<Tab>("time");
  const playerMode = activeScenarioId !== null;
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null;
  // chaos-agent cooldowns — id -> unlock-at (ms epoch)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [, tick] = useState(0);
  useEffect(() => {
    const anyActive = Object.values(cooldowns).some((t) => t > Date.now());
    if (!anyActive) return;
    const id = window.setInterval(() => tick((v) => v + 1), 100);
    return () => window.clearInterval(id);
  }, [cooldowns]);
  const startCooldown = (id: string, ms = 5000) => {
    setCooldowns((c) => ({ ...c, [id]: Date.now() + ms }));
  };
  const tabs: { id: Tab; label: string; Icon: typeof Clock; badge?: boolean }[] = [
    { id: "time", label: "Time", Icon: Clock },
    { id: "planets", label: "Planets", Icon: Orbit },
    { id: "bg", label: "Background", Icon: Mountain },
    { id: "visuals", label: "Visuals", Icon: Sparkles },
    { id: "xl", label: "Experimental", Icon: Radiation, badge: true },
    { id: "radio", label: "Radioactive", Icon: Star },
  ];

  // keyboard shortcuts 1–6 → tabs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const idx = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
      if (idx === -1) return;
      setTab(tabs[idx].id);
      setCollapsed(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radioActive = tab === "radio";
  const wrapperStyle: React.CSSProperties = radioActive
    ? {
        background: "rgba(60, 8, 8, 0.75)",
        borderColor: "rgba(217, 74, 74, 0.4)",
        color: "var(--orbis-text)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        ["--orbis-accent" as never]: "#d94a4a",
      }
    : {
        background: "var(--orbis-surface)",
        borderColor: "var(--orbis-hairline)",
        color: "var(--orbis-text)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      };

  return (
    <div
      className="fixed right-4 top-4 z-20 w-72 rounded-3xl border text-[13px]"
      style={wrapperStyle}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
        style={{ color: "var(--orbis-text)" }}
      >
        <div className="flex items-center gap-3">
          <span className="tracking-[0.2em] text-[11px] uppercase" style={{ color: "var(--orbis-text-muted)" }}>
            Orbis
          </span>
          {playerMode ? (
            <>
              <span style={{ color: "var(--orbis-accent)" }}>{activeScenario?.name ?? "Scenario"}</span>
              <span className="tabular-nums" style={{ color: "var(--orbis-text-muted)" }}>· {fps} fps</span>
            </>
          ) : (
            <>
              <span className="tabular-nums" style={{ color: "var(--orbis-accent)" }}>{fps} fps</span>
              <span className="tabular-nums" style={{ color: "var(--orbis-text-muted)" }}>· {count}</span>
              <span className="tabular-nums" style={{ color: "var(--orbis-text-muted)" }}>· {avgSpeed.toFixed(1)} v</span>
            </>
          )}
        </div>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {!collapsed && (
        <div className="space-y-4 px-4 pb-4">
          {/* Scenarios */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--orbis-text-muted)" }}>Scenarios</span>
            <div className="flex flex-wrap gap-1.5">
              {scenarios.map((s) => {
                const active = activeScenarioId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onScenario(active ? null : s.id)}
                    title={s.blurb}
                    className="rounded-xl border px-2.5 py-1 text-[11px] transition-colors hover:bg-white/5"
                    style={{
                      borderColor: active ? "var(--orbis-accent)" : "var(--orbis-hairline)",
                      color: active ? "var(--orbis-accent)" : "var(--orbis-text)",
                    }}
                  >
                    {s.name}
                  </button>
                );
              })}
              {activeScenarioId && (
                <button
                  onClick={() => onScenario(null)}
                  className="rounded-xl border px-2.5 py-1 text-[11px] transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--orbis-hairline)", color: "var(--orbis-text-muted)" }}
                >
                  Exit
                </button>
              )}
            </div>
          </div>

          {/* Tabs (hidden in player mode) */}
          {!playerMode && <div className="grid grid-cols-6 gap-1.5">
              {tabs.map(({ id, label, Icon, badge }, i) => {
              const active = tab === id;
              const isRadio = id === "radio";
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                    title={`${label} (${i + 1})`}
                  aria-label={label}
                  className="relative flex items-center justify-center rounded-xl border py-1.5 transition-colors hover:bg-white/5"
                  style={{
                    borderColor: active
                      ? (isRadio ? "#d94a4a" : "var(--orbis-accent)")
                      : "var(--orbis-hairline)",
                    color: active
                      ? (isRadio ? "#d94a4a" : "var(--orbis-accent)")
                      : (isRadio ? "rgba(217,74,74,0.65)" : "var(--orbis-text-muted)"),
                    textShadow: isRadio ? "0 0 6px rgba(217,74,74,0.5)" : undefined,
                  }}
                >
                  <Icon size={14} />
                  {badge && (
                    <Star
                      size={7}
                      fill="#d94a4a"
                      stroke="#d94a4a"
                      className="absolute -right-0.5 -top-0.5"
                    />
                  )}
                </button>
              );
            })}
          </div>}

          {playerMode && <>
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--orbis-text-muted)" }}>Player controls</span>
            </div>
            <Toggle label="Enemies" checked={enemyConfig.enabled} onChange={(v) => onEnemyChange({ enabled: v })} />
            <Slider label="Spawn rate (s)" hint="Seconds between new bodies entering from the edge."
              min={3} max={1000} step={1} value={config.spawnRate}
              onChange={(v) => onChange({ spawnRate: v })} format={(v) => v.toFixed(0)} />
            {enemyConfig.enabled && (
              <Slider label="Wave rate (s)" hint="Seconds between enemy waves."
                min={1.5} max={60} step={0.5} value={enemyConfig.waveRate}
                onChange={(v) => onEnemyChange({ waveRate: v })} format={(v) => v.toFixed(1) + "s"} />
            )}
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--orbis-text-muted)" }}>
              Scenario running — exit for full controls.
            </p>
          </>}

          {!playerMode && tab === "time" && <>
          {/* Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--orbis-text-muted)" }}>Preset</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(["chaos", "orbit", "spiral", "life"] as Preset[]).map((p) => {
                const active = activePreset === p;
                return (
                  <button
                    key={p}
                    onClick={() => onPreset(p)}
                    className="rounded-xl border px-2 py-1.5 text-[12px] capitalize transition-colors hover:bg-white/5"
                    style={{
                      borderColor: active ? "var(--orbis-accent)" : "var(--orbis-hairline)",
                      color: active ? "var(--orbis-accent)" : "var(--orbis-text)",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speed + pause */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--orbis-text-muted)" }}>Time</span>
            <div className="grid grid-cols-6 gap-1.5">
              <button
                onClick={() => onSpeed(speed === 0 ? 1 : 0)}
                className="flex items-center justify-center rounded-xl border px-2 py-1.5 text-[12px] transition-colors hover:bg-white/5"
                style={{
                  borderColor: speed === 0 ? "var(--orbis-accent)" : "var(--orbis-hairline)",
                  color: speed === 0 ? "var(--orbis-accent)" : "var(--orbis-text)",
                }}
              >
                {speed === 0 ? <Play size={12} /> : <Pause size={12} />}
              </button>
              {[0.5, 1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeed(s)}
                  className="rounded-xl border px-2 py-1.5 text-[12px] tabular-nums transition-colors hover:bg-white/5"
                  style={{
                    borderColor: speed === s ? "var(--orbis-accent)" : "var(--orbis-hairline)",
                    color: speed === s ? "var(--orbis-accent)" : "var(--orbis-text)",
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          </>}

          {!playerMode && tab === "planets" && <>
          <Slider label="Attraction (G)" hint="Gravitational pull strength between bodies. Higher = stronger orbits and slingshots."
            min={0} max={1} step={0.01} value={config.G}
            onChange={(v) => onChange({ G: v })} format={(v) => v.toFixed(2)} />
          <Slider label="Max force" hint="Caps the force any pair can exert, preventing explosive kicks when bodies get very close."
            min={10} max={300} step={5} value={config.maxForce}
            onChange={(v) => onChange({ maxForce: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Damping" hint="Per-frame velocity retention. 1 = no friction; lower values slow everything down over time."
            min={0.995} max={1} step={0.0001} value={config.damping}
            onChange={(v) => onChange({ damping: v })} format={(v) => v.toFixed(4)} />
          <Slider label="Merge threshold" hint="Combined mass needed for two touching bodies to fuse. Lower = more merges."
            min={20} max={200} step={1} value={config.mergeThreshold}
            onChange={(v) => onChange({ mergeThreshold: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Spawn rate (s)" hint="Seconds between new bodies entering from the edge. Lower = constant fresh arrivals."
            min={3} max={1000} step={1} value={config.spawnRate}
            onChange={(v) => onChange({ spawnRate: v })} format={(v) => v.toFixed(0)} />
          </>}

          {!playerMode && tab === "bg" && <>
          <Slider label="Aura intensity" hint="Brightness of the soft colored clouds behind the simulation."
            min={1} max={10} step={0.1} value={config.auraIntensity}
            onChange={(v) => onChange({ auraIntensity: v })} format={(v) => v.toFixed(1)} />
          <Slider label="Ribbon drift" hint="How fast the background ribbons slide around. 0 = frozen."
            min={0} max={5} step={0.1} value={config.ribbonDrift}
            onChange={(v) => onChange({ ribbonDrift: v })} format={(v) => v.toFixed(1) + "×"} />
          </>}

          {!playerMode && tab === "visuals" && <>
          <Slider label="Trail length" hint="How long tails persist before fully fading. Works together with Tail fade rate."
            min={10} max={2000} step={10} value={config.trailLength}
            onChange={(v) => onChange({ trailLength: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Trail visibility" hint="Overall brightness multiplier for the trails."
            min={1} max={200} step={1} value={config.trailOpacity}
            onChange={(v) => onChange({ trailOpacity: v })} format={(v) => v.toFixed(0) + "×"} />
          <Slider label="Glow softness" hint="Width of the soft halo around each trail segment. Higher = more aquatic blur."
            min={1} max={8} step={0.1} value={config.glowSoftness}
            onChange={(v) => onChange({ glowSoftness: v })} format={(v) => v.toFixed(1) + "×"} />
          <Slider label="Tail fade rate" hint="How quickly tails dim over time. Lower = long lingering streaks; higher = snappy short tails."
            min={0.3} max={4} step={0.05} value={config.tailFadeRate}
            onChange={(v) => onChange({ tailFadeRate: v })} format={(v) => v.toFixed(2)} />
          <div className="space-y-1.5">
            <Toggle label="Motion trails" checked={showTrails} onChange={onToggleTrails} />
          </div>
          </>}

          {!playerMode && tab === "xl" && <>
          <Toggle label="Experimental features" checked={config.xlEnabled} onChange={(v) => onChange({ xlEnabled: v })} />
          <div style={{ opacity: config.xlEnabled ? 1 : 0.4, pointerEvents: config.xlEnabled ? "auto" : "none" }}>
            <Slider label="Split randomness" hint="Average random splits per second. Big bodies spontaneously break in two."
              min={0} max={1} step={0.01} value={config.splitRate}
              onChange={(v) => onChange({ splitRate: v })} format={(v) => v.toFixed(2) + "/s"} />
          </div>
          </>}

          {!playerMode && tab === "radio" && <>
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--orbis-text-muted)" }}>Chaos agents</span>
            <button
              onClick={onFastForward}
              className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[12px] transition-colors hover:bg-white/5"
              style={{ borderColor: "#d94a4a", color: "#f0d0d0" }}
            >
              <FastForward size={13} /> {">> 10 minutes"}
            </button>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { id: "supernova", label: "Supernova", Icon: Bomb },
                { id: "blackhole", label: "Black Hole", Icon: CircleDot },
                { id: "pulse", label: "G Pulse", Icon: Zap },
                { id: "storm", label: "Asteroids", Icon: Wind },
                { id: "comet", label: "Comet", Icon: Flame },
                { id: "inversion", label: "Inversion", Icon: Repeat },
                { id: "shatter", label: "Shatter", Icon: Sparkles },
                { id: "singularity", label: "Singularity", Icon: Atom },
                { id: "coalesce", label: "Coalesce", Icon: Magnet },
              ] as const).map(({ id, label, Icon }) => {
                const until = cooldowns[id] ?? 0;
                const remaining = Math.max(0, until - Date.now());
                const onCD = remaining > 0;
                const pct = onCD ? (1 - remaining / 5000) * 100 : 100;
                return (
                  <button
                    key={id}
                    disabled={onCD}
                    onClick={() => { onChaos(id); startCooldown(id); }}
                    title={label}
                    aria-label={label}
                    className="relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border py-2 text-[10px] transition-colors hover:bg-white/5"
                    style={{
                      borderColor: onCD ? "rgba(217,74,74,0.25)" : "rgba(217,74,74,0.5)",
                      color: onCD ? "rgba(240,208,208,0.4)" : "#f0d0d0",
                      cursor: onCD ? "not-allowed" : "pointer",
                    }}
                  >
                    {onCD && (
                      <div
                        className="absolute inset-x-0 bottom-0 h-[2px]"
                        style={{ width: `${pct}%`, background: "#d94a4a", transition: "width 100ms linear" }}
                      />
                    )}
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Slider label="Auto-chaos interval" hint="Average seconds between auto-fired random chaos events. The game keeps evolving on its own."
            min={5} max={60} step={1} value={config.autoChaosInterval}
            onChange={(v) => onChange({ autoChaosInterval: v })} format={(v) => v.toFixed(0) + "s"} />

          <Toggle label="Enemies" checked={enemyConfig.enabled} onChange={(v) => onEnemyChange({ enabled: v })} />
          <Slider label="Wave rate (s)" hint="Seconds between enemy waves. Lower = relentless (min 1.5s = ~3× faster spawning)."
            min={1.5} max={60} step={0.5} value={enemyConfig.waveRate}
            onChange={(v) => onEnemyChange({ waveRate: v })} format={(v) => v.toFixed(1) + "s"} />
          <Slider label="Swarm size" hint="Scouts spawned per wave."
            min={1} max={20} step={1} value={enemyConfig.swarmSize}
            onChange={(v) => onEnemyChange({ swarmSize: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Scout speed" hint="Movement speed multiplier. Scouts ignore gravity entirely."
            min={0.1} max={5} step={0.1} value={enemyConfig.scoutSpeed}
            onChange={(v) => onEnemyChange({ scoutSpeed: v })} format={(v) => v.toFixed(1) + "×"} />
          <Slider label="Attach rate" hint="Probability a scout latches on contact. ≥1 = always latches."
            min={0.1} max={3} step={0.1} value={enemyConfig.attachRate}
            onChange={(v) => onEnemyChange({ attachRate: v })} format={(v) => v.toFixed(1)} />
          <Slider label="Drain rate" hint="Mass drained per second by each attached scout."
            min={0.1} max={5} step={0.1} value={enemyConfig.drainRate}
            onChange={(v) => onEnemyChange({ drainRate: v })} format={(v) => v.toFixed(1) + "/s"} />
          <Slider label="Steer force" hint="How hard attached scouts push their host around."
            min={0} max={2} step={0.1} value={enemyConfig.steerForce}
            onChange={(v) => onEnemyChange({ steerForce: v })} format={(v) => v.toFixed(1)} />
          <Slider label="Convert threshold" hint="When a host drops below this fraction of its original mass, it becomes infected."
            min={0.05} max={0.9} step={0.05} value={enemyConfig.convertThreshold}
            onChange={(v) => onEnemyChange({ convertThreshold: v })} format={(v) => Math.round(v * 100) + "%"} />
          <Slider label="Boss rate" hint="Waves between boss spawns. 0 disables bosses."
            min={0} max={10} step={1} value={enemyConfig.bossRate}
            onChange={(v) => onEnemyChange({ bossRate: v })} format={(v) => v.toFixed(0)} />
          <Toggle label="Infection spread" checked={enemyConfig.infectionSpread} onChange={(v) => onEnemyChange({ infectionSpread: v })} />
          </>}

          <button
            onClick={onReset}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2 transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--orbis-hairline)", color: "var(--orbis-text)" }}
          >
            <RotateCcw size={13} /> Reset
          </button>

          <p className="text-[11px] leading-relaxed" style={{ color: "var(--orbis-text-muted)" }}>
            Click to select. Click another to attempt merge. Right-click selected to split. Press 1–6 to switch tabs.
          </p>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-[12px] transition-colors hover:bg-white/5"
      style={{
        borderColor: checked ? "var(--orbis-accent)" : "var(--orbis-hairline)",
        color: "var(--orbis-text-muted)",
      }}
    >
      <span>{label}</span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
        style={{
          background: checked ? "var(--orbis-accent)" : "transparent",
          color: checked ? "#04141a" : "var(--orbis-text-muted)",
          border: checked ? "none" : "1px solid var(--orbis-hairline)",
        }}
      >
        {checked ? "on" : "off"}
      </span>
    </button>
  );
}

function Slider({
  label, hint, min, max, step, value, onChange, format,
}: {
  label: string; hint?: string; min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <label className="block space-y-1.5" title={hint}>
      <div className="flex items-center justify-between">
        <span style={{ color: "var(--orbis-text-muted)" }} className={hint ? "decoration-dotted underline-offset-4 underline" : ""}>{label}</span>
        <span className="tabular-nums" style={{ color: "var(--orbis-accent)" }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="orbis-slider w-full"
      />
      {hint && (
        <p className="text-[10.5px] leading-snug" style={{ color: "var(--orbis-text-muted)", opacity: 0.7 }}>{hint}</p>
      )}
      <style>{`
        .orbis-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          outline: none;
        }
        .orbis-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px; height: 12px; border-radius: 999px;
          background: var(--orbis-accent);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(29,158,117,0.6);
        }
        .orbis-slider::-moz-range-thumb {
          width: 12px; height: 12px; border-radius: 999px;
          background: var(--orbis-accent); border: none; cursor: pointer;
          box-shadow: 0 0 8px rgba(29,158,117,0.6);
        }
      `}</style>
    </label>
  );
}