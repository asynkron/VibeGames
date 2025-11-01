/*
 * Gravibe Neon Chart Kit
 * Each component exposes multiple datasets and detailed comments so AI agents can remix the visuals quickly.
 */

const colorRoles = [
  "accentPrimary",
  "accentSecondary",
  "accentTertiary",
  "accentQuaternary",
  "accentQuinary",
  "accentSenary",
];

// Each entry describes a selectable base palette so designers can add new themes quickly.
const colorPalettes = [
  {
    id: "palette-1",
    label: "Palette 1 — Gravibe Sunrise",
    colors: ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#073b4c"],
  },
  {
    id: "palette-2",
    label: "Palette 2 — Cosmic Magenta",
    colors: ["#390099", "#9e0059", "#ff0054", "#ff5400", "#ffbd00"],
  },
  {
    id: "palette-3",
    label: "Palette 3 — Retro Pop",
    colors: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"],
  },
];

const paletteState = {
  activeMapping: {},
  activeId: colorPalettes[0]?.id ?? "",
};

// We keep a registry of renderer callbacks so palette swaps can re-render everything in place.
const componentRegistry = new Set();

// Shared outline tone so every chart can render the same dark rim as the pie slices.
const chartOutlineColor = "rgba(15, 23, 42, 0.95)";

function rerenderAllComponents() {
  componentRegistry.forEach((rerender) => {
    try {
      rerender();
    } catch (error) {
      console.error("Failed to re-render component", error);
    }
  });
}

// Shared glow/outline state so every renderer reads the same tuning values.
const effectDefaults = {
  glowIntensity: 1,
  glowOpacity: 1,
  outlineScale: 1,
  haloBlur: 28,
  haloOpacity: 0.28,
};

const effectsState = { ...effectDefaults };

// Keep the CSS custom properties in sync so purely visual halos stay configurable too.
function applyEffectCssVariables() {
  const root = document.documentElement;
  root.style.setProperty("--chart-glow-scale", effectsState.glowIntensity.toFixed(2));
  root.style.setProperty("--chart-glow-opacity", effectsState.glowOpacity.toFixed(2));
  root.style.setProperty("--chart-outline-scale", effectsState.outlineScale.toFixed(2));
  root.style.setProperty("--chart-halo-blur", `${effectsState.haloBlur}px`);
  root.style.setProperty("--chart-halo-opacity", effectsState.haloOpacity.toFixed(2));
}

function withGlowBlur(base) {
  if (!Number.isFinite(base)) {
    return 0;
  }
  const scaled = base * effectsState.glowIntensity;
  return scaled <= 0 ? 0 : scaled;
}

function withGlowColor(colorRef, baseAlpha = 0.45) {
  const alpha = clamp(baseAlpha * effectsState.glowOpacity, 0, 1);
  return colorWithAlpha(colorRef, alpha);
}

function withOutlineWidth(base) {
  if (!Number.isFinite(base)) {
    return base;
  }
  const scaled = base * effectsState.outlineScale;
  return scaled < 0 ? 0 : scaled;
}

// Declarative description of each slider so wiring new controls stays concise.
const effectControlSchema = [
  {
    selector: "#effect-glow-strength",
    property: "glowIntensity",
    output: "#effect-glow-strength-value",
    parser: Number.parseFloat,
    format: (value) => `${value.toFixed(2)}×`,
  },
  {
    selector: "#effect-glow-opacity",
    property: "glowOpacity",
    output: "#effect-glow-opacity-value",
    parser: Number.parseFloat,
    format: (value) => value.toFixed(2),
  },
  {
    selector: "#effect-outline-scale",
    property: "outlineScale",
    output: "#effect-outline-scale-value",
    parser: Number.parseFloat,
    format: (value) => `${value.toFixed(2)}×`,
  },
  {
    selector: "#effect-halo-blur",
    property: "haloBlur",
    output: "#effect-halo-blur-value",
    parser: Number.parseFloat,
    format: (value) => `${Math.round(value)}px`,
  },
  {
    selector: "#effect-halo-opacity",
    property: "haloOpacity",
    output: "#effect-halo-opacity-value",
    parser: Number.parseFloat,
    format: (value) => value.toFixed(2),
  },
];

function applyEffectsState() {
  applyEffectCssVariables();
  rerenderAllComponents();
}

function registerEffectControls() {
  applyEffectCssVariables();

  effectControlSchema.forEach(({ selector, property, output, parser, format }) => {
    const input = document.querySelector(selector);
    if (!input) {
      return;
    }

    const outputElement = output ? document.querySelector(output) : null;
    const parseValue = typeof parser === "function" ? parser : Number.parseFloat;

    const min = input.min !== "" ? Number.parseFloat(input.min) : undefined;
    const max = input.max !== "" ? Number.parseFloat(input.max) : undefined;

    const updateDisplay = () => {
      if (outputElement && typeof format === "function") {
        outputElement.textContent = format(effectsState[property]);
      }
    };

    const initialValue = effectsState[property];
    if (initialValue !== undefined) {
      input.value = String(initialValue);
    }
    updateDisplay();

    input.addEventListener("input", (event) => {
      const raw = parseValue(event.target.value);
      if (!Number.isFinite(raw)) {
        return;
      }
      const clamped = clamp(raw, min, max);
      effectsState[property] = property === "haloBlur" ? Math.max(0, clamped) : clamped;
      input.value = String(effectsState[property]);
      updateDisplay();
      applyEffectsState();
    });
  });
}

function hexToRgb(hex) {
  const trimmed = hex.replace(/^#/, "");
  const bigint = parseInt(trimmed, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function toCssVar(role) {
  return `--${role.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

function resolveColor(colorRef) {
  if (!colorRef) {
    return colorRef;
  }

  if (paletteState.activeMapping[colorRef]) {
    return paletteState.activeMapping[colorRef];
  }

  return colorRef;
}

function colorWithAlpha(colorRef, alpha) {
  const color = resolveColor(colorRef);
  if (!color) {
    return color;
  }

  if (color.startsWith("#")) {
    const { r, g, b } = hexToRgb(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbaMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbaMatch) {
    const [r, g, b] = rgbaMatch[1]
      .split(",")
      .map((part) => parseFloat(part.trim()))
      .slice(0, 3);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}

function buildPaletteMapping(palette) {
  const mapping = {};
  colorRoles.forEach((role, index) => {
    const color = palette.colors[index % palette.colors.length];
    mapping[role] = color;
  });
  return mapping;
}

if (colorPalettes[0]) {
  paletteState.activeMapping = buildPaletteMapping(colorPalettes[0]);
}

function applyPalette(palette) {
  const mapping = buildPaletteMapping(palette);
  paletteState.activeMapping = mapping;
  paletteState.activeId = palette.id;

  const root = document.documentElement;
  colorRoles.forEach((role) => {
    const cssVar = toCssVar(role);
    const rgbVar = `${cssVar}-rgb`;
    const color = mapping[role];
    const { r, g, b } = hexToRgb(color);
    root.style.setProperty(cssVar, color);
    root.style.setProperty(rgbVar, `${r} ${g} ${b}`);
  });

  rerenderAllComponents();
}

const neonDatasets = {
  timeSeries: [
    {
      label: "Nebula Production Run",
      axis: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"],
      series: [
        {
          name: "Projected",
          color: "accentPrimary",
          data: [420, 460, 520, 580, 610, 640, 700, 760],
        },
        {
          name: "Actual",
          color: "accentSecondary",
          data: [400, 455, 540, 560, 630, 655, 690, 720],
        },
        {
          name: "Capacity",
          color: "accentTertiary",
          data: [480, 480, 640, 640, 720, 720, 780, 780],
        },
      ],
    },
    {
      label: "Synthwave Stream",
      axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        {
          name: "Listeners",
          color: "accentQuinary",
          data: [220, 260, 320, 420, 610, 580, 500],
        },
        {
          name: "Chat Bots",
          color: "accentQuaternary",
          data: [120, 140, 180, 260, 400, 360, 330],
        },
      ],
    },
  ],
  stateTimeline: [
    {
      label: "Night Shift Timeline",
      maxTime: 8,
      tracks: [
        {
          name: "Reactor Core",
          spans: [
            { state: "Idle", start: 0, end: 1.5 },
            { state: "Warmup", start: 1.5, end: 2.5 },
            { state: "Online", start: 2.5, end: 5.5 },
            { state: "Alert", start: 5.5, end: 6.5 },
            { state: "Cooldown", start: 6.5, end: 8 },
          ],
        },
        {
          name: "Shield Array",
          spans: [
            { state: "Offline", start: 0, end: 2 },
            { state: "Calibration", start: 2, end: 3 },
            { state: "Online", start: 3, end: 6 },
            { state: "Maintenance", start: 6, end: 8 },
          ],
        },
      ],
      palette: {
        Idle: "accentQuaternary",
        Warmup: "accentQuaternary",
        Online: "accentPrimary",
        Alert: "accentSenary",
        Cooldown: "accentTertiary",
        Offline: "#475569",
        Calibration: "accentSecondary",
        Maintenance: "accentSecondary",
      },
    },
    {
      label: "Day Shift Timeline",
      maxTime: 10,
      tracks: [
        {
          name: "Drone Bay",
          spans: [
            { state: "Maintenance", start: 0, end: 1 },
            { state: "Warmup", start: 1, end: 2 },
            { state: "Online", start: 2, end: 7 },
            { state: "Cooldown", start: 7, end: 9 },
            { state: "Idle", start: 9, end: 10 },
          ],
        },
        {
          name: "Sensor Deck",
          spans: [
            { state: "Online", start: 0, end: 4 },
            { state: "Alert", start: 4, end: 5 },
            { state: "Online", start: 5, end: 8 },
            { state: "Calibration", start: 8, end: 9 },
            { state: "Online", start: 9, end: 10 },
          ],
        },
      ],
      palette: {
        Idle: "accentQuaternary",
        Warmup: "accentQuaternary",
        Online: "accentPrimary",
        Alert: "accentSenary",
        Cooldown: "accentTertiary",
        Calibration: "accentSecondary",
        Maintenance: "accentSecondary",
      },
    },
  ],
  statusHistory: [
    {
      label: "Station Quads",
      categories: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00"],
      series: [
        {
          name: "Relay One",
          states: ["Online", "Online", "Alert", "Online", "Maintenance", "Online"],
          colors: {
            Online: "accentPrimary",
            Alert: "accentSenary",
            Maintenance: "accentSecondary",
          },
        },
        {
          name: "Relay Two",
          states: ["Idle", "Online", "Online", "Offline", "Online", "Online"],
          colors: {
            Idle: "#1f2937",
            Online: "accentPrimary",
            Offline: "#0f172a",
          },
        },
      ],
    },
    {
      label: "Squad Status",
      categories: ["Sec 1", "Sec 2", "Sec 3", "Sec 4", "Sec 5", "Sec 6"],
      series: [
        {
          name: "Alpha",
          states: ["Online", "Alert", "Online", "Online", "Online", "Maintenance"],
          colors: {
            Online: "accentPrimary",
            Alert: "accentSenary",
            Maintenance: "accentTertiary",
          },
        },
        {
          name: "Beta",
          states: ["Idle", "Online", "Online", "Alert", "Online", "Offline"],
          colors: {
            Idle: "#1f2937",
            Online: "accentPrimary",
            Alert: "accentSenary",
            Offline: "#0f172a",
          },
        },
      ],
    },
  ],
  barChart: [
    {
      label: "Signal Comparisons",
      axis: ["Node A", "Node B", "Node C", "Node D"],
      series: [
        {
          name: "Inbound",
          color: "accentPrimary",
          data: [46, 52, 48, 60],
        },
        {
          name: "Outbound",
          color: "accentSecondary",
          data: [34, 46, 42, 54],
        },
      ],
    },
    {
      label: "Energy Clusters",
      axis: ["Alpha", "Beta", "Gamma", "Delta"],
      series: [
        {
          name: "Baseline",
          color: "accentQuaternary",
          data: [28, 32, 30, 34],
        },
        {
          name: "Boosted",
          color: "accentTertiary",
          data: [36, 42, 40, 46],
        },
      ],
    },
  ],
  histogram: [
    {
      label: "Signal Noise",
      bins: [4, 9, 15, 12, 8, 5, 3, 2],
    },
    {
      label: "Particle Density",
      bins: [6, 11, 18, 14, 9, 6, 3, 1],
    },
  ],
  heatmap: [
    {
      label: "Command Grid",
      xLabels: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00"],
      yLabels: ["Alpha", "Beta", "Gamma", "Delta"],
      matrix: [
        [0.8, 0.6, 0.4, 0.3, 0.6, 0.9],
        [0.3, 0.5, 0.7, 0.6, 0.5, 0.4],
        [0.2, 0.4, 0.6, 0.8, 0.7, 0.5],
        [0.1, 0.3, 0.5, 0.7, 0.9, 0.8],
      ],
    },
    {
      label: "Thermal Scan",
      xLabels: ["Sector 1", "Sector 2", "Sector 3", "Sector 4", "Sector 5", "Sector 6"],
      yLabels: ["Deck 1", "Deck 2", "Deck 3", "Deck 4"],
      matrix: [
        [0.4, 0.6, 0.5, 0.7, 0.6, 0.5],
        [0.5, 0.7, 0.6, 0.8, 0.7, 0.6],
        [0.6, 0.8, 0.7, 0.9, 0.8, 0.7],
        [0.7, 0.9, 0.8, 1.0, 0.9, 0.8],
      ],
    },
  ],
  pieChart: [
    {
      label: "Signal Share",
      slices: [
        { name: "Beacon", value: 32, color: "accentPrimary" },
        { name: "Relay", value: 24, color: "accentSecondary" },
        { name: "Drone", value: 18, color: "accentTertiary" },
        { name: "Reserve", value: 12, color: "accentQuinary" },
      ],
    },
    {
      label: "Ops Channel",
      slices: [
        { name: "Command", value: 28, color: "accentPrimary" },
        { name: "Telemetry", value: 22, color: "accentSecondary" },
        { name: "Logistics", value: 20, color: "accentTertiary" },
        { name: "Maintenance", value: 18, color: "accentQuaternary" },
      ],
    },
  ],
  candlestick: [
    {
      label: "Flux Futures",
      axis: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00"],
      candles: [
        [420, 460, 410, 470],
        [460, 480, 450, 495],
        [480, 455, 440, 500],
        [455, 470, 430, 480],
        [470, 520, 460, 540],
        [520, 510, 500, 540],
      ],
    },
    {
      label: "Crystal Commodities",
      axis: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      candles: [
        [62, 68, 60, 69],
        [68, 71, 65, 74],
        [71, 70, 67, 73],
        [70, 74, 69, 76],
        [74, 78, 73, 80],
      ],
    },
  ],
  gauge: [
    {
      label: "Charge Level",
      value: 72,
      target: 85,
    },
    {
      label: "Stability",
      value: 58,
      target: 70,
    },
  ],
  trend: [
    {
      label: "Energy Trend",
      axis: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      series: [
        {
          name: "Baseline",
          color: "accentPrimary",
          data: [
            32, 34, 36, 33, 31, 29, 28, 32, 38, 42, 48, 52, 56, 61, 65, 63, 58, 54,
            50, 48, 45, 40, 36, 34,
          ],
        },
        {
          name: "Smoothed",
          color: "accentSecondary",
          data: [
            31, 33, 35, 34, 32, 31, 30, 33, 37, 41, 47, 51, 55, 60, 63, 61, 57, 53,
            49, 47, 44, 41, 37, 35,
          ],
        },
      ],
    },
    {
      label: "Engagement Trend",
      axis: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
      series: [
        {
          name: "Campaign A",
          color: "accentQuinary",
          data: [60, 68, 75, 72, 78, 82],
        },
        {
          name: "Campaign B",
          color: "accentSenary",
          data: [54, 57, 62, 65, 70, 74],
        },
      ],
    },
  ],
  xyScatter: [
    {
      label: "Drone Swarms",
      series: [
        {
          name: "Squad A",
          color: "accentPrimary",
          points: [
            [24, 32, 12],
            [28, 36, 14],
            [30, 40, 15],
            [34, 38, 18],
          ],
        },
        {
          name: "Squad B",
          color: "accentSecondary",
          points: [
            [14, 22, 10],
            [18, 26, 12],
            [20, 30, 11],
            [22, 28, 13],
          ],
        },
      ],
    },
    {
      label: "Probe Field",
      series: [
        {
          name: "North Arc",
          color: "accentTertiary",
          points: [
            [12, 42, 10],
            [16, 48, 12],
            [20, 44, 14],
            [24, 50, 16],
          ],
        },
        {
          name: "South Arc",
          color: "accentQuaternary",
          points: [
            [8, 20, 9],
            [10, 24, 11],
            [14, 28, 12],
            [18, 26, 13],
          ],
        },
      ],
    },
  ],
  stackedArea: [
    {
      label: "Latency Percentiles",
      axis: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"],
      series: [
        { name: "P50", color: "accentPrimary", data: [118, 124, 132, 136, 140, 148, 144, 138] },
        { name: "P75", color: "accentSecondary", data: [162, 170, 180, 186, 192, 204, 196, 184] },
        { name: "P95", color: "accentTertiary", data: [228, 236, 248, 256, 270, 284, 272, 258] },
        { name: "P99", color: "accentSenary", data: [318, 336, 352, 368, 384, 402, 388, 366] },
      ],
    },
    {
      label: "Checkout Latency Bands",
      axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        { name: "P50", color: "accentPrimary", data: [112, 116, 121, 132, 138, 146, 134] },
        { name: "P75", color: "accentSecondary", data: [154, 158, 168, 182, 196, 208, 188] },
        { name: "P95", color: "accentTertiary", data: [212, 220, 238, 258, 278, 292, 268] },
        { name: "P99", color: "accentSenary", data: [296, 308, 326, 348, 372, 392, 362] },
      ],
    },
  ],
  dualAxis: [
    {
      label: "Checkout Throughput",
      axis: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00"],
      yAxes: [
        { name: "Requests/min", min: 0, max: 900, suffix: "" },
        { name: "Error Rate %", min: 0, max: 6, suffix: "%", decimals: 1 },
      ],
      series: [
        {
          name: "Requests/min",
          type: "bar",
          axisIndex: 0,
          color: "accentPrimary",
          data: [520, 548, 590, 636, 702, 756, 810, 782],
        },
        {
          name: "Error Rate %",
          type: "line",
          axisIndex: 1,
          color: "accentSenary",
          data: [1.2, 1.0, 0.9, 1.4, 2.8, 3.6, 2.2, 1.6],
        },
      ],
    },
    {
      label: "API Load vs Saturation",
      axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      yAxes: [
        { name: "Requests/min", min: 0, max: 1000, suffix: "" },
        { name: "CPU Util %", min: 0, max: 100, suffix: "%", decimals: 0 },
      ],
      series: [
        {
          name: "Requests/min",
          type: "bar",
          axisIndex: 0,
          color: "accentPrimary",
          data: [640, 688, 734, 812, 868, 784, 720],
        },
        {
          name: "CPU Util %",
          type: "line",
          axisIndex: 1,
          color: "accentTertiary",
          data: [58, 62, 68, 74, 83, 70, 64],
        },
      ],
    },
  ],
  radar: [
    {
      label: "Prod Cluster Health",
      indicators: [
        { name: "CPU", max: 100 },
        { name: "Memory", max: 100 },
        { name: "Disk", max: 100 },
        { name: "Network", max: 100 },
        { name: "Saturation", max: 100 },
      ],
      series: [
        { name: "Prod East", color: "accentPrimary", data: [78, 68, 62, 84, 58] },
        { name: "Prod West", color: "accentSecondary", data: [72, 74, 58, 76, 64] },
      ],
    },
    {
      label: "Staging vs QA",
      indicators: [
        { name: "CPU", max: 100 },
        { name: "Memory", max: 100 },
        { name: "Disk", max: 100 },
        { name: "Network", max: 100 },
        { name: "Saturation", max: 100 },
      ],
      series: [
        { name: "Staging", color: "accentQuaternary", data: [46, 58, 44, 52, 38] },
        { name: "QA", color: "accentTertiary", data: [38, 42, 48, 46, 34] },
      ],
    },
  ],
  boxplot: [
    {
      label: "Latency Distribution",
      categories: ["Gateway", "Checkout", "Inventory", "Search"],
      boxes: [
        { name: "Gateway", color: "accentPrimary", values: [92, 118, 134, 168, 214] },
        { name: "Checkout", color: "accentSecondary", values: [104, 132, 156, 182, 236] },
        { name: "Inventory", color: "accentTertiary", values: [88, 118, 144, 176, 222] },
        { name: "Search", color: "accentQuinary", values: [96, 126, 162, 198, 246] },
      ],
      outliers: [
        { name: "Gateway spike", color: "accentSenary", value: [0, 246] },
        { name: "Checkout spike", color: "accentSenary", value: [1, 268] },
      ],
    },
    {
      label: "Worker Latency",
      categories: ["Ingest", "Transform", "Enrich", "Publish"],
      boxes: [
        { name: "Ingest", color: "accentPrimary", values: [64, 88, 104, 126, 154] },
        { name: "Transform", color: "accentSecondary", values: [72, 96, 116, 142, 176] },
        { name: "Enrich", color: "accentTertiary", values: [82, 108, 132, 158, 190] },
        { name: "Publish", color: "accentQuinary", values: [76, 102, 124, 150, 188] },
      ],
      outliers: [{ name: "Publish retry", color: "accentSenary", value: [3, 212] }],
    },
  ],
  sankey: [
    {
      label: "Ingress Request Flow",
      nodes: [
        { name: "Ingress", color: "accentPrimary" },
        { name: "API Gateway", color: "accentSecondary" },
        { name: "Auth", color: "accentTertiary" },
        { name: "Checkout", color: "accentQuinary" },
        { name: "Inventory", color: "accentQuaternary" },
        { name: "Search", color: "accentPrimary" },
        { name: "Payments", color: "accentSenary" },
        { name: "Data Lake", color: "accentSecondary" },
      ],
      links: [
        { source: "Ingress", target: "API Gateway", value: 820 },
        { source: "API Gateway", target: "Auth", value: 640 },
        { source: "API Gateway", target: "Search", value: 260 },
        { source: "Auth", target: "Checkout", value: 380 },
        { source: "Checkout", target: "Payments", value: 360 },
        { source: "Checkout", target: "Inventory", value: 240 },
        { source: "Inventory", target: "Data Lake", value: 160 },
        { source: "Search", target: "Data Lake", value: 220 },
      ],
    },
    {
      label: "Deployment Flow",
      nodes: [
        { name: "Commits", color: "accentPrimary" },
        { name: "CI", color: "accentSecondary" },
        { name: "Artifact", color: "accentTertiary" },
        { name: "Staging", color: "accentQuinary" },
        { name: "Prod", color: "accentSenary" },
        { name: "Rollback", color: "accentSecondary" },
      ],
      links: [
        { source: "Commits", target: "CI", value: 240 },
        { source: "CI", target: "Artifact", value: 210 },
        { source: "Artifact", target: "Staging", value: 188 },
        { source: "Staging", target: "Prod", value: 160 },
        { source: "Staging", target: "Rollback", value: 12 },
        { source: "Prod", target: "Rollback", value: 6 },
      ],
    },
  ],
  treemap: [
    {
      label: "Error Budget Burn",
      tree: [
        {
          name: "Client",
          color: "accentPrimary",
          children: [
            { name: "Mobile", value: 26, color: "accentPrimary" },
            { name: "Web", value: 32, color: "accentSecondary" },
          ],
        },
        {
          name: "Edge",
          color: "accentTertiary",
          children: [
            { name: "CDN", value: 18, color: "accentTertiary" },
            { name: "WAF", value: 12, color: "accentQuinary" },
          ],
        },
        {
          name: "Core",
          color: "accentSecondary",
          children: [
            { name: "API", value: 34, color: "accentSecondary" },
            { name: "Checkout", value: 28, color: "accentQuaternary" },
            { name: "Search", value: 22, color: "accentQuinary" },
          ],
        },
      ],
    },
    {
      label: "Incident Minutes",
      tree: [
        {
          name: "Infrastructure",
          color: "accentPrimary",
          children: [
            { name: "Compute", value: 42, color: "accentPrimary" },
            { name: "Storage", value: 28, color: "accentSecondary" },
          ],
        },
        {
          name: "Platform",
          color: "accentTertiary",
          children: [
            { name: "Deploy", value: 24, color: "accentTertiary" },
            { name: "Observability", value: 16, color: "accentQuinary" },
          ],
        },
        {
          name: "Product",
          color: "accentQuaternary",
          children: [
            { name: "Checkout", value: 30, color: "accentQuaternary" },
            { name: "Profile", value: 18, color: "accentSecondary" },
          ],
        },
      ],
    },
  ],
  funnel: [
    {
      label: "Deploy Pipeline",
      steps: [
        { name: "Commits", value: 240, color: "accentPrimary" },
        { name: "Build", value: 210, color: "accentSecondary" },
        { name: "Test", value: 188, color: "accentTertiary" },
        { name: "Staging", value: 164, color: "accentQuaternary" },
        { name: "Production", value: 152, color: "accentQuinary" },
      ],
    },
    {
      label: "Alert Lifecycle",
      steps: [
        { name: "Triggered", value: 180, color: "accentPrimary" },
        { name: "Triaged", value: 138, color: "accentSecondary" },
        { name: "Acknowledged", value: 112, color: "accentTertiary" },
        { name: "Resolved", value: 94, color: "accentQuinary" },
        { name: "Verified", value: 86, color: "accentSenary" },
      ],
    },
  ],
  stat: [
    {
      label: "Core Output",
      value: 9820,
      delta: +320,
      deltaLabel: "vs. prior cycle",
      meta: "Neon array running above target",
    },
    {
      label: "Signal Strength",
      value: 76,
      unit: "%",
      delta: -4,
      deltaLabel: "hourly shift",
      meta: "Hold at 70% minimum",
    },
  ],
  barGauge: [
    {
      label: "Resource Allocation",
      sections: [
        { name: "Ops", value: 0.32, color: "accentPrimary" },
        { name: "Defense", value: 0.26, color: "accentSecondary" },
        { name: "Support", value: 0.18, color: "accentTertiary" },
        { name: "Reserve", value: 0.14, color: "accentQuaternary" },
      ],
    },
    {
      label: "Squad Contribution",
      sections: [
        { name: "Alpha", value: 0.28, color: "accentPrimary" },
        { name: "Beta", value: 0.24, color: "accentSecondary" },
        { name: "Gamma", value: 0.22, color: "accentTertiary" },
        { name: "Delta", value: 0.18, color: "accentQuaternary" },
      ],
    },
  ],
  stackedBar: [
    {
      label: "Incident Volume by Severity",
      axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        { name: "Critical", color: "accentSenary", data: [4, 6, 3, 5, 8, 2, 1] },
        { name: "Major", color: "accentSecondary", data: [12, 10, 14, 15, 18, 9, 8] },
        { name: "Minor", color: "accentPrimary", data: [22, 20, 24, 26, 28, 16, 14] },
        { name: "Info", color: "accentQuaternary", data: [18, 16, 20, 22, 24, 12, 10] },
      ],
    },
    {
      label: "Deployment Outcomes",
      axis: ["Sprint 21", "Sprint 22", "Sprint 23", "Sprint 24", "Sprint 25"],
      series: [
        { name: "Failed", color: "accentSenary", data: [3, 2, 4, 3, 2] },
        { name: "Rolled Back", color: "accentSecondary", data: [5, 4, 5, 6, 5] },
        { name: "Passed", color: "accentPrimary", data: [18, 20, 22, 24, 26] },
      ],
    },
  ],
  calendarHeatmap: [
    {
      label: "Deployments per Day",
      year: "2024",
      entries: [
        { date: "2024-01-03", value: 4 },
        { date: "2024-01-08", value: 7 },
        { date: "2024-01-12", value: 3 },
        { date: "2024-01-16", value: 6 },
        { date: "2024-01-21", value: 9 },
        { date: "2024-02-02", value: 5 },
        { date: "2024-02-08", value: 8 },
        { date: "2024-02-12", value: 4 },
        { date: "2024-02-20", value: 7 },
        { date: "2024-02-27", value: 6 },
        { date: "2024-03-04", value: 10 },
        { date: "2024-03-11", value: 6 },
        { date: "2024-03-15", value: 5 },
        { date: "2024-03-19", value: 8 },
        { date: "2024-03-25", value: 11 },
      ],
    },
    {
      label: "Paged Alerts",
      year: "2023",
      entries: [
        { date: "2023-07-02", value: 2 },
        { date: "2023-07-05", value: 5 },
        { date: "2023-07-08", value: 3 },
        { date: "2023-07-14", value: 6 },
        { date: "2023-07-20", value: 4 },
        { date: "2023-07-26", value: 7 },
        { date: "2023-08-03", value: 5 },
        { date: "2023-08-10", value: 4 },
        { date: "2023-08-17", value: 6 },
        { date: "2023-08-23", value: 8 },
        { date: "2023-08-29", value: 5 },
        { date: "2023-09-04", value: 7 },
        { date: "2023-09-12", value: 9 },
        { date: "2023-09-19", value: 6 },
        { date: "2023-09-27", value: 4 },
      ],
    },
  ],
  themeRiver: [
    {
      label: "Service Traffic Composition",
      axis: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
      streams: [
        {
          name: "Checkout",
          color: "accentPrimary",
          data: [45, 50, 56, 62, 70, 78, 86, 82, 76, 68, 60, 52],
        },
        {
          name: "Search",
          color: "accentSecondary",
          data: [38, 42, 48, 54, 60, 65, 72, 70, 64, 58, 50, 46],
        },
        {
          name: "Profile",
          color: "accentTertiary",
          data: [22, 26, 28, 30, 36, 40, 44, 46, 42, 38, 32, 28],
        },
        {
          name: "Support",
          color: "accentQuinary",
          data: [12, 14, 18, 20, 24, 28, 32, 34, 30, 26, 22, 18],
        },
      ],
    },
    {
      label: "Error Budget Burn",
      axis: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
      streams: [
        { name: "Client", color: "accentPrimary", data: [16, 18, 20, 24, 22, 20] },
        { name: "Edge", color: "accentSecondary", data: [10, 12, 14, 16, 17, 15] },
        { name: "Core", color: "accentTertiary", data: [22, 24, 26, 28, 30, 27] },
        { name: "Data", color: "accentQuaternary", data: [8, 9, 10, 12, 14, 13] },
      ],
    },
  ],
  sunburst: [
    {
      label: "Service Ownership Map",
      tree: [
        {
          name: "Customer",
          color: "accentPrimary",
          children: [
            {
              name: "Checkout",
              color: "accentPrimary",
              children: [
                { name: "Cart", value: 18, color: "accentPrimary" },
                { name: "Payments", value: 24, color: "accentSecondary" },
              ],
            },
            {
              name: "Account",
              color: "accentQuinary",
              children: [
                { name: "Profile", value: 20, color: "accentQuinary" },
                { name: "Security", value: 16, color: "accentSenary" },
              ],
            },
          ],
        },
        {
          name: "Platform",
          color: "accentSecondary",
          children: [
            { name: "Ingest", value: 22, color: "accentSecondary" },
            { name: "Stream", value: 18, color: "accentTertiary" },
            { name: "Analytics", value: 26, color: "accentQuaternary" },
          ],
        },
        {
          name: "Infrastructure",
          color: "accentTertiary",
          children: [
            { name: "Compute", value: 30, color: "accentTertiary" },
            { name: "Storage", value: 26, color: "accentSecondary" },
            { name: "Network", value: 22, color: "accentPrimary" },
          ],
        },
      ],
    },
    {
      label: "Incident Taxonomy",
      tree: [
        {
          name: "Availability",
          color: "accentPrimary",
          children: [
            { name: "Outage", value: 18, color: "accentSenary" },
            { name: "Degradation", value: 24, color: "accentPrimary" },
          ],
        },
        {
          name: "Performance",
          color: "accentSecondary",
          children: [
            { name: "Latency", value: 20, color: "accentSecondary" },
            { name: "Throughput", value: 16, color: "accentQuinary" },
          ],
        },
        {
          name: "Security",
          color: "accentTertiary",
          children: [
            { name: "Vulnerability", value: 14, color: "accentTertiary" },
            { name: "Policy", value: 12, color: "accentQuaternary" },
          ],
        },
      ],
    },
  ],
  pictorialBar: [
    {
      label: "SLO Compliance",
      items: [
        { name: "Checkout", actual: 94, target: 99, color: "accentPrimary" },
        { name: "Search", actual: 96, target: 99, color: "accentSecondary" },
        { name: "Profile", actual: 92, target: 98, color: "accentTertiary" },
        { name: "Payments", actual: 97, target: 99, color: "accentSenary" },
      ],
    },
    {
      label: "Backup Success Rate",
      items: [
        { name: "Database", actual: 91, target: 95, color: "accentPrimary" },
        { name: "Blob Store", actual: 95, target: 98, color: "accentSecondary" },
        { name: "Search Index", actual: 89, target: 95, color: "accentTertiary" },
        { name: "Analytics", actual: 93, target: 97, color: "accentQuinary" },
      ],
    },
  ],
};

function createLiveTimeSeriesDataset() {
  const axisLength = 12;
  const baseSeries = [
    { name: "Projected", color: "accentPrimary", base: 650, variance: 28, min: 520, max: 780 },
    { name: "Actual", color: "accentSecondary", base: 610, variance: 32, min: 480, max: 760 },
    { name: "Capacity", color: "accentTertiary", base: 720, variance: 18, min: 640, max: 820 },
  ];

  const axis = [];
  const dataset = {
    label: "Live Flux Telemetry",
    live: true,
    axis,
    series: baseSeries.map(({ name, color }) => ({ name, color, data: [] })),
    interval: 2200,
    next,
    reset,
  };

  let tick = 0;

  function formatTick(index) {
    const hour = String(index % 24).padStart(2, "0");
    const minute = String((index * 5) % 60).padStart(2, "0");
    return `${hour}:${minute}`;
  }

  function reset() {
    axis.length = 0;
    tick = 0;
    for (let i = 0; i < axisLength; i += 1) {
      axis.push(formatTick(tick));
      tick += 1;
    }

    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      series.data.length = 0;
      let value = config.base;
      for (let i = 0; i < axisLength; i += 1) {
        value = jitterValue(value, config.variance, config.min, config.max);
        series.data.push(Math.round(value));
      }
    });
  }

  function next() {
    axis.push(formatTick(tick));
    tick += 1;
    if (axis.length > axisLength) {
      axis.shift();
    }

    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      const last = series.data[series.data.length - 1] ?? config.base;
      const value = jitterValue(last, config.variance, config.min, config.max);
      series.data.push(Math.round(value));
      if (series.data.length > axisLength) {
        series.data.shift();
      }
    });
  }

  reset();
  return dataset;
}

function createLiveStateTimelineDataset() {
  const palette = {
    Idle: "accentQuaternary",
    Warmup: "accentQuaternary",
    Online: "accentPrimary",
    Alert: "accentSenary",
    Cooldown: "accentTertiary",
    Offline: "#475569",
    Calibration: "accentSecondary",
    Maintenance: "accentSecondary",
  };

  const dataset = {
    label: "Live Shift Timeline",
    live: true,
    maxTime: 8,
    tracks: [],
    palette,
    interval: 6000,
    next: reset,
    reset,
  };

  function buildTrack(name) {
    const spans = [];
    let cursor = 0;
    while (cursor < dataset.maxTime) {
      const duration = randomFloat(0.6, 1.6, 2);
      const end = Math.min(dataset.maxTime, parseFloat((cursor + duration).toFixed(2)));
      const state = weightedRandomPick([
        { value: "Online", weight: 4 },
        { value: "Idle", weight: 2 },
        { value: "Warmup", weight: 1.5 },
        { value: "Cooldown", weight: 1.5 },
        { value: "Alert", weight: 1 },
        { value: "Maintenance", weight: 0.8 },
        { value: "Calibration", weight: 0.7 },
        { value: "Offline", weight: 0.6 },
      ]);
      spans.push({ state, start: parseFloat(cursor.toFixed(2)), end });
      cursor = end;
    }
    return { name, spans };
  }

  function reset() {
    dataset.tracks = [
      buildTrack("Reactor Core"),
      buildTrack("Shield Array"),
      buildTrack("Drone Bay"),
    ];
  }

  reset();
  return dataset;
}

function createLiveStatusHistoryDataset() {
  const statusPalette = {
    Idle: "#1f2937",
    Online: "accentPrimary",
    Alert: "accentSenary",
    Maintenance: "accentSecondary",
    Offline: "#0f172a",
    Standby: "accentTertiary",
  };

  const categoryCount = 6;
  let tick = 0;

  const dataset = {
    label: "Live Relay Status",
    live: true,
    categories: Array.from({ length: categoryCount }, () => ""),
    series: [],
    interval: 5000,
    reset,
    next: reset,
  };

  const teams = ["Relay One", "Relay Two", "Relay Three"];
  const states = Object.keys(statusPalette);

  function formatCategory(index) {
    const hour = String(index % 24).padStart(2, "0");
    const minute = String((index * 10) % 60).padStart(2, "0");
    return `${hour}:${minute}`;
  }

  function rotateCategories() {
    for (let i = 0; i < categoryCount; i += 1) {
      dataset.categories[i] = formatCategory(tick + i);
    }
    tick += 1;
  }

  function randomStates() {
    return dataset.categories.map(() => states[randomInt(0, states.length - 1)]);
  }

  function reset() {
    rotateCategories();
    dataset.series = teams.map((name) => ({
      name,
      states: randomStates(),
      colors: statusPalette,
    }));
  }

  reset();
  return dataset;
}

function createLiveBarChartDataset() {
  const dataset = {
    label: "Live Signal Load",
    live: true,
    axis: ["Node A", "Node B", "Node C", "Node D"],
    series: [
      { name: "Inbound", color: "accentPrimary", data: [] },
      { name: "Outbound", color: "accentSecondary", data: [] },
    ],
    interval: 2600,
    reset,
    next,
  };

  function reset() {
    dataset.series.forEach((series) => {
      series.data = dataset.axis.map(() => randomInt(32, 68));
    });
  }

  function next() {
    dataset.series.forEach((series) => {
      series.data = series.data.map((value) => Math.round(jitterValue(value, 6, 20, 80)));
    });
  }

  reset();
  return dataset;
}

function createLiveHistogramDataset() {
  const bins = 8;
  const dataset = {
    label: "Live Signal Noise",
    live: true,
    bins: [],
    interval: 3200,
    reset,
    next,
  };

  function reset() {
    dataset.bins = Array.from({ length: bins }, () => randomInt(4, 18));
  }

  function next() {
    dataset.bins = dataset.bins.map((value) => Math.max(2, Math.round(jitterValue(value, 4, 2, 24))));
  }

  reset();
  return dataset;
}

function createLiveHeatmapDataset() {
  const width = 6;
  const height = 4;
  const dataset = {
    label: "Live Command Grid",
    live: true,
    xLabels: Array.from({ length: width }, (_, i) => `T+${i}h`),
    yLabels: ["Alpha", "Beta", "Gamma", "Delta"],
    matrix: [],
    interval: 2800,
    reset,
    next,
  };

  function reset() {
    dataset.matrix = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => randomFloat(0.2, 1, 2)),
    );
  }

  function next() {
    dataset.matrix = dataset.matrix.map((row) =>
      row.map((value) => parseFloat(jitterValue(value, 0.15, 0.05, 1).toFixed(2))),
    );
  }

  reset();
  return dataset;
}

function createLivePieChartDataset() {
  const slices = [
    { name: "Beacon", color: "accentPrimary" },
    { name: "Relay", color: "accentSecondary" },
    { name: "Drone", color: "accentTertiary" },
    { name: "Reserve", color: "accentQuinary" },
  ];

  const dataset = {
    label: "Live Signal Share",
    live: true,
    slices: [],
    interval: 3400,
    reset,
    next: reset,
  };

  function reset() {
    const totals = slices.map(() => randomInt(12, 36));
    const sum = totals.reduce((acc, value) => acc + value, 0);
    dataset.slices = slices.map((slice, index) => ({
      ...slice,
      value: Math.round((totals[index] / sum) * 100),
    }));
  }

  reset();
  return dataset;
}

function createLiveCandlestickDataset() {
  const axisLength = 10;
  const axis = [];
  const candles = [];
  let tick = 0;

  const dataset = {
    label: "Live Flux Futures",
    live: true,
    axis,
    candles,
    interval: 3600,
    reset,
    next,
  };

  function axisLabel(index) {
    return `T${String(index).padStart(2, "0")}`;
  }

  function makeCandle(base) {
    const open = jitterValue(base, 12, 420, 780);
    const close = jitterValue(open, 14, 420, 800);
    const high = Math.max(open, close) + Math.random() * 16;
    const low = Math.min(open, close) - Math.random() * 16;
    return [Math.round(open), Math.round(close), Math.round(low), Math.round(high)];
  }

  function reset() {
    axis.length = 0;
    candles.length = 0;
    tick = 0;
    let base = 640;
    for (let i = 0; i < axisLength; i += 1) {
      axis.push(axisLabel(tick));
      tick += 1;
      const candle = makeCandle(base);
      candles.push(candle);
      base = candle[1];
    }
  }

  function next() {
    axis.push(axisLabel(tick));
    tick += 1;
    if (axis.length > axisLength) {
      axis.shift();
    }

    const base = candles[candles.length - 1]?.[1] ?? 640;
    const candle = makeCandle(base);
    candles.push(candle);
    if (candles.length > axisLength) {
      candles.shift();
    }
  }

  reset();
  return dataset;
}

function createLiveGaugeDataset() {
  const dataset = {
    label: "Live Charge Level",
    live: true,
    value: 70,
    target: 85,
    interval: 2400,
    reset,
    next,
  };

  function reset() {
    dataset.value = randomInt(54, 88);
  }

  function next() {
    dataset.value = Math.round(jitterValue(dataset.value, 6, 40, 100));
  }

  reset();
  return dataset;
}

function createLiveTrendDataset() {
  const axis = Array.from({ length: 18 }, (_, i) => `T+${i}`);
  const baseSeries = [
    { name: "Baseline", color: "accentPrimary", base: 38, variance: 6, min: 20, max: 80 },
    { name: "Smoothed", color: "accentSecondary", base: 34, variance: 5, min: 18, max: 74 },
  ];

  const dataset = {
    label: "Live Energy Trend",
    live: true,
    axis,
    series: baseSeries.map(({ name, color }) => ({ name, color, data: [] })),
    interval: 2500,
    reset,
    next,
  };

  function reset() {
    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      series.data.length = 0;
      let value = config.base;
      for (let i = 0; i < axis.length; i += 1) {
        value = jitterValue(value, config.variance, config.min, config.max);
        series.data.push(parseFloat(value.toFixed(1)));
      }
    });
  }

  function next() {
    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      const last = series.data[series.data.length - 1] ?? config.base;
      const value = jitterValue(last, config.variance, config.min, config.max);
      series.data.push(parseFloat(value.toFixed(1)));
      series.data.shift();
    });
  }

  reset();
  return dataset;
}

function createLiveScatterDataset() {
  const dataset = {
    label: "Live Drone Swarms",
    live: true,
    series: [
      { name: "Squad A", color: "accentPrimary", points: [] },
      { name: "Squad B", color: "accentSecondary", points: [] },
    ],
    interval: 3000,
    reset,
    next,
  };

  function randomPoint() {
    return [randomInt(10, 40), randomInt(20, 60), randomInt(8, 18)];
  }

  function reset() {
    dataset.series.forEach((series) => {
      series.points = Array.from({ length: 4 }, () => randomPoint());
    });
  }

  function next() {
    dataset.series.forEach((series) => {
      series.points = series.points.map(([x, y, z]) => [
        Math.round(jitterValue(x, 4, 8, 48)),
        Math.round(jitterValue(y, 6, 10, 70)),
        Math.round(jitterValue(z, 3, 6, 22)),
      ]);
    });
  }

  reset();
  return dataset;
}

function createLiveStackedAreaDataset() {
  const axisLength = 12;
  const axis = [];
  const percentileSeries = [
    { name: "P50", color: "accentPrimary", base: 130, variance: 8, min: 90, max: 180 },
    { name: "P75", color: "accentSecondary", base: 170, variance: 10, min: 120, max: 230 },
    { name: "P95", color: "accentTertiary", base: 230, variance: 12, min: 160, max: 320 },
    { name: "P99", color: "accentSenary", base: 310, variance: 14, min: 200, max: 420 },
  ];

  const dataset = {
    label: "Live Latency Bands",
    live: true,
    axis,
    series: percentileSeries.map(({ name, color }) => ({ name, color, data: [] })),
    interval: 2800,
    reset,
    next,
  };

  let tick = 0;

  function formatTick(index) {
    const minutes = index * 5;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function reset() {
    axis.length = 0;
    tick = 0;
    for (let i = 0; i < axisLength; i += 1) {
      axis.push(formatTick(tick));
      tick += 1;
    }

    dataset.series.forEach((series, index) => {
      const config = percentileSeries[index];
      series.data.length = 0;
      let value = config.base;
      for (let i = 0; i < axis.length; i += 1) {
        value = jitterValue(value, config.variance, config.min, config.max);
        series.data.push(Math.round(value));
      }
    });
  }

  function next() {
    axis.push(formatTick(tick));
    tick += 1;
    if (axis.length > axisLength) {
      axis.shift();
    }

    dataset.series.forEach((series, index) => {
      const config = percentileSeries[index];
      const last = series.data[series.data.length - 1] ?? config.base;
      const value = jitterValue(last, config.variance, config.min, config.max);
      series.data.push(Math.round(value));
      if (series.data.length > axisLength) {
        series.data.shift();
      }
    });
  }

  reset();
  return dataset;
}

function createLiveDualAxisDataset() {
  const axisLength = 8;
  const axis = [];
  const baseSeries = [
    {
      name: "Requests/min",
      type: "bar",
      axisIndex: 0,
      color: "accentPrimary",
      base: 680,
      variance: 60,
      min: 420,
      max: 940,
    },
    {
      name: "Error Rate %",
      type: "line",
      axisIndex: 1,
      color: "accentSenary",
      base: 1.8,
      variance: 0.9,
      min: 0.2,
      max: 5,
      precision: 1,
    },
  ];

  const dataset = {
    label: "Live Throughput vs Errors",
    live: true,
    axis,
    yAxes: [
      { name: "Requests/min", min: 0, max: 960, suffix: "" },
      { name: "Error Rate %", min: 0, max: 6, suffix: "%", decimals: 1 },
    ],
    series: baseSeries.map(({ name, type, axisIndex, color }) => ({
      name,
      type,
      axisIndex,
      color,
      data: [],
    })),
    interval: 2600,
    reset,
    next,
  };

  let tick = 0;

  function formatTick(index) {
    return `${String(index * 2).padStart(2, "0")}:00`;
  }

  function reset() {
    axis.length = 0;
    tick = 0;
    for (let i = 0; i < axisLength; i += 1) {
      axis.push(formatTick(tick));
      tick += 1;
    }

    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      series.data.length = 0;
      let value = config.base;
      for (let i = 0; i < axis.length; i += 1) {
        value = jitterValue(value, config.variance, config.min, config.max);
        const formatted =
          typeof config.precision === "number"
            ? parseFloat(value.toFixed(config.precision))
            : Math.round(value);
        series.data.push(formatted);
      }
    });
  }

  function next() {
    axis.push(formatTick(tick));
    tick += 1;
    if (axis.length > axisLength) {
      axis.shift();
    }

    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      const last = series.data[series.data.length - 1] ?? config.base;
      const value = jitterValue(last, config.variance, config.min, config.max);
      const formatted =
        typeof config.precision === "number"
          ? parseFloat(value.toFixed(config.precision))
          : Math.round(value);
      series.data.push(formatted);
      if (series.data.length > axisLength) {
        series.data.shift();
      }
    });
  }

  reset();
  return dataset;
}

function createLiveRadarDataset() {
  const indicators = [
    { name: "CPU", max: 100 },
    { name: "Memory", max: 100 },
    { name: "Disk", max: 100 },
    { name: "Network", max: 100 },
    { name: "Saturation", max: 100 },
  ];

  const baseSeries = [
    { name: "Prod East", color: "accentPrimary", min: 55, max: 88 },
    { name: "Prod West", color: "accentSecondary", min: 52, max: 84 },
  ];

  const dataset = {
    label: "Live Cluster Health",
    live: true,
    indicators,
    series: baseSeries.map(({ name, color }) => ({ name, color, data: [] })),
    interval: 4200,
    reset,
    next,
  };

  function randomIndicatorValue(min, max) {
    return randomInt(min, max);
  }

  function reset() {
    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      series.data = indicators.map(() => randomIndicatorValue(config.min, config.max));
    });
  }

  function next() {
    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      series.data = series.data.map((value) =>
        Math.round(jitterValue(value, 6, config.min, config.max)),
      );
    });
  }

  reset();
  return dataset;
}

function createLiveFunnelDataset() {
  const stepConfigs = [
    { name: "Commits", color: "accentPrimary", ratio: 1 },
    { name: "Build", color: "accentSecondary", ratio: 0.88 },
    { name: "Test", color: "accentTertiary", ratio: 0.8 },
    { name: "Staging", color: "accentQuaternary", ratio: 0.72 },
    { name: "Production", color: "accentQuinary", ratio: 0.68 },
  ];

  const dataset = {
    label: "Live Deploy Pipeline",
    live: true,
    steps: [],
    interval: 4800,
    reset,
    next: reset,
  };

  function reset() {
    let current = randomInt(210, 280);
    dataset.steps = stepConfigs.map((step, index) => {
      if (index === 0) {
        return { ...step, value: current };
      }
      current = Math.max(
        0,
        Math.round(jitterValue(current * step.ratio, current * 0.08, 0, current)),
      );
      return { ...step, value: current };
    });
  }

  reset();
  return dataset;
}

function createLiveStatDataset() {
  const dataset = {
    label: "Live Core Output",
    live: true,
    value: 9600,
    delta: 0,
    deltaLabel: "vs. prior pulse",
    meta: "Neon array adjusting in real time",
    interval: 2600,
    unit: "",
    reset,
    next,
  };

  function reset() {
    dataset.value = randomInt(9000, 10200);
    dataset.delta = randomInt(-120, 180);
  }

  function next() {
    dataset.value = randomInt(9000, 10400);
    dataset.delta = randomInt(-180, 260);
  }

  reset();
  return dataset;
}

function createLiveBarGaugeDataset() {
  const sections = [
    { name: "Ops", color: "accentPrimary" },
    { name: "Defense", color: "accentSecondary" },
    { name: "Support", color: "accentTertiary" },
    { name: "Reserve", color: "accentQuaternary" },
  ];

  const dataset = {
    label: "Live Resource Allocation",
    live: true,
    sections: [],
    interval: 3200,
    reset,
    next: reset,
  };

  function reset() {
    const weights = sections.map(() => Math.random() + 0.4);
    const total = weights.reduce((sum, value) => sum + value, 0);
    dataset.sections = sections.map((section, index) => ({
      ...section,
      value: parseFloat((weights[index] / total).toFixed(2)),
    }));
  }

  reset();
  return dataset;
}

function registerLiveDatasets() {
  neonDatasets.timeSeries.push(createLiveTimeSeriesDataset());
  neonDatasets.stateTimeline.push(createLiveStateTimelineDataset());
  neonDatasets.statusHistory.push(createLiveStatusHistoryDataset());
  neonDatasets.barChart.push(createLiveBarChartDataset());
  neonDatasets.histogram.push(createLiveHistogramDataset());
  neonDatasets.heatmap.push(createLiveHeatmapDataset());
  neonDatasets.pieChart.push(createLivePieChartDataset());
  neonDatasets.candlestick.push(createLiveCandlestickDataset());
  neonDatasets.gauge.push(createLiveGaugeDataset());
  neonDatasets.trend.push(createLiveTrendDataset());
  neonDatasets.xyScatter.push(createLiveScatterDataset());
  neonDatasets.stackedArea.push(createLiveStackedAreaDataset());
  neonDatasets.dualAxis.push(createLiveDualAxisDataset());
  neonDatasets.radar.push(createLiveRadarDataset());
  neonDatasets.stat.push(createLiveStatDataset());
  neonDatasets.barGauge.push(createLiveBarGaugeDataset());
  neonDatasets.funnel.push(createLiveFunnelDataset());
}

registerLiveDatasets();

const chartResizeHandlers = new WeakMap();

function initDatasetSelector(article, datasetKey) {
  const select = article.querySelector(".dataset-select");
  const entries = neonDatasets[datasetKey] ?? [];

  if (!select) {
    return { select: null, defaultIndex: 0 };
  }

  select.innerHTML = "";

  entries.forEach((dataset, index) => {
    const option = document.createElement("option");
    option.value = index.toString();
    const liveSuffix = dataset.live ? " (Live)" : "";
    option.textContent = `${dataset.label}${liveSuffix}`;
    select.append(option);
  });

  // Default to the first streaming dataset so the dashboard feels alive on load.
  const liveIndex = entries.findIndex((dataset) => dataset.live);
  return { select, defaultIndex: liveIndex >= 0 ? liveIndex : 0 };
}

function createChartInstance(container) {
  const existing = echarts.getInstanceByDom(container);
  if (existing) {
    return existing;
  }

  const chart = echarts.init(container);
  const resizeHandler = () => chart.resize();
  chartResizeHandlers.set(chart, resizeHandler);
  window.addEventListener("resize", resizeHandler);
  return chart;
}

function applyChartOption(chart, option, overrides = {}) {
  // Force a full option refresh so live updates do not flicker between clear/redraw cycles.
  chart.setOption(option, {
    notMerge: true,
    lazyUpdate: false,
    ...overrides,
  });
}

const LIVE_DEFAULT_INTERVAL = 2600;

function clamp(value, min, max) {
  if (typeof min === "number") {
    value = Math.max(min, value);
  }
  if (typeof max === "number") {
    value = Math.min(max, value);
  }
  return value;
}

function jitterValue(value, variance, min, max) {
  const delta = (Math.random() * variance * 2) - variance;
  return clamp(value + delta, min, max);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

function weightedRandomPick(items) {
  const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  const target = Math.random() * total;
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight ?? 1;
    if (target <= cumulative) return item.value;
  }
  return items[items.length - 1]?.value;
}

function startLiveUpdater(callback, interval = LIVE_DEFAULT_INTERVAL) {
  const timer = window.setInterval(() => {
    try {
      callback();
    } catch (error) {
      console.error("Live data update failed", error);
    }
  }, interval);

  return {
    stop() {
      window.clearInterval(timer);
    },
  };
}

function renderTimeSeries(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    animationDuration: 700,
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    legend: {
      data: (dataset.series ?? []).map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    series: (dataset.series ?? []).map((series) => ({
      name: series.name,
      type: "line",
      smooth: true,
      data: series.data,
      showSymbol: false,
      lineStyle: {
        width: 3,
        color: resolveColor(series.color),
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colorWithAlpha(series.color, 0.53) },
          { offset: 1, color: "rgba(15, 23, 42, 0)" },
        ]),
      },
    })),
  });

  return chart;
}

function renderStateTimeline(dataset, container) {
  const chart = createChartInstance(container);

  const timelineSeries = dataset.tracks.flatMap((track, index) =>
    track.spans.map((span) => {
      const colorRef = dataset.palette[span.state] ?? "accentPrimary";
      return {
        name: track.name,
        value: [index, span.start, span.end, span.state],
        itemStyle: {
          color: resolveColor(colorRef),
        },
      };
    }),
  );

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "4%",
      right: "4%",
      top: "16%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      min: 0,
      max: dataset.maxTime,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    yAxis: {
      type: "category",
      data: dataset.tracks.map((track) => track.name),
      axisLabel: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        const [index, start, end, state] = params.data.value;
        const track = dataset.tracks[index];
        return `State: ${state}<br/>Track: ${track.name}<br/>From: ${start}h to ${end}h`;
      },
    },
    series: [
      {
        type: "custom",
        renderItem(params, api) {
          const categoryIndex = api.value(0);
          const start = api.coord([api.value(1), categoryIndex]);
          const end = api.coord([api.value(2), categoryIndex]);
          const height = api.size([0, 1])[1] * 0.6;

          return {
            type: "rect",
            shape: echarts.graphic.clipRectByRect(
              {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
                height,
              },
              {
                x: params.coordSys.x,
                y: params.coordSys.y,
                width: params.coordSys.width,
                height: params.coordSys.height,
              },
            ),
            style: api.style({
              opacity: 0.9,
              shadowBlur: withGlowBlur(20),
              shadowColor: withGlowColor(api.style().fill, 0.8),
              stroke: chartOutlineColor,
              lineWidth: withOutlineWidth(1),
            }),
          };
        },
        data: timelineSeries,
      },
    ],
  });

  return chart;
}

function renderStatusHistory(dataset, container) {
  const chart = createChartInstance(container);

  const categories = dataset.categories;
  const statusSet = new Set();

  dataset.series.forEach((series) => {
    series.states.forEach((state) => statusSet.add(state));
  });

  const statuses = Array.from(statusSet);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: (dataset.series ?? []).map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    grid: {
      left: "6%",
      right: "4%",
      top: "14%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "bar",
      stack: "status",
      emphasis: {
        focus: "series",
      },
      data: series.states.map((state) => ({
        value: 1,
        status: state,
        itemStyle: {
          color: resolveColor(series.colors[state] ?? "accentPrimary"),
          opacity: 0.9,
          shadowBlur: withGlowBlur(16),
          shadowColor: withGlowColor(series.colors[state] ?? "accentPrimary", 0.65),
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
      })),
    })),
  });

  return chart;
}

function renderBarChart(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    grid: {
      left: "6%",
      right: "4%",
      top: "14%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "bar",
      barWidth: "35%",
      data: series.data,
      itemStyle: {
        borderRadius: [6, 6, 6, 6],
        shadowBlur: withGlowBlur(18),
        shadowColor: withGlowColor(series.color, 0.53),
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: resolveColor(series.color) },
          { offset: 1, color: colorWithAlpha(series.color, 0.47) },
        ]),
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
      },
    })),
  });

  return chart;
}

function renderHistogram(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.bins.map((_, index) => `Band ${index + 1}`),
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    series: [
      {
        type: "bar",
        data: dataset.bins,
        barWidth: "60%",
        itemStyle: {
          borderRadius: [10, 10, 10, 10],
          shadowBlur: withGlowBlur(20),
          shadowColor: withGlowColor("accentPrimary", 0.35),
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colorWithAlpha("accentPrimary", 0.9) },
            { offset: 1, color: colorWithAlpha("accentTertiary", 0.6) },
          ]),
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
      },
    ],
  });

  return chart;
}

function renderHeatmap(dataset, container) {
  const chart = createChartInstance(container);

  const flattened = dataset.matrix.flat();
  const min = Math.min(...flattened);
  const max = Math.max(...flattened);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.xLabels,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "category",
      data: dataset.yLabels,
      axisLabel: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      textStyle: {
        color: "rgba(226, 232, 240, 0.7)",
      },
      inRange: {
        color: ["#1e293b", resolveColor("accentPrimary")],
      },
    },
    tooltip: {
      position: "top",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ value }) => `Intensity: ${value[2]}`,
    },
    series: [
      {
        name: dataset.label,
        type: "heatmap",
        data: dataset.matrix.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => [columnIndex, rowIndex, value]),
        ),
        itemStyle: {
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: withGlowBlur(20),
            shadowColor: withGlowColor("accentPrimary", 0.45),
          },
        },
      },
    ],
  });

  return chart;
}

function renderPieChart(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ name, value, percent }) => `${name}: ${value} (${percent}%)`,
    },
    legend: {
      orient: "vertical",
      left: "left",
      top: "center",
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
    },
    series: [
      {
        name: dataset.label,
        type: "pie",
        radius: ["40%", "70%"],
        center: ["60%", "50%"],
        roseType: "radius",
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 12,
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(2),
        },
        label: {
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
        },
        labelLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.5)",
          },
        },
        data: dataset.slices.map((slice) => ({
          value: slice.value,
          name: slice.name,
          itemStyle: {
            color: resolveColor(slice.color),
            shadowBlur: withGlowBlur(25),
            shadowColor: withGlowColor(slice.color, 0.53),
          },
        })),
      },
    ],
  });

  return chart;
}

function renderCandlestick(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    animationDuration: 700,
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.axis,
      scale: true,
      boundaryGap: true,
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    yAxis: {
      scale: true,
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    series: [
      {
        name: dataset.label,
        type: "candlestick",
        data: dataset.candles,
        itemStyle: {
          color: colorWithAlpha("accentPrimary", 0.7),
          color0: colorWithAlpha("accentSecondary", 0.7),
          borderColor: colorWithAlpha("accentPrimary", 0.9),
          borderColor0: colorWithAlpha("accentSecondary", 0.9),
          shadowBlur: withGlowBlur(18),
          shadowColor: withGlowColor("accentPrimary", 0.35),
        },
      },
    ],
  });

  return chart;
}

function renderGauge(dataset, container) {
  const chart = createChartInstance(container);

  // Clamp values so the gauge never renders beyond its 0-100 domain.
  const value = Math.min(Math.max(dataset.value ?? 0, 0), 100);
  const target = Math.min(Math.max(dataset.target ?? 0, 0), 100);
  const valueRatio = value / 100;
  const targetRatio = target / 100;

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: () =>
        `${dataset.label}<br/>Current: ${value}%<br/>Target: ${target}%`,
    },
    series: [
      {
        // Wide halo that pushes a bloom behind the active charge arc.
        name: `${dataset.label} Halo`,
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "104%",
        axisLine: {
          lineStyle: {
            width: 28,
            color: [
              [valueRatio, colorWithAlpha("accentPrimary", 0.18)],
              [1, "rgba(15, 23, 42, 0)"],
            ],
            shadowBlur: withGlowBlur(45),
            shadowColor: withGlowColor("accentPrimary", 0.6),
          },
        },
        pointer: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          show: false,
        },
        title: {
          show: false,
        },
        silent: true,
        z: 0,
      },
      {
        // Outer track that highlights the remaining distance to the target threshold.
        name: `${dataset.label} Track`,
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "100%",
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [targetRatio, colorWithAlpha("accentPrimary", 0.15)],
              [1, "rgba(15, 23, 42, 0.45)"],
            ],
            shadowBlur: withGlowBlur(20),
            shadowColor: withGlowColor("accentPrimary", 0.28),
          },
        },
        splitNumber: 5,
        splitLine: {
          distance: -4,
          length: 12,
          lineStyle: {
            color: colorWithAlpha("accentPrimary", 0.25),
          },
        },
        axisLabel: {
          color: "rgba(148, 163, 184, 0.65)",
          fontFamily: "Share Tech Mono, monospace",
        },
        axisTick: {
          show: false,
        },
        pointer: {
          show: false,
        },
        detail: {
          show: false,
        },
        title: {
          show: false,
        },
        silent: true,
        z: 1,
      },
      {
        // Inner neon arc that animates to the current value.
        name: dataset.label,
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "84%",
        progress: {
          show: true,
          roundCap: true,
          width: 16,
          itemStyle: {
            color: colorWithAlpha("accentPrimary", 0.95),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
            shadowBlur: withGlowBlur(26),
            shadowColor: withGlowColor("accentPrimary", 0.55),
          },
        },
        axisLine: {
          lineStyle: {
            width: 16,
            color: [
              [valueRatio, colorWithAlpha("accentPrimary", 0.95)],
              [1, "rgba(15, 23, 42, 0.05)"],
            ],
            shadowBlur: withGlowBlur(32),
            shadowColor: withGlowColor("accentPrimary", 0.45),
          },
        },
        pointer: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          valueAnimation: true,
          formatter: "{value}%",
          color: "rgba(226, 232, 240, 0.9)",
          fontFamily: "Share Tech Mono, monospace",
          fontSize: 28,
          offsetCenter: [0, "40%"],
        },
        title: {
          color: "rgba(226, 232, 240, 0.75)",
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 14,
          offsetCenter: [0, "70%"],
        },
        data: [
          {
            value,
            name: dataset.label,
          },
        ],
        z: 3,
      },
      {
        // Thin pointer that marks the target threshold.
        name: "Target",
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        radius: "100%",
        axisLine: {
          lineStyle: {
            width: 0,
          },
        },
        pointer: {
          show: true,
          width: 6,
          length: "68%",
          itemStyle: {
            color: colorWithAlpha("accentSecondary", 0.95),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
            shadowBlur: withGlowBlur(20),
            shadowColor: withGlowColor("accentSecondary", 0.45),
          },
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 16,
          itemStyle: {
            color: colorWithAlpha("accentPrimary", 0.95),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(4),
            shadowBlur: withGlowBlur(18),
            shadowColor: withGlowColor("accentPrimary", 0.45),
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          show: false,
        },
        title: {
          show: false,
        },
        data: [
          {
            value: target,
          },
        ],
        z: 5,
      },
    ],
  });

  return chart;
}

function renderTrend(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: {
        width: 2,
        color: resolveColor(series.color),
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colorWithAlpha(series.color, 0.6) },
          { offset: 1, color: "rgba(15, 23, 42, 0)" },
        ]),
      },
      data: series.data,
    })),
  });

  return chart;
}

function renderXYScatter(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ data, seriesName }) =>
        `${seriesName}<br/>X: ${data[0]}<br/>Y: ${data[1]}<br/>Z: ${data[2]}`,
    },
    xAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "scatter",
      symbolSize: (data) => data[2],
      itemStyle: {
        color: resolveColor(series.color),
        shadowBlur: withGlowBlur(15),
        shadowColor: withGlowColor(series.color, 0.53),
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
      },
      data: series.points,
    })),
  });

  return chart;
}

function renderStackedArea(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: dataset.series.map((series) => ({
      name: series.name,
      type: "line",
      stack: dataset.label ?? "stacked",
      smooth: true,
      symbol: "none",
      lineStyle: {
        width: 2,
        color: resolveColor(series.color),
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colorWithAlpha(series.color, 0.65) },
          { offset: 1, color: "rgba(15, 23, 42, 0)" },
        ]),
      },
      emphasis: {
        focus: "series",
      },
      data: series.data,
    })),
  });

  return chart;
}

function renderDualAxis(dataset, container) {
  const chart = createChartInstance(container);

  const axisConfigs = dataset.yAxes ?? [];
  const axisColorMap = new Map();
  (dataset.series ?? []).forEach((series) => {
    const index = series.axisIndex ?? 0;
    if (!axisColorMap.has(index)) {
      axisColorMap.set(index, resolveColor(series.color ?? "accentPrimary"));
    }
  });

  const yAxis = axisConfigs.map((axis, index) => {
    const resolvedColor = axisColorMap.get(index) ?? resolveColor("accentPrimary");
    const decimals = typeof axis.decimals === "number" ? axis.decimals : 0;

    return {
      type: "value",
      name: axis.name ?? "",
      position: index === 0 ? "left" : "right",
      offset: index > 1 ? (index - 1) * 56 : 0,
      min: axis.min,
      max: axis.max,
      axisLine: {
        lineStyle: {
          color: colorWithAlpha(resolvedColor, 0.45),
        },
      },
      axisLabel: {
        formatter: (value) => {
          const formatted = Number.parseFloat(value).toFixed(decimals);
          return `${formatted}${axis.suffix ?? ""}`;
        },
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        show: index === 0,
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    };
  });

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: axisConfigs.length > 1 ? "12%" : "4%",
      top: "14%",
      bottom: "12%",
      containLabel: true,
    },
    legend: {
      data: dataset.series.map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.8)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    xAxis: {
      type: "category",
      data: dataset.axis,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis,
    series: (dataset.series ?? []).map((series) => {
      const isBar = (series.type ?? "bar") === "bar";
      const color = resolveColor(series.color);
      return {
        name: series.name,
        type: series.type ?? "bar",
        yAxisIndex: series.axisIndex ?? 0,
        data: series.data,
        smooth: (series.type ?? "") === "line",
        showSymbol: (series.type ?? "") === "line",
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: isBar
          ? {
              borderRadius: [6, 6, 0, 0],
              shadowBlur: withGlowBlur(18),
              shadowColor: withGlowColor(series.color, 0.45),
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color },
                { offset: 1, color: colorWithAlpha(series.color, 0.45) },
              ]),
              borderColor: chartOutlineColor,
              borderWidth: withOutlineWidth(1),
            }
          : {
              color,
              shadowBlur: withGlowBlur(16),
              shadowColor: withGlowColor(series.color, 0.45),
              borderColor: chartOutlineColor,
              borderWidth: withOutlineWidth(1),
            },
      };
    }),
  });

  return chart;
}

function renderRadar(dataset, container) {
  const chart = createChartInstance(container);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: (dataset.series ?? []).map((series) => series.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
    },
    radar: {
      indicator: dataset.indicators ?? [],
      radius: "62%",
      splitNumber: 5,
      shape: "polygon",
      axisName: {
        color: "rgba(226, 232, 240, 0.75)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      splitArea: {
        areaStyle: {
          color: [
            "rgba(15, 23, 42, 0.9)",
            "rgba(15, 23, 42, 0.7)",
            "rgba(15, 23, 42, 0.5)",
            "rgba(15, 23, 42, 0.3)",
            "rgba(15, 23, 42, 0.1)",
          ],
        },
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.18),
        },
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.22),
        },
      },
    },
    series: [
      {
        type: "radar",
        data: (dataset.series ?? []).map((series) => ({
          value: series.data,
          name: series.name,
          lineStyle: {
            color: resolveColor(series.color),
            width: 2,
          },
          areaStyle: {
            color: colorWithAlpha(series.color, 0.25),
          },
          symbol: "circle",
          symbolSize: 6,
          itemStyle: {
            color: resolveColor(series.color),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
            shadowBlur: withGlowBlur(14),
            shadowColor: withGlowColor(series.color, 0.4),
          },
        })),
      },
    ],
  });

  return chart;
}

function renderBoxplot(dataset, container) {
  const chart = createChartInstance(container);

  const boxData = (dataset.boxes ?? []).map((box) => ({
    value: box.values,
    name: box.name,
    itemStyle: {
      color: colorWithAlpha(box.color ?? "accentPrimary", 0.65),
      borderColor: resolveColor(box.color ?? "accentPrimary"),
      borderWidth: withOutlineWidth(1),
      shadowBlur: withGlowBlur(18),
      shadowColor: withGlowColor(box.color ?? "accentPrimary", 0.45),
    },
  }));

  const outlierData = (dataset.outliers ?? []).map((outlier) => ({
    value: outlier.value,
    name: outlier.name,
    itemStyle: {
      color: resolveColor(outlier.color ?? "accentSenary"),
      shadowBlur: withGlowBlur(16),
      shadowColor: withGlowColor(outlier.color ?? "accentSenary", 0.45),
      borderColor: chartOutlineColor,
      borderWidth: withOutlineWidth(1),
    },
  }));

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "8%",
      right: "6%",
      top: "14%",
      bottom: "12%",
      containLabel: true,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        if (params.seriesType === "scatter") {
          return `${params.name}<br/>Value: ${params.data.value[1]} ms`;
        }
        if (Array.isArray(params.data?.value)) {
          const [min, q1, median, q3, max] = params.data.value;
          return `${params.name}<br/>P25: ${q1} ms<br/>P50: ${median} ms<br/>P75: ${q3} ms<br/>Min/Max: ${min} ms / ${max} ms`;
        }
        return params.name;
      },
    },
    xAxis: {
      type: "category",
      data: dataset.categories,
      boundaryGap: true,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.85)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.8)",
        fontFamily: "Share Tech Mono, monospace",
        formatter: (value) => `${value} ms`,
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: [
      {
        name: dataset.label,
        type: "boxplot",
        data: boxData,
      },
      {
        name: "Outliers",
        type: "scatter",
        data: outlierData,
      },
    ],
  });

  return chart;
}

function renderSankey(dataset, container) {
  const chart = createChartInstance(container);

  const colorLookup = new Map();
  (dataset.nodes ?? []).forEach((node) => {
    colorLookup.set(node.name, resolveColor(node.color ?? "accentPrimary"));
  });

  const nodes = (dataset.nodes ?? []).map((node) => {
    const color = colorLookup.get(node.name) ?? resolveColor("accentPrimary");
    return {
      name: node.name,
      itemStyle: {
        color,
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
        shadowBlur: withGlowBlur(18),
        shadowColor: withGlowColor(node.color ?? color, 0.4),
      },
    };
  });

  const links = (dataset.links ?? []).map((link) => {
    const sourceColor = colorLookup.get(link.source) ?? resolveColor("accentPrimary");
    return {
      ...link,
      lineStyle: {
        color: colorWithAlpha(sourceColor, 0.55),
        opacity: 0.85,
        curveness: 0.5,
      },
    };
  });

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        if (params.dataType === "edge") {
          return `${params.data.source} → ${params.data.target}<br/>${params.data.value} req/min`;
        }
        return `${params.name}`;
      },
    },
    series: [
      {
        type: "sankey",
        data: nodes,
        links,
        draggable: false,
        emphasis: {
          focus: "adjacency",
        },
        label: {
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
        },
        lineStyle: {
          curveness: 0.5,
        },
      },
    ],
  });

  return chart;
}

function renderTreemap(dataset, container) {
  const chart = createChartInstance(container);

  function mapNode(node) {
    const color = resolveColor(node.color ?? "accentPrimary");
    const children = Array.isArray(node.children) ? node.children.map(mapNode) : null;
    const value =
      node.value ?? children?.reduce((sum, child) => sum + (child.value ?? 0), 0) ?? 0;
    return {
      name: node.name,
      value,
      itemStyle: {
        color,
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
        shadowBlur: withGlowBlur(16),
        shadowColor: withGlowColor(node.color ?? color, 0.35),
      },
      ...(children ? { children } : {}),
    };
  }

  const data = (dataset.tree ?? []).map(mapNode);

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ data }) =>
        data ? `${data.name}<br/>Value: ${data.value ?? 0}` : dataset.label,
    },
    series: [
      {
        type: "treemap",
        data,
        leafDepth: 2,
        roam: false,
        breadcrumb: {
          show: false,
        },
        label: {
          show: true,
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
        },
        levels: [
          {
            itemStyle: {
              borderColor: colorWithAlpha("accentPrimary", 0.18),
              borderWidth: withOutlineWidth(2),
              gapWidth: 4,
            },
          },
          {
            itemStyle: {
              borderColor: colorWithAlpha("accentPrimary", 0.1),
              borderWidth: withOutlineWidth(1),
              gapWidth: 2,
            },
          },
        ],
      },
    ],
  });

  return chart;
}

function renderFunnel(dataset, container) {
  const chart = createChartInstance(container);

  const data = (dataset.steps ?? []).map((step) => ({
    name: step.name,
    value: step.value,
    itemStyle: {
      color: resolveColor(step.color ?? "accentPrimary"),
      borderColor: chartOutlineColor,
      borderWidth: withOutlineWidth(1),
      shadowBlur: withGlowBlur(20),
      shadowColor: withGlowColor(step.color ?? "accentPrimary", 0.45),
    },
  }));

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: ({ name, value }) => `${name}<br/>Value: ${value}`,
    },
    series: [
      {
        name: dataset.label,
        type: "funnel",
        left: "12%",
        right: "12%",
        top: "10%",
        bottom: "10%",
        width: "76%",
        sort: "descending",
        gap: 4,
        label: {
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
        },
        data,
      },
    ],
  });

  return chart;
}

function renderStat(dataset, article) {
  const valueElement = article.querySelector(".stat-value");
  const metaElement = article.querySelector(".stat-meta");

  valueElement.textContent = `${dataset.value}${dataset.unit ?? ""}`;
  valueElement.setAttribute("data-label", dataset.label);

  const delta = dataset.delta ?? 0;
  const deltaPrefix = delta > 0 ? "+" : "";
  const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";

  metaElement.innerHTML = `
    <span>${dataset.label}</span>
    <span class="stat-delta ${deltaClass}">
      ${deltaPrefix}${delta}${dataset.unit ?? ""}
      <small>${dataset.deltaLabel ?? "change"}</small>
    </span>
  `;

  metaElement.querySelector(".stat-delta").style.color =
    delta >= 0 ? resolveColor("accentQuinary") : resolveColor("accentSenary");
}

function renderBarGauge(dataset, container) {
  const chart = createChartInstance(container);

  const total = dataset.sections.reduce((sum, section) => sum + section.value, 0) || 1;
  const sections = dataset.sections.map((section) => ({
    ...section,
    ratio: section.value / total,
  }));

  applyChartOption(chart, {
    backgroundColor: "transparent",
    animationDuration: 700,
    grid: {
      left: "6%",
      right: "6%",
      top: "22%",
      bottom: "28%",
      containLabel: true,
    },
    legend: {
      data: sections.map((section) => section.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      bottom: 0,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        const section = sections.find((entry) => entry.name === params.seriesName);
        if (!section) {
          return dataset.label;
        }

        const percent = Math.round(section.ratio * 100);
        const rawValue = section.value <= 1 ? `${Math.round(section.value * 100)}%` : section.value;
        return `${section.name}<br/>Share: ${percent}%<br/>Value: ${rawValue}`;
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 1,
      boundaryGap: [0, 0],
      axisLabel: {
        formatter: (value) => `${Math.round(value * 100)}%`,
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    yAxis: {
      type: "category",
      data: [dataset.label],
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: "rgba(226, 232, 240, 0.78)",
        fontFamily: "Space Grotesk, sans-serif",
        fontWeight: 600,
      },
    },
    series: [
      {
        name: "Background",
        type: "bar",
        data: [1],
        barWidth: 26,
        itemStyle: {
          color: "rgba(15, 23, 42, 0.65)",
          borderRadius: 999,
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
        silent: true,
        z: 1,
      },
      ...sections.map((section) => ({
        name: section.name,
        type: "bar",
        stack: "allocation",
        barWidth: 18,
        data: [section.ratio],
        itemStyle: {
          color: resolveColor(section.color),
          borderRadius: [999, 999, 999, 999],
          shadowBlur: withGlowBlur(25),
          shadowColor: withGlowColor(section.color, 0.4),
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
        emphasis: {
          focus: "series",
        },
        label: {
          show: true,
          position: "inside",
          formatter: () => `${Math.round(section.ratio * 100)}%`,
          color: "rgba(15, 23, 42, 0.92)",
          fontFamily: "Share Tech Mono, monospace",
          fontSize: 12,
        },
        z: 3,
      })),
    ],
  });

  return chart;
}

function renderStackedBar(dataset, container) {
  const chart = createChartInstance(container);

  const categories = dataset.axis ?? [];
  const series = (dataset.series ?? []).map((entry) => ({
    name: entry.name,
    type: "bar",
    stack: "total",
    emphasis: { focus: "series" },
    barWidth: 18,
    data: entry.data ?? [],
    itemStyle: {
      color: resolveColor(entry.color ?? "accentPrimary"),
      borderColor: chartOutlineColor,
      borderWidth: withOutlineWidth(1),
      shadowBlur: withGlowBlur(18),
      shadowColor: withGlowColor(entry.color ?? "accentPrimary", 0.4),
    },
  }));

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "6%",
      right: "6%",
      top: "14%",
      bottom: "14%",
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      axisPointer: { type: "shadow" },
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        if (!Array.isArray(params)) {
          return dataset.label;
        }
        const total = params.reduce((sum, item) => sum + (item.data ?? 0), 0);
        const lines = params
          .map((item) => `${item.marker} ${item.seriesName}: ${item.data}`)
          .join("<br/>");
        return `${params[0]?.axisValue ?? ""}<br/>${lines}<br/><strong>Total: ${total}</strong>`;
      },
    },
    legend: {
      data: series.map((entry) => entry.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series,
  });

  return chart;
}

function renderCalendarHeatmap(dataset, container) {
  const chart = createChartInstance(container);

  const entries = dataset.entries ?? [];
  const data = entries.map((entry) => [entry.date, entry.value ?? 0]);
  const values = entries.map((entry) => entry.value ?? 0);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const valueLookup = new Map(entries.map((entry) => [entry.date, entry.value ?? 0]));

  applyChartOption(chart, {
    backgroundColor: "transparent",
    visualMap: {
      min: minValue,
      max: maxValue,
      orient: "horizontal",
      left: "center",
      bottom: 12,
      textStyle: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      inRange: {
        color: [
          colorWithAlpha("accentQuaternary", 0.25),
          colorWithAlpha("accentSecondary", 0.65),
          resolveColor("accentPrimary"),
        ],
      },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        const value = valueLookup.get(params.data?.[0]) ?? 0;
        return `${params.data?.[0]}<br/>${dataset.label}: ${value}`;
      },
    },
    calendar: {
      range: dataset.year,
      cellSize: [20, 20],
      top: 40,
      left: "center",
      orient: "horizontal",
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.12),
        },
      },
      itemStyle: {
        borderWidth: withOutlineWidth(1),
        borderColor: colorWithAlpha("accentPrimary", 0.35),
      },
      dayLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      monthLabel: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      yearLabel: {
        color: "rgba(226, 232, 240, 0.85)",
        fontFamily: "Space Grotesk, sans-serif",
        margin: 30,
      },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data,
        itemStyle: {
          shadowBlur: withGlowBlur(18),
          shadowColor: withGlowColor("accentPrimary", 0.45),
        },
      },
    ],
  });

  return chart;
}

function renderThemeRiver(dataset, container) {
  const chart = createChartInstance(container);

  const streams = dataset.streams ?? [];
  const axis = dataset.axis ?? [];

  const data = [];
  streams.forEach((stream) => {
    axis.forEach((point, index) => {
      const value = stream.data?.[index] ?? 0;
      data.push([point, value, stream.name]);
    });
  });

  applyChartOption(chart, {
    backgroundColor: "transparent",
    color: streams.map((stream) => resolveColor(stream.color ?? "accentPrimary")),
    singleAxis: {
      type: "category",
      data: axis,
      top: 60,
      bottom: 60,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    legend: {
      data: streams.map((stream) => stream.name),
      textStyle: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      axisPointer: {
        type: "line",
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.45),
        },
      },
      formatter: (params) => {
        if (!Array.isArray(params)) {
          return dataset.label;
        }
        const lines = params
          .map((item) => `${item.marker} ${item.value?.[2]}: ${item.value?.[1]}`)
          .join("<br/>");
        return `${params[0]?.value?.[0] ?? ""}<br/>${lines}`;
      },
    },
    series: [
      {
        type: "themeRiver",
        data,
        emphasis: {
          itemStyle: {
            shadowBlur: withGlowBlur(26),
            shadowColor: withGlowColor("accentPrimary", 0.4),
          },
        },
        itemStyle: {
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(0.6),
        },
      },
    ],
  });

  return chart;
}

function renderSunburst(dataset, container) {
  const chart = createChartInstance(container);

  function decorate(nodes) {
    return (nodes ?? []).map((node) => ({
      name: node.name,
      value: node.value,
      children: decorate(node.children),
      itemStyle: {
        color: resolveColor(node.color ?? "accentPrimary"),
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
        shadowBlur: withGlowBlur(18),
        shadowColor: withGlowColor(node.color ?? "accentPrimary", 0.4),
      },
      label: {
        color: "rgba(226, 232, 240, 0.85)",
        fontFamily: "Space Grotesk, sans-serif",
      },
    }));
  }

  applyChartOption(chart, {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        const value = Array.isArray(params.value) ? params.value[params.value.length - 1] : params.value;
        return `${params.treePathInfo.map((info) => info.name).join(" → ")}<br/>Score: ${value ?? 0}`;
      },
    },
    series: [
      {
        type: "sunburst",
        radius: ["12%", "82%"],
        data: decorate(dataset.tree),
        sort: undefined,
        itemStyle: {
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
        emphasis: {
          focus: "ancestor",
        },
        levels: [
          {},
          {
            r0: "12%",
            r: "30%",
          },
          {
            r0: "30%",
            r: "55%",
          },
          {
            r0: "55%",
            r: "82%",
          },
        ],
      },
    ],
  });

  return chart;
}

function renderPictorialBar(dataset, container) {
  const chart = createChartInstance(container);

  const items = dataset.items ?? [];
  const categories = items.map((item) => item.name);
  const maxValue = items.reduce((max, item) => Math.max(max, item.target ?? 0, item.actual ?? 0), 0) || 100;

  applyChartOption(chart, {
    backgroundColor: "transparent",
    grid: {
      left: "8%",
      right: "6%",
      top: "18%",
      bottom: "18%",
      containLabel: true,
    },
    legend: {
      data: ["Target", "Actual"],
      textStyle: {
        color: "rgba(226, 232, 240, 0.82)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      top: 0,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      axisPointer: { type: "shadow" },
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        if (!Array.isArray(params)) {
          return dataset.label;
        }
        const target = params.find((item) => item.seriesName === "Target")?.value ?? 0;
        const actual = params.find((item) => item.seriesName === "Actual")?.value ?? 0;
        const category = params[0]?.axisValue ?? "";
        return `${category}<br/>Actual: ${actual}%<br/>Target: ${target}%`;
      },
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: "rgba(148, 163, 184, 0.78)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.max(100, Math.ceil(maxValue / 5) * 5),
      axisLabel: {
        formatter: (value) => `${value}%`,
        color: "rgba(148, 163, 184, 0.75)",
        fontFamily: "Share Tech Mono, monospace",
      },
      splitLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.08),
        },
      },
    },
    series: [
      {
        name: "Target",
        type: "pictorialBar",
        symbol: "rect",
        symbolRepeat: true,
        symbolSize: [14, 6],
        symbolMargin: 2,
        symbolBoundingData: Math.max(100, maxValue),
        data: items.map((item) => ({
          value: item.target ?? 0,
          itemStyle: {
            color: colorWithAlpha(item.color ?? "accentPrimary", 0.25),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
          },
        })),
        z: 1,
      },
      {
        name: "Actual",
        type: "pictorialBar",
        symbol: "rect",
        symbolRepeat: true,
        symbolSize: [14, 6],
        symbolMargin: 2,
        symbolBoundingData: Math.max(100, maxValue),
        data: items.map((item) => ({
          value: item.actual ?? 0,
          itemStyle: {
            color: resolveColor(item.color ?? "accentPrimary"),
            borderColor: chartOutlineColor,
            borderWidth: withOutlineWidth(1),
            shadowBlur: withGlowBlur(18),
            shadowColor: withGlowColor(item.color ?? "accentPrimary", 0.45),
          },
        })),
        z: 2,
      },
    ],
  });

  return chart;
}

const componentRenderers = {
  timeSeries: renderTimeSeries,
  stateTimeline: renderStateTimeline,
  statusHistory: renderStatusHistory,
  barChart: renderBarChart,
  histogram: renderHistogram,
  heatmap: renderHeatmap,
  pieChart: renderPieChart,
  candlestick: renderCandlestick,
  gauge: renderGauge,
  trend: renderTrend,
  xyScatter: renderXYScatter,
  stackedArea: renderStackedArea,
  dualAxis: renderDualAxis,
  radar: renderRadar,
  boxplot: renderBoxplot,
  sankey: renderSankey,
  treemap: renderTreemap,
  funnel: renderFunnel,
  stat: renderStat,
  barGauge: renderBarGauge,
  stackedBar: renderStackedBar,
  calendarHeatmap: renderCalendarHeatmap,
  themeRiver: renderThemeRiver,
  sunburst: renderSunburst,
  pictorialBar: renderPictorialBar,
};

function setupComponent(article) {
  const datasetKey = article.getAttribute("data-component");
  const renderer = componentRenderers[datasetKey];

  if (!renderer) {
    console.warn(`No renderer registered for ${datasetKey}`);
    return;
  }

  const { select: datasetSelect, defaultIndex } = initDatasetSelector(article, datasetKey);
  let liveController = null;

  function stopLiveMode() {
    if (liveController) {
      liveController.stop();
      liveController = null;
    }
  }

  function renderIntoArticle(dataset) {
    const chartContainer = article.querySelector(".chart-canvas");
    if (chartContainer) {
      renderer(dataset, chartContainer);
    } else {
      renderer(dataset, article);
    }
  }

  function runRender() {
    // Fall back to a live dataset index when the selector is absent (e.g. stat cards).
    const fallbackIndex = defaultIndex ?? 0;
    const rawValue = datasetSelect?.value ?? fallbackIndex.toString();
    const parsedIndex = Number.parseInt(rawValue, 10);
    const selectedIndex = Number.isNaN(parsedIndex) ? fallbackIndex : parsedIndex;
    const dataset = neonDatasets[datasetKey]?.[selectedIndex];

    if (!dataset) {
      console.warn(`Dataset not found for ${datasetKey}`);
      return;
    }

    stopLiveMode();

    dataset.reset?.();
    renderIntoArticle(dataset);

    if (dataset.live && typeof dataset.next === "function") {
      const interval = dataset.interval ?? LIVE_DEFAULT_INTERVAL;
      liveController = startLiveUpdater(() => {
        dataset.next();
        renderIntoArticle(dataset);
      }, interval);
    }
  }

  if (datasetSelect) {
    datasetSelect.addEventListener("change", runRender);
    datasetSelect.value = (defaultIndex ?? 0).toString();
  }

  runRender();

  componentRegistry.add(runRender);
}

function initGravibe() {
  const defaultPalette =
    colorPalettes.find((palette) => palette.id === paletteState.activeId) ?? colorPalettes[0];

  if (defaultPalette) {
    applyPalette(defaultPalette);
  }

  registerEffectControls();

  const paletteSelect = document.querySelector("#palette-select");
  if (paletteSelect) {
    paletteSelect.innerHTML = "";
    colorPalettes.forEach((palette) => {
      const option = document.createElement("option");
      option.value = palette.id;
      option.textContent = palette.label;
      paletteSelect.append(option);
    });

    if (paletteState.activeId) {
      paletteSelect.value = paletteState.activeId;
    }

    paletteSelect.addEventListener("change", (event) => {
      const selected = colorPalettes.find((palette) => palette.id === event.target.value);
      if (selected) {
        applyPalette(selected);
      }
    });
  }

  const components = document.querySelectorAll(".component-card");
  components.forEach((component) => setupComponent(component));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGravibe);
} else {
  initGravibe();
}
