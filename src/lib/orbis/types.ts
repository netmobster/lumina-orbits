export type CirclePalette = {
  name: string;
  core: string;
  shadow: string;
};

export type Circle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  color: { core: string; shadow: string };
  flashUntil: number;
  stickyWith: Set<number>;
  trail: { x: number; y: number }[];
};

export type SimConfig = {
  G: number;
  damping: number;
  mergeThreshold: number;
  spawnRate: number;
  maxForce: number;
};

export const DEFAULT_CONFIG: SimConfig = {
  G: 0.15,
  damping: 0.999,
  mergeThreshold: 30,
  spawnRate: 15,
  maxForce: 80,
};

export const radiusOf = (mass: number) => Math.sqrt(mass) * 4;

export type Preset = "drift" | "orbit" | "spiral";

export const PRESETS: Record<Preset, Partial<SimConfig>> = {
  drift:  { G: 0.06, damping: 0.997, mergeThreshold: 60, maxForce: 40 },
  orbit:  { G: 0.18, damping: 0.999, mergeThreshold: 40, maxForce: 80 },
  spiral: { G: 0.32, damping: 0.995, mergeThreshold: 30, maxForce: 140 },
};