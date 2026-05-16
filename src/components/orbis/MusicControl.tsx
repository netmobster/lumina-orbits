import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import trackUrl from "@/assets/geyserlight-sonar.mp3";

const MAX_VOLUME = 0.30;
const DEFAULT_SLIDER = 0.20;

export function MusicControl() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [sliderVolume, setSliderVolume] = useState(DEFAULT_SLIDER);
  const [started, setStarted] = useState(false);

  // create audio element once
  useEffect(() => {
    const a = new Audio(trackUrl);
    a.loop = true;
    a.preload = "auto";
    a.volume = DEFAULT_SLIDER * MAX_VOLUME;
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, []);

  // apply volume / mute
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = muted ? 0 : sliderVolume * MAX_VOLUME;
  }, [muted, sliderVolume]);

  // start playback on first user gesture
  useEffect(() => {
    if (started) return;
    const tryStart = () => {
      const a = audioRef.current;
      if (!a) return;
      a.play().then(() => setStarted(true)).catch(() => {});
      window.removeEventListener("pointerdown", tryStart);
      window.removeEventListener("keydown", tryStart);
    };
    window.addEventListener("pointerdown", tryStart);
    window.addEventListener("keydown", tryStart);
    return () => {
      window.removeEventListener("pointerdown", tryStart);
      window.removeEventListener("keydown", tryStart);
    };
  }, [started]);

  // external toggle (keyboard M)
  useEffect(() => {
    const onToggle = () => setMuted((m) => !m);
    window.addEventListener("orbis:toggle-music", onToggle);
    return () => window.removeEventListener("orbis:toggle-music", onToggle);
  }, []);

  const Icon = muted ? VolumeX : Volume2;

  return (
    <div className="group fixed left-4 top-4 z-20 flex items-start gap-2">
      <button
        onClick={() => setMuted((m) => !m)}
        title={`Music (M) — ${muted ? "muted" : Math.round(sliderVolume * 100) + "%"}`}
        aria-label={muted ? "Unmute music" : "Mute music"}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-white/5 ${!started ? "animate-pulse" : ""}`}
        style={{
          background: "var(--orbis-surface)",
          borderColor: "var(--orbis-hairline)",
          color: muted ? "var(--orbis-text-muted)" : "var(--orbis-accent)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <Icon size={16} />
      </button>
      <div
        className="pointer-events-none flex h-28 w-9 items-center justify-center rounded-2xl border opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
        style={{
          background: "var(--orbis-surface)",
          borderColor: "var(--orbis-hairline)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sliderVolume}
          onChange={(e) => {
            setSliderVolume(parseFloat(e.target.value));
            if (muted) setMuted(false);
          }}
          aria-label="Music volume"
          className="h-1.5 w-20 cursor-pointer accent-[var(--orbis-accent)]"
          style={{
            transform: "rotate(-90deg)",
            background: "transparent",
          }}
        />
      </div>
    </div>
  );
}