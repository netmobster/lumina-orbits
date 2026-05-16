import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import type { SimConfig } from "@/lib/orbis/types";

type Props = {
  config: SimConfig;
  onChange: (patch: Partial<SimConfig>) => void;
  fps: number;
  count: number;
  onReset: () => void;
};

export function DebugPanel({ config, onChange, fps, count, onReset }: Props) {
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
        </div>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {!collapsed && (
        <div className="space-y-4 px-4 pb-4">
          <Slider label="Attraction (G)" min={0} max={0.5} step={0.005} value={config.G}
            onChange={(v) => onChange({ G: v })} format={(v) => v.toFixed(3)} />
          <Slider label="Damping" min={0.95} max={1} step={0.001} value={config.damping}
            onChange={(v) => onChange({ damping: v })} format={(v) => v.toFixed(3)} />
          <Slider label="Merge threshold" min={20} max={200} step={1} value={config.mergeThreshold}
            onChange={(v) => onChange({ mergeThreshold: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Spawn rate (s)" min={3} max={30} step={1} value={config.spawnRate}
            onChange={(v) => onChange({ spawnRate: v })} format={(v) => v.toFixed(0)} />

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