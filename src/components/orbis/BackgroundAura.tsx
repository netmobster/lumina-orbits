const RIBBONS = [
  { color: "#1d9e75", w: "120vw", h: "30vh", top: "-5%",  left: "-10%", anim: "orbis-drift-1 62s" },
  { color: "#534ab7", w: "100vw", h: "20vh", top: "20%",  left: "30%",  anim: "orbis-drift-2 78s" },
  { color: "#993c1d", w: "110vw", h: "15vh", top: "50%",  left: "-20%", anim: "orbis-drift-3 54s" },
  { color: "#0f6e56", w: "130vw", h: "25vh", top: "70%",  left: "40%",  anim: "orbis-drift-4 88s" },
  { color: "#ba7517", w: "90vw",  h: "12vh", top: "10%",  left: "60%",  anim: "orbis-drift-5 47s" },
  { color: "#3c3489", w: "115vw", h: "22vh", top: "40%",  left: "-5%",  anim: "orbis-drift-6 71s" },
];

export function BackgroundAura() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, background: "var(--orbis-bg)" }}
    >
      {RIBBONS.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: r.top,
            left: r.left,
            width: r.w,
            height: r.h,
            background: r.color,
            borderRadius: "50%",
            filter: "blur(60px)",
            opacity: 0.06,
            mixBlendMode: "screen",
            animation: `${r.anim} ease-in-out infinite alternate`,
            willChange: "transform",
          }}
        />
      ))}

      {/* radial vignette — above ribbons, behind canvas */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse at center, transparent 40%, oklch(0.08 0.02 200) 100%)",
        }}
      />

      {/* subtle grain */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 1, opacity: 0.04, mixBlendMode: "overlay" }}
      >
        <filter id="orbis-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#orbis-noise)" />
      </svg>

      <style>{`
        @keyframes orbis-drift-1 {
          0%   { transform: translate(0,0) rotate(-3deg) scaleX(1); }
          50%  { transform: translate(40px, 20px) rotate(2deg) scaleX(1.05); }
          100% { transform: translate(0,0) rotate(-3deg) scaleX(1); }
        }
        @keyframes orbis-drift-2 {
          0%   { transform: translate(0,0) rotate(2deg) scaleX(1); }
          50%  { transform: translate(-50px, 30px) rotate(-4deg) scaleX(1.08); }
          100% { transform: translate(0,0) rotate(2deg) scaleX(1); }
        }
        @keyframes orbis-drift-3 {
          0%   { transform: translate(0,0) rotate(-1deg) scaleX(1); }
          50%  { transform: translate(60px, -25px) rotate(4deg) scaleX(1.1); }
          100% { transform: translate(0,0) rotate(-1deg) scaleX(1); }
        }
        @keyframes orbis-drift-4 {
          0%   { transform: translate(0,0) rotate(3deg) scaleX(1); }
          50%  { transform: translate(-30px, -40px) rotate(-2deg) scaleX(1.04); }
          100% { transform: translate(0,0) rotate(3deg) scaleX(1); }
        }
        @keyframes orbis-drift-5 {
          0%   { transform: translate(0,0) rotate(-5deg) scaleX(1); }
          50%  { transform: translate(25px, 35px) rotate(3deg) scaleX(1.07); }
          100% { transform: translate(0,0) rotate(-5deg) scaleX(1); }
        }
        @keyframes orbis-drift-6 {
          0%   { transform: translate(0,0) rotate(4deg) scaleX(1); }
          50%  { transform: translate(-45px, 15px) rotate(-3deg) scaleX(1.06); }
          100% { transform: translate(0,0) rotate(4deg) scaleX(1); }
        }
      `}</style>
    </div>
  );
}
