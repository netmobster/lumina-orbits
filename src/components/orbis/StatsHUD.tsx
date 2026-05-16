import { EARTH_MASS_UNITS } from "@/lib/orbis/types";

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

function formatMass(total: number) {
  const earths = total / EARTH_MASS_UNITS;
  const v = earths.toFixed(1);
  const label = v === "1.0" ? "Earth" : "Earths";
  return `${v} ${label}`;
}

export function StatsHUD({ elapsedSec, totalMass }: { elapsedSec: number; totalMass: number }) {
  return (
    <div
      className="fixed bottom-4 right-16 z-20 rounded-2xl border px-3 py-2 text-[12px] tabular-nums"
      style={{
        background: "var(--orbis-surface)",
        borderColor: "var(--orbis-hairline)",
        color: "var(--orbis-text-muted)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        minWidth: 140,
      }}
    >
      <Row label="Elapsed" value={formatTime(elapsedSec)} />
      <Row label="Mass" value={formatMass(totalMass)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className="text-[9px] uppercase tracking-[0.2em]"
        style={{ color: "var(--orbis-text-muted)", opacity: 0.7 }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--orbis-text)",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}