import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw, Pause, Play } from "lucide-react";
import type { Preset, SimConfig } from "@/lib/orbis/types";

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
  showVectors: boolean;
  onToggleVectors: (v: boolean) => void;
  showTrails: boolean;
  onToggleTrails: (v: boolean) => void;
};

export function DebugPanel({
  config, onChange, fps, count, avgSpeed, onReset,
  onPreset, activePreset, speed, onSpeed,
  showVectors, onToggleVectors,
  showTrails, onToggleTrails,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="fixed right-4 top-4 z-20 w-72 rounded-3xl border text-[13px]"
      style={{
        background: "var(--orbis-surface)",
        borderColor: "var(--orbis-hairline)",
        color: "var(--orbis-text)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
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
          <span className="tabular-nums" style={{ color: "var(--orbis-accent)" }}>{fps} fps</span>
          <span className="tabular-nums" style={{ color: "var(--orbis-text-muted)" }}>· {count}</span>
          <span className="tabular-nums" style={{ color: "var(--orbis-text-muted)" }}>· {avgSpeed.toFixed(1)} v</span>
        </div>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {!collapsed && (
        <div className="space-y-4 px-4 pb-4">
          {/* Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--orbis-text-muted)" }}>Preset</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(["drift", "orbit", "spiral"] as Preset[]).map((p) => {
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
            <div className="grid grid-cols-5 gap-1.5">
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
              {[0.5, 1, 2, 5].map((s) => (
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

          <Slider label="Attraction (G)" min={0} max={1} step={0.01} value={config.G}
            onChange={(v) => onChange({ G: v })} format={(v) => v.toFixed(2)} />
          <Slider label="Max force" min={10} max={300} step={5} value={config.maxForce}
            onChange={(v) => onChange({ maxForce: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Damping" min={0.995} max={1} step={0.0001} value={config.damping}
            onChange={(v) => onChange({ damping: v })} format={(v) => v.toFixed(4)} />
          <Slider label="Merge threshold" min={20} max={200} step={1} value={config.mergeThreshold}
            onChange={(v) => onChange({ mergeThreshold: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Spawn rate (s)" min={3} max={100} step={1} value={config.spawnRate}
            onChange={(v) => onChange({ spawnRate: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Aura intensity" min={1} max={10} step={0.1} value={config.auraIntensity}
            onChange={(v) => onChange({ auraIntensity: v })} format={(v) => v.toFixed(1)} />
          <Slider label="Ribbon drift" min={0} max={5} step={0.1} value={config.ribbonDrift}
            onChange={(v) => onChange({ ribbonDrift: v })} format={(v) => v.toFixed(1) + "×"} />

          {/* Toggles */}
          <div className="space-y-1.5">
            <Toggle label="Motion trails" checked={showTrails} onChange={onToggleTrails} />
            <Toggle label="Velocity vectors" checked={showVectors} onChange={onToggleVectors} />
          </div>

          <button
            onClick={onReset}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2 transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--orbis-hairline)", color: "var(--orbis-text)" }}
          >
            <RotateCcw size={13} /> Reset
          </button>

          <p className="text-[11px] leading-relaxed" style={{ color: "var(--orbis-text-muted)" }}>
            Click to select. Click another to attempt merge. Right-click selected to split.
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
  label, min, max, step, value, onChange, format,
}: {
  label: string; min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span style={{ color: "var(--orbis-text-muted)" }}>{label}</span>
        <span className="tabular-nums" style={{ color: "var(--orbis-accent)" }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="orbis-slider w-full"
      />
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