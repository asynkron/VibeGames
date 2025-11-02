/*
 * Theme Palettes Index
 * Automatically exports all available color palettes from palette-*.js files
 * 
 * To add a new palette:
 * 1. Create a new file palette-N.js in this directory
 * 2. Export a paletteN object with id, label, palette, logging, and ui properties
 * 3. It will automatically appear in the theme picker!
 */

// Import all palette files
import { palette1 } from "./palette-1.js";
import { palette2 } from "./palette-2.js";
import { palette3 } from "./palette-3.js";
import { palette4 } from "./palette-4.js";
import { palette5 } from "./palette-5.js";
import { palette6 } from "./palette-6.js";
import { palette7 } from "./palette-7.js";

// Export individual palettes
export { palette1, palette2, palette3, palette4, palette5, palette6, palette7 };

// Array of all palettes for easy iteration - automatically includes all palettes
// When adding new palettes, just add them to this array!
export const colorPalettes = [
    palette1,
    palette2,
    palette3,
    palette4,
    palette5,
    palette6,
    palette7
];

// Log for debugging
console.log("[themes/index] Exported", colorPalettes.length, "palettes");
