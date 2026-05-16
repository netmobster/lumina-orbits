export function BackgroundAura() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, background: "var(--orbis-bg)" }}
    >
      <div
        className="absolute rounded-full"
        style={{
          top: "-15%", left: "-10%", width: "60vmax", height: "60vmax",
          background: "radial-gradient(circle, rgba(29,158,117,0.18), transparent 60%)",
          filter: "blur(80px)",
          animation: "orbis-drift-a 80s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: "-20%", right: "-15%", width: "70vmax", height: "70vmax",
          background: "radial-gradient(circle, rgba(127,119,221,0.15), transparent 60%)",
          filter: "blur(100px)",
          animation: "orbis-drift-b 110s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: "30%", left: "40%", width: "50vmax", height: "50vmax",
          background: "radial-gradient(circle, rgba(216,90,48,0.08), transparent 60%)",
          filter: "blur(90px)",
          animation: "orbis-drift-c 95s ease-in-out infinite",
        }}
      />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* noise */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay">
        <filter id="orbis-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#orbis-noise)" />
      </svg>
    </div>
  );
}