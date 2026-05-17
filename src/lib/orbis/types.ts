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
  /** previous frame position — used to draw a single segment into the trail buffer */
  px: number;
  py: number;
  /** cached √mass*4 — recompute on mass change */
  radius: number;
  /** cached "r,g,b" prefix for rgba() string building */
  rgbPrefix: string;
  /** enemy system: drained past threshold */
  infected?: boolean;
  /** enemy system: mass when first created (for convert ratio) */
  originalMass?: number;
  /** enemy system: brief white flash on conversion */
  infectionFlashUntil?: number;
};

export type SimConfig = {
  G: number;
  damping: number;
  mergeThreshold: number;
  spawnRate: number;
  maxForce: number;
  auraIntensity: number;
  ribbonDrift: number;
  trailLength: number;
  trailOpacity: number;
  glowSoftness: number;
  tailFadeRate: number;
  splitRate: number;
  xlEnabled: boolean;
  /** Seconds between auto-fired random chaos agents. Always on. */
  autoChaosInterval: number;
};

export const DEFAULT_CONFIG: SimConfig = {
  G: 0.35,
  damping: 0.9995,
  mergeThreshold: 30,
  spawnRate: 75,
  maxForce: 120,
  auraIntensity: 5.0,
  ribbonDrift: 1.0,
  trailLength: 550,
  trailOpacity: 100,
  glowSoftness: 3.2,
  tailFadeRate: 1.5,
  splitRate: 0,
  xlEnabled: false,
  autoChaosInterval: 20,
};

export const radiusOf = (mass: number) => Math.sqrt(mass) * 4;

/** Sim mass units that equal one Earth mass in the stats HUD. */
export const EARTH_MASS_UNITS = 25;

export type Preset = "chaos" | "orbit" | "spiral" | "life";

export type PresetPatch = Partial<SimConfig> & { speed?: number };

export type PulseKind =
  | "infection"
  | "shatter"
  | "singularity-charge"
  | "singularity-burst";

export type Pulse = {
  x: number;
  y: number;
  bornAt: number;
  /** defaults to "infection" when omitted (legacy enemy pulses) */
  kind?: PulseKind;
};

export const PRESETS: Record<Preset, PresetPatch> = {
  chaos:  {
    G: 0.7, damping: 1.0, mergeThreshold: 15, maxForce: 400,
    spawnRate: 15, auraIntensity: 10, ribbonDrift: 5,
    trailLength: 1400, trailOpacity: 200,
    glowSoftness: 6, tailFadeRate: 3,
    splitRate: 0.15, xlEnabled: true, speed: 8,
  },
  orbit:  { G: 0.35, damping: 0.9995, mergeThreshold: 30, maxForce: 120 },
  spiral: { G: 0.55, damping: 0.999,  mergeThreshold: 20, maxForce: 200 },
  life:   {
    G: 0.35, damping: 0.9995, mergeThreshold: 30, maxForce: 120,
    spawnRate: 3, auraIntensity: 10, ribbonDrift: 5, speed: 10,
  },
};