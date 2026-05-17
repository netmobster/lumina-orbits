import { useEffect, useRef, useState } from "react";
import { AudioLines, VolumeX } from "lucide-react";
import mergeUrl from "@/assets/sfx-merge.mp3";
import collisionUrl from "@/assets/sfx-collision.mp3";
import attachUrl from "@/assets/sfx-attach.mp3";

const MAX_VOLUME = 0.20;
const DEFAULT_SLIDER = 0.30;
const POOL_SIZE = 5;
const DUCK_STEP = 0.9;
const MIN_DUCK = 0.4;
/** Per-type min interval between triggers (ms). Prevents machine-gunning. */
const MIN_INTERVAL_MS = 60;
const MAX_OFFSET = 60;       // never seek past 60s into the file
const FADE_IN_MS = 2000;
const FADE_OUT_MS = 500;
const MIN_PLAY_MS = 3000;
const MAX_PLAY_MS = 5000;
const ASSUMED_DURATION = 30; // fallback if metadata not loaded yet

type Voice = {
  audio: HTMLAudioElement;
  startedAt: number;
  /** Envelope timestamps in performance.now() space. 0 = idle. */
  fadeInUntil: number;
  sustainUntil: number;
  fadeOutUntil: number;
  /** 1.0 or DUCK_RATIO */
  duckMul: number;
};
type Pool = { voices: Voice[]; lastTrigger: number };

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
    return {
      audio: a,
      startedAt: 0,
      fadeInUntil: 0,
      sustainUntil: 0,
      fadeOutUntil: 0,
      duckMul: 1,
    };
  };
  const voices: Voice[] = [];
  for (let i = 0; i < POOL_SIZE; i++) voices.push(mk());
  return { voices, lastTrigger: 0 };
}

function isPlaying(v: Voice) {
  return v.fadeOutUntil > 0 && performance.now() < v.fadeOutUntil;
}

/** Envelope value in [0, 1] for a voice at time `now`. */
function envelopeAt(v: Voice, now: number): number {
  if (v.fadeOutUntil === 0) return 0;
  if (now >= v.fadeOutUntil) return 0;
  if (now < v.fadeInUntil) {
    const t = (now - v.startedAt) / FADE_IN_MS;
    return Math.max(0, Math.min(1, t));
  }
  if (now < v.sustainUntil) return 1;
  // in fade-out
  const t = (v.fadeOutUntil - now) / FADE_OUT_MS;
  return Math.max(0, Math.min(1, t));
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

  // rAF loop: write audio.volume = target * envelope * duckMul for every voice.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pools = poolsRef.current;
      if (pools) {
        const now = performance.now();
        const target = mutedRef.current ? 0 : volRef.current * MAX_VOLUME;
        (Object.keys(pools) as SfxKey[]).forEach((k) => {
          for (const v of pools[k].voices) {
            if (v.fadeOutUntil === 0) continue;
            const env = envelopeAt(v, now);
            v.audio.volume = Math.max(0, Math.min(1, target * env * v.duckMul));
            if (now >= v.fadeOutUntil) {
              v.audio.pause();
              v.fadeOutUntil = 0;
              v.fadeInUntil = 0;
              v.sustainUntil = 0;
              v.duckMul = 1;
            }
          }
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // event listeners
  useEffect(() => {
    const trigger = (key: SfxKey) => {
      const pools = poolsRef.current;
      if (!pools) return;
      const pool = pools[key];
      const now = performance.now();
      if (now - pool.lastTrigger < MIN_INTERVAL_MS) return;
      pool.lastTrigger = now;

      // pick a free voice, or steal the oldest
      let toPlay: Voice | null = null;
      for (const v of pool.voices) {
        if (!isPlaying(v)) { toPlay = v; break; }
      }
      if (!toPlay) {
        toPlay = pool.voices[0];
        for (const v of pool.voices) if (v.startedAt < toPlay.startedAt) toPlay = v;
      }
      // duck every other still-playing voice by 10% (floored)
      for (const v of pool.voices) {
        if (v !== toPlay && isPlaying(v)) {
          v.duckMul = Math.max(MIN_DUCK, v.duckMul * DUCK_STEP);
        }
      }

      // pick a fresh random slice
      const playMs = MIN_PLAY_MS + Math.random() * (MAX_PLAY_MS - MIN_PLAY_MS);
      const playLen = playMs / 1000;
      const dur = Number.isFinite(toPlay.audio.duration) && toPlay.audio.duration > 0
        ? toPlay.audio.duration
        : ASSUMED_DURATION;
      const maxOffset = Math.max(0, Math.min(MAX_OFFSET, dur - playLen));
      const offset = Math.random() * maxOffset;

      toPlay.audio.pause();
      try { toPlay.audio.currentTime = offset; } catch { /* seek may fail before metadata */ }
      toPlay.audio.volume = 0;
      toPlay.startedAt = now;
      toPlay.fadeInUntil = now + FADE_IN_MS;
      toPlay.sustainUntil = now + (playMs - FADE_OUT_MS);
      toPlay.fadeOutUntil = now + playMs;
      toPlay.duckMul = 1;
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