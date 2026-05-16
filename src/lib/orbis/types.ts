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
  auraIntensity: number;
  ribbonDrift: number;
};

export const DEFAULT_CONFIG: SimConfig = {
  G: 0.35,
  damping: 0.9995,
  mergeThreshold: 30,
  spawnRate: 75,
  maxForce: 120,
  auraIntensity: 5.0,
  ribbonDrift: 1.0,
};

export const radiusOf = (mass: number) => Math.sqrt(mass) * 4;

export type Preset = "drift" | "orbit" | "spiral" | "life";

export type PresetPatch = Partial<SimConfig> & { speed?: number };

export const PRESETS: Record<Preset, PresetPatch> = {
  drift:  { G: 0.15, damping: 0.9998, mergeThreshold: 50, maxForce: 60 },
  orbit:  { G: 0.35, damping: 0.9995, mergeThreshold: 30, maxForce: 120 },
  spiral: { G: 0.55, damping: 0.999,  mergeThreshold: 20, maxForce: 200 },
  life:   {
    G: 0.35, damping: 0.9995, mergeThreshold: 30, maxForce: 120,
    spawnRate: 3, auraIntensity: 10, ribbonDrift: 5, speed: 10,
  },
};