import { useEffect, useRef, useState } from "react";
import { AudioLines, VolumeX } from "lucide-react";
import mergeUrl from "@/assets/sfx-merge.mp3";
import collisionUrl from "@/assets/sfx-collision.mp3";
import attachUrl from "@/assets/sfx-attach.mp3";

const MAX_VOLUME = 0.20;
const DEFAULT_SLIDER = 0.30;
const DUCK_RATIO = 0.8;
/** Per-type min interval between triggers (ms). Prevents machine-gunning. */
const MIN_INTERVAL_MS = 60;

type Voice = { audio: HTMLAudioElement; startedAt: number };
type Pool = { voices: [Voice, Voice]; lastTrigger: number };

type SfxKey = "merge" | "collision" | "attach";

const SRCS: Record<SfxKey, string> = {
  merge: mergeUrl,
  collision: collisionUrl,
  attach: attachUrl,
};

function makePool(src: string): Pool {
  const mk = (): Voice => {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = 0;
    return { audio: a, startedAt: 0 };
  };
  return { voices: [mk(), mk()], lastTrigger: 0 };
}

function isPlaying(v: Voice) {
  const a = v.audio;
  return !a.paused && !a.ended && a.currentTime > 0;
}

export function SfxControl() {
  const poolsRef = useRef<Record<SfxKey, Pool> | null>(null);
  const [muted, setMuted] = useState(false);
  const [sliderVolume, setSliderVolume] = useState(DEFAULT_SLIDER);

  const mutedRef = useRef(muted);
  const volRef = useRef(sliderVolume);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { volRef.current = sliderVolume; }, [sliderVolume]);

  // build pools once
  useEffect(() => {
    poolsRef.current = {
      merge: makePool(SRCS.merge),
      collision: makePool(SRCS.collision),
      attach: makePool(SRCS.attach),
    };
    return () => {
      const pools = poolsRef.current;
      if (!pools) return;
      (Object.keys(pools) as SfxKey[]).forEach((k) => {
        for (const v of pools[k].voices) {
          v.audio.pause();
          v.audio.src = "";
        }
      });
    };
  }, []);

  // live-update currently-playing voices when slider/mute changes
  useEffect(() => {
    const pools = poolsRef.current;
    if (!pools) return;
    const target = muted ? 0 : sliderVolume * MAX_VOLUME;
    (Object.keys(pools) as SfxKey[]).forEach((k) => {
      const voices = pools[k].voices;
      const playing = voices.filter(isPlaying).sort((x, y) => x.startedAt - y.startedAt);
      if (playing.length === 0) return;
      if (playing.length === 1) {
        playing[0].audio.volume = target;
      } else {
        playing[0].audio.volume = target * DUCK_RATIO; // older = ducked
        playing[1].audio.volume = target;
      }
    });
  }, [muted, sliderVolume]);

  // event listeners
  useEffect(() => {
    const trigger = (key: SfxKey) => {
      const pools = poolsRef.current;
      if (!pools) return;
      const pool = pools[key];
      const now = performance.now();
      if (now - pool.lastTrigger < MIN_INTERVAL_MS) return;
      pool.lastTrigger = now;

      const target = mutedRef.current ? 0 : volRef.current * MAX_VOLUME;
      const [v0, v1] = pool.voices;
      const p0 = isPlaying(v0);
      const p1 = isPlaying(v1);

      let toPlay: Voice;
      let other: Voice | null = null;

      if (!p0 && !p1) {
        toPlay = v0;
      } else if (p0 && !p1) {
        other = v0;
        toPlay = v1;
      } else if (!p0 && p1) {
        other = v1;
        toPlay = v0;
      } else {
        // both playing — restart the older one, keep the newer one as the ducked "other"
        const older = v0.startedAt <= v1.startedAt ? v0 : v1;
        const newer = older === v0 ? v1 : v0;
        toPlay = older;
        other = newer;
      }

      if (other) {
        other.audio.volume = target * DUCK_RATIO;
      }
      toPlay.audio.pause();
      toPlay.audio.currentTime = 0;
      toPlay.audio.volume = target;
      toPlay.startedAt = now;
      toPlay.audio.play().catch(() => {});
    };

    const onMerge = () => trigger("merge");
    const onCollision = () => trigger("collision");
    const onAttach = () => trigger("attach");
    window.addEventListener("orbis:sfx:merge", onMerge);
    window.addEventListener("orbis:sfx:collision", onCollision);
    window.addEventListener("orbis:sfx:attach", onAttach);
    return () => {
      window.removeEventListener("orbis:sfx:merge", onMerge);
      window.removeEventListener("orbis:sfx:collision", onCollision);
      window.removeEventListener("orbis:sfx:attach", onAttach);
    };
  }, []);

  // external toggle (keyboard F)
  useEffect(() => {
    const onToggle = () => setMuted((m) => !m);
    window.addEventListener("orbis:toggle-sfx", onToggle);
    return () => window.removeEventListener("orbis:toggle-sfx", onToggle);
  }, []);

  const Icon = muted ? VolumeX : AudioLines;

  return (
    <div className="group fixed left-4 top-[60px] z-20 flex items-start gap-2">
      <button
        onClick={() => setMuted((m) => !m)}
        title={`Sound effects (F) — ${muted ? "muted" : Math.round(sliderVolume * 100) + "%"}`}
        aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
        className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-white/5"
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
          aria-label="Sound effects volume"
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