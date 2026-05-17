import type { SimConfig } from "./types";
import type { EnemyConfig } from "./enemies";

export type ScenarioScriptStep = { at: number; agent: string };

export type Scenario = {
  id: string;
  name: string;
  blurb: string;
  sim: Partial<SimConfig>;
  enemies: Partial<EnemyConfig>;
  /** Auto-fire chaos agents at these sim-time offsets (seconds). */
  script?: ScenarioScriptStep[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: "cycle",
    name: "Singularity Cycle",
    blurb: "Mass gathers, collapses, scatters. Repeat.",
    sim: { spawnRate: 4, G: 0.5, mergeThreshold: 25 },
    enemies: { enabled: false },
    script: [
      { at: 60, agent: "singularity" },
      { at: 120, agent: "singularity" },
      { at: 180, agent: "singularity" },
      { at: 240, agent: "singularity" },
      { at: 300, agent: "singularity" },
    ],
  },
  {
    id: "bullethell",
    name: "Bullet Hell",
    blurb: "Fast waves, kinetic crashes shatter mass.",
    sim: { spawnRate: 6 },
    enemies: { enabled: true, waveRate: 6, swarmSize: 8, bossRate: 3, scoutSpeed: 1.6 },
    script: [
      { at: 12, agent: "shatter" },
      { at: 24, agent: "shatter" },
      { at: 36, agent: "shatter" },
      { at: 48, agent: "shatter" },
      { at: 60, agent: "shatter" },
      { at: 90, agent: "shatter" },
      { at: 120, agent: "shatter" },
    ],
  },
  {
    id: "bloom",
    name: "Slow Bloom",
    blurb: "Low gravity. Coalesce nurtures small bodies into mass.",
    sim: { G: 0.2, spawnRate: 8, damping: 0.998 },
    enemies: { enabled: false },
    script: [
      { at: 20, agent: "coalesce" },
      { at: 50, agent: "coalesce" },
      { at: 80, agent: "coalesce" },
      { at: 110, agent: "coalesce" },
      { at: 140, agent: "coalesce" },
    ],
  },
];