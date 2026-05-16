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
};

export type SimConfig = {
  G: number;
  damping: number;
  mergeThreshold: number;
  spawnRate: number;
};

export const DEFAULT_CONFIG: SimConfig = {
  G: 0.15,
  damping: 0.999,
  mergeThreshold: 30,
  spawnRate: 15,
};

export const radiusOf = (mass: number) => Math.sqrt(mass) * 4;