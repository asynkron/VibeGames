/*
 * Gravibe Configuration
 * Constants, palettes, and default values
 */

export const colorRoles = [
  "accentPrimary",
  "accentSecondary",
  "accentTertiary",
  "accentQuaternary",
  "accentQuinary",
  "accentSenary",
];

export const DEFAULT_RENDERER_MODE = "svg";
export const BACKGROUND_EFFECTS = ["solid", "linear", "radial"];
export const DEFAULT_BACKGROUND_EFFECT = "linear";
export const LIVE_DEFAULT_INTERVAL = 2600;

// Each entry describes a selectable base palette so designers can add new themes quickly.
export const colorPalettes = [
  {
    id: "palette-1",
    label: "Palette 1 — Gravibe Sunrise",
    colors: ["#ef476f", "#ffd166", "#06d6a0", "#00c0ff", "#073b4c"],
  },
  {
    id: "palette-2",
    label: "Palette 2 — Cosmic Magenta",
    colors: ["#390099", "#9e0059", "#ff0054", "#00c0ff", "#ffbd00"],
  },
  {
    id: "palette-3",
    label: "Palette 3 — Retro Pop",
    colors: ["#ff595e", "#ffca3a", "#8ac926", "#00c0ff", "#6a4c93"],
  },
];

// Shared outline tone so every chart can render the same dark rim as the pie slices.
export const chartOutlineColor = "rgba(15, 23, 42, 0.95)";

// Shared glow/outline state so every renderer reads the same tuning values.
export const effectDefaults = {
  glowIntensity: 1,
  glowOpacity: 0.45,
  outlineScale: 1,
  haloBlur: 28,
  haloOpacity: 0.28,
};

