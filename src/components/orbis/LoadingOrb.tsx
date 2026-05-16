export function LoadingOrb({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 700ms ease-out",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, oklch(0.85 0.16 175 / 0.9) 0%, oklch(0.7 0.14 175 / 0.5) 35%, transparent 70%)",
          filter: "blur(2px)",
          animation: "orbis-loading-pulse 1.6s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes orbis-loading-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.6; }
          50%      { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
