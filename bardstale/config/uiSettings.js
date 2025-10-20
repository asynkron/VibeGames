// Central tweakable knobs for Bard's Tale style UI and rendering surfaces.
// Keeping these values in one place makes it easy to experiment with the
// presentation without digging through rendering code.

export const RETRO_SURFACE_SIZE = 256;
export const RETRO_COLOR_COUNT = 64;
// Each colour channel is quantised to the same number of steps so that the
// combined palette stays within the requested 64 shades (4 × 4 × 4).
export const RETRO_COLOR_LEVELS_PER_CHANNEL = 4;

const UI_FONT_FAMILY = '"Press Start 2P", "VT323", monospace';

export const UI_SETTINGS = Object.freeze({
  resolution: Object.freeze({ width: 640, height: 480 }),
  fonts: Object.freeze({
    family: UI_FONT_FAMILY,
    title: `9px ${UI_FONT_FAMILY}`,
    text: `7px ${UI_FONT_FAMILY}`,
  }),
  colors: Object.freeze({
    text: '#f7efd6',
    accent: '#f4d28a',
    panelBackground: 'rgba(18, 16, 22, 0.86)',
    panelBorder: '#6a4f31',
    panelShadow: 'rgba(0, 0, 0, 0.65)',
    buttonBackground: 'rgba(70, 50, 30, 0.85)',
    buttonBorder: 'rgba(255, 216, 160, 0.45)',
  }),
  layout: Object.freeze({
    panelMargin: 18,
    infoPanelMinWidth: 180,
    infoPanelMinHeight: 180,
    infoPanelGap: 12,
    infoPanelFooterPadding: 10,
    logLineHeight: 10,
    logTopOffset: 42,
    logBottomPadding: 94,
    logMinHeight: 60,
    partyPanelTopOffset: -6,
    partyPanelBottomPadding: 32,
    partyPanelHeaderOffset: 26,
    partyPanelRowHeight: 12,
    partyPanelRowOffset: 6,
    partyPanelFooterPadding: 10,
    buttonVerticalSpacing: 6,
    buttonPaddingX: 8,
    buttonPaddingY: 3,
  }),
});

export function createPartyPanelRect(resolution = UI_SETTINGS.resolution, layout = UI_SETTINGS.layout) {
  // Mirrors the classic Bard's Tale roster layout: it sits underneath the
  // adventure log, spans the canvas width minus margins, and leaves breathing
  // room near the bottom for CRT borders.
  return Object.freeze({
    x: layout.panelMargin,
    y: resolution.height / 2 + layout.partyPanelTopOffset,
    width: resolution.width - layout.panelMargin * 2,
    height: resolution.height / 2 - layout.partyPanelBottomPadding,
  });
}
