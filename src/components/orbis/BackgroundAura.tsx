import { useEffect, useRef, useState } from "react";

type RibbonDef = {
  color: string;
  w: string;
  h: string;
  top: string;
  left: string;
  anim: string;
  baseDuration: number; // seconds
  depth: number;
};

const RIBBONS: RibbonDef[] = [
  { color: "#1d9e75", w: "120vw", h: "30vh", top: "-5%", left: "-10%", anim: "orbis-drift-1", baseDuration: 62, depth: 8 },
  { color: "#534ab7", w: "100vw", h: "20vh", top: "20%", left: "30%",  anim: "orbis-drift-2", baseDuration: 78, depth: 14 },
  { color: "#993c1d", w: "110vw", h: "15vh", top: "50%", left: "-20%", anim: "orbis-drift-3", baseDuration: 54, depth: 20 },
  { color: "#0f6e56", w: "130vw", h: "25vh", top: "70%", left: "40%",  anim: "orbis-drift-4", baseDuration: 88, depth: 26 },
  { color: "#ba7517", w: "90vw",  h: "12vh", top: "10%", left: "60%",  anim: "orbis-drift-5", baseDuration: 47, depth: 18 },
  { color: "#3c3489", w: "115vw", h: "22vh", top: "40%", left: "-5%",  anim: "orbis-drift-6", baseDuration: 71, depth: 12 },
  // brighter mint / seafoam — drive caustic feel
  { color: "#7be3c4", w: "100vw", h: "18vh", top: "35%", left: "10%",  anim: "orbis-drift-7", baseDuration: 58, depth: 22 },
  { color: "#a8e8d4", w: "95vw",  h: "14vh", top: "60%", left: "50%",  anim: "orbis-drift-8", baseDuration: 66, depth: 16 },
];

type Props = { intensity?: number; driftSpeed?: number };

export function BackgroundAura({ intensity = 5, driftSpeed = 1 }: Props) {
  // intensity 1..10
  const baseOpacity = 0.025 * intensity;
  const blur = 40 + intensity * 6;
  const causticsOpacity = 0.04 + intensity * 0.025;

  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      targetRef.current = {
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setMouse(targetRef.current);
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const paused = driftSpeed <= 0.01;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, background: "var(--orbis-bg)", pointerEvents: "none" }}
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
            transform: `translate3d(${mouse.x * r.depth}px, ${mouse.y * r.depth}px, 0)`,
            transition: "transform 600ms ease-out",
            pointerEvents: "none",
            willChange: "transform",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: r.color,
              borderRadius: "50%",
              filter: `blur(${blur}px)`,
              opacity: baseOpacity,
              mixBlendMode: "screen",
              animationName: r.anim,
              animationDuration: `${r.baseDuration / Math.max(driftSpeed, 0.01)}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDirection: "alternate",
              animationPlayState: paused ? "paused" : "running",
              willChange: "transform",
            }}
          />
        </div>
      ))}

      {/* caustics: turbulence-driven flowing light */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{
          zIndex: 1,
          pointerEvents: "none",
          mixBlendMode: "screen",
          opacity: causticsOpacity,
        }}
      >
        <defs>
          <radialGradient id="orbis-caustics-grad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#7be3c4" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#1d9e75" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <filter id="orbis-caustics-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="2" seed="3" result="noise">
              <animate
                attributeName="baseFrequency"
                dur="14s"
                values="0.010 0.018;0.016 0.026;0.010 0.018"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="120" />
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#orbis-caustics-grad)" filter="url(#orbis-caustics-filter)" />
      </svg>

      {/* radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 2,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 40%, oklch(0.08 0.02 200) 100%)",
        }}
      />

      {/* grain */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 2, opacity: 0.04, mixBlendMode: "overlay", pointerEvents: "none" }}
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
        @keyframes orbis-drift-7 {
          0%   { transform: translate(0,0) rotate(-2deg) scaleX(1); }
          50%  { transform: translate(55px, -20px) rotate(3deg) scaleX(1.08); }
          100% { transform: translate(0,0) rotate(-2deg) scaleX(1); }
        }
        @keyframes orbis-drift-8 {
          0%   { transform: translate(0,0) rotate(1deg) scaleX(1); }
          50%  { transform: translate(-35px, 40px) rotate(-3deg) scaleX(1.06); }
          100% { transform: translate(0,0) rotate(1deg) scaleX(1); }
        }
      `}</style>
    </div>
  );
}
