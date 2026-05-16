import type { CirclePalette } from "./types";

export const PALETTE: CirclePalette[] = [
  { name: "teal",    core: "#1d9e75", shadow: "#0f6e56" },
  { name: "seafoam", core: "#5dcaa5", shadow: "#1d9e75" },
  { name: "purple",  core: "#7f77dd", shadow: "#534ab7" },
  { name: "coral",   core: "#d85a30", shadow: "#993c1d" },
  { name: "amber",   core: "#ef9f27", shadow: "#ba7517" },
];

export const ENEMY: CirclePalette = {
  name: "enemy", core: "#a32d2d", shadow: "#6e1d1d",
};

export const randomPaletteColor = () =>
  PALETTE[Math.floor(Math.random() * PALETTE.length)];

// hex blend by mass weight
export const blendColor = (
  a: { core: string; shadow: string },
  b: { core: string; shadow: string },
  wa: number,
  wb: number,
) => ({
  core: mixHex(a.core, b.core, wa, wb),
  shadow: mixHex(a.shadow, b.shadow, wa, wb),
});

function mixHex(h1: string, h2: string, w1: number, w2: number) {
  const c1 = hexToRgb(h1);
  const c2 = hexToRgb(h2);
  const t = w2 / (w1 + w2);
  const r = Math.round(c1.r * (1 - t) + c2.r * t);
  const g = Math.round(c1.g * (1 - t) + c2.g * t);
  const b = Math.round(c1.b * (1 - t) + c2.b * t);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}