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

function generateCalendarHeatmapValues(
  year,
  { base = 2.5, variance = 4.5, spikes = [] } = {},
) {
  const values = [];
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);

  let index = 0;
  for (let timestamp = start; timestamp < end; timestamp += 86_400_000) {
    const date = new Date(timestamp);
    const isoDate = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.2 : 0;
    const seasonal = Math.sin(index / 9) * variance * 0.55 + Math.cos(index / 37) * variance * 0.35;
    const monthlyDrift = ((date.getUTCDate() - 1) / 31) * 0.9;
    const baseValue = base + seasonal + monthlyDrift + weekendBoost;
    values.push([isoDate, Math.max(0, Math.round(baseValue))]);
    index += 1;
  }

  spikes.forEach(({ date, value, boost }) => {
    const targetIndex = values.findIndex(([iso]) => iso === date);
    if (targetIndex >= 0) {
      const current = values[targetIndex][1];
      const override = typeof value === "number" ? value : current;
      const adjusted = override + (boost ?? 0);
      values[targetIndex][1] = Math.max(0, Math.round(adjusted));
    }
  });

  return values;
}

const calendarIncidents2024 = generateCalendarHeatmapValues(2024, {
  base: 2.8,
  variance: 5.8,
  spikes: [
    { date: "2024-02-18", value: 14 },
    { date: "2024-03-22", value: 16 },
    { date: "2024-05-04", value: 18 },
    { date: "2024-07-15", value: 19 },
    { date: "2024-09-02", value: 15 },
    { date: "2024-11-11", value: 13 },
  ],
});

const calendarDeploys2023 = generateCalendarHeatmapValues(2023, {
  base: 3.4,
  variance: 4.2,
  spikes: [
    { date: "2023-01-24", boost: 6 },
    { date: "2023-04-03", value: 15 },
    { date: "2023-06-19", value: 18 },
    { date: "2023-09-12", value: 17 },
    { date: "2023-11-27", boost: 8 },
  ],
});

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
  areaStack: [
    {
      label: "Platform Resource Mix",
      axis: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00"],
      series: [
        {
          name: "API Pods",
          color: "accentPrimary",
          data: [32, 38, 54, 68, 74, 70, 62, 58],
        },
        {
          name: "Worker Pool",
          color: "accentSecondary",
          data: [18, 22, 26, 34, 38, 36, 32, 28],
        },
        {
          name: "Batch Jobs",
          color: "accentTertiary",
          data: [12, 14, 18, 22, 28, 26, 24, 20],
        },
        {
          name: "Cache",
          color: "accentQuinary",
          data: [8, 9, 10, 12, 14, 13, 12, 10],
        },
      ],
      unit: "k req/min",
    },
    {
      label: "Weekend Utilization",
      axis: [
        "Sat 00",
        "Sat 06",
        "Sat 12",
        "Sat 18",
        "Sun 00",
        "Sun 06",
        "Sun 12",
        "Sun 18",
      ],
      series: [
        {
          name: "Ingress",
          color: "accentPrimary",
          data: [20, 24, 32, 46, 34, 28, 36, 42],
        },
        {
          name: "Jobs",
          color: "accentSecondary",
          data: [14, 16, 18, 22, 20, 18, 22, 24],
        },
        {
          name: "Analytics",
          color: "accentTertiary",
          data: [10, 12, 14, 16, 18, 16, 18, 20],
        },
        {
          name: "Cache",
          color: "accentQuaternary",
          data: [6, 7, 8, 9, 8, 7, 8, 9],
        },
      ],
      unit: "% capacity",
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
  boxplot: [
    {
      label: "Service Latency (ms)",
      unit: "ms",
      categories: ["Edge Cache", "API Gateway", "App Service", "Worker", "Analytics"],
      boxes: [
        { name: "Edge Cache", color: "accentPrimary", values: [12, 24, 38, 54, 80], outliers: [108, 126] },
        { name: "API Gateway", color: "accentSecondary", values: [28, 44, 60, 84, 110], outliers: [140] },
        { name: "App Service", color: "accentTertiary", values: [34, 52, 72, 96, 130], outliers: [158, 172] },
        { name: "Worker", color: "accentQuinary", values: [24, 38, 56, 78, 102] },
        { name: "Analytics", color: "accentQuaternary", values: [48, 66, 88, 118, 150], outliers: [180] },
      ],
    },
    {
      label: "Queue Wait (s)",
      unit: "s",
      categories: ["Deploy", "ETL", "Batch", "Alerts", "Backups"],
      boxes: [
        { name: "Deploy", color: "accentPrimary", values: [4, 8, 12, 18, 26], outliers: [34] },
        { name: "ETL", color: "accentSecondary", values: [6, 10, 16, 24, 32], outliers: [40, 44] },
        { name: "Batch", color: "accentTertiary", values: [3, 6, 10, 16, 22], outliers: [30] },
        { name: "Alerts", color: "accentQuinary", values: [2, 4, 8, 14, 20], outliers: [26] },
        { name: "Backups", color: "accentQuaternary", values: [5, 9, 13, 19, 28] },
      ],
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
  sankey: [
    {
      label: "Request Fan-out",
      unit: "req/s",
      nodes: [
        { name: "Ingress", color: "accentPrimary" },
        { name: "API Gateway", color: "accentSecondary" },
        { name: "Auth Service", color: "accentTertiary" },
        { name: "Catalog", color: "accentQuinary" },
        { name: "Billing", color: "accentQuaternary" },
        { name: "Analytics", color: "accentSenary" },
        { name: "Cache", color: "accentPrimary" },
      ],
      links: [
        { source: "Ingress", target: "API Gateway", value: 620 },
        { source: "API Gateway", target: "Auth Service", value: 220 },
        { source: "API Gateway", target: "Catalog", value: 260 },
        { source: "API Gateway", target: "Billing", value: 90 },
        { source: "API Gateway", target: "Analytics", value: 50 },
        { source: "Auth Service", target: "Catalog", value: 140 },
        { source: "Auth Service", target: "Billing", value: 60 },
        { source: "Catalog", target: "Cache", value: 110 },
        { source: "Catalog", target: "Analytics", value: 120 },
        { source: "Billing", target: "Analytics", value: 70 },
      ],
    },
    {
      label: "Pipeline Flow",
      unit: "runs",
      nodes: [
        { name: "Commit", color: "accentPrimary" },
        { name: "CI Build", color: "accentSecondary" },
        { name: "Unit Tests", color: "accentTertiary" },
        { name: "Integration", color: "accentQuinary" },
        { name: "Staging", color: "accentQuaternary" },
        { name: "Production", color: "accentPrimary" },
        { name: "Rollback", color: "accentSenary" },
      ],
      links: [
        { source: "Commit", target: "CI Build", value: 180 },
        { source: "CI Build", target: "Unit Tests", value: 170 },
        { source: "Unit Tests", target: "Integration", value: 150 },
        { source: "Integration", target: "Staging", value: 130 },
        { source: "Staging", target: "Production", value: 110 },
        { source: "Staging", target: "Rollback", value: 14 },
        { source: "Integration", target: "Rollback", value: 18 },
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
  funnel: [
    {
      label: "Release Promotion",
      unit: "builds",
      steps: [
        { name: "Build", value: 340, color: "accentPrimary" },
        { name: "Unit Tests", value: 300, color: "accentSecondary" },
        { name: "Integration", value: 240, color: "accentTertiary" },
        { name: "Staging", value: 190, color: "accentQuinary" },
        { name: "Production", value: 150, color: "accentQuaternary" },
      ],
    },
    {
      label: "Alert Triage",
      unit: "alerts",
      steps: [
        { name: "Detected", value: 420, color: "accentPrimary" },
        { name: "Queued", value: 360, color: "accentSecondary" },
        { name: "Acknowledged", value: 250, color: "accentTertiary" },
        { name: "Mitigated", value: 180, color: "accentQuinary" },
        { name: "Resolved", value: 150, color: "accentQuaternary" },
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
  calendarHeatmap: [
    {
      label: "2024 Incident Density",
      year: 2024,
      values: calendarIncidents2024,
      unit: "incidents/day",
    },
    {
      label: "2023 Deployment Cadence",
      year: 2023,
      values: calendarDeploys2023,
      unit: "deploys/day",
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

function createLiveAreaStackDataset() {
  const axisLength = 8;
  const baseSeries = [
    { name: "API Pods", color: "accentPrimary", base: 48, variance: 5, min: 26, max: 78 },
    { name: "Worker Pool", color: "accentSecondary", base: 30, variance: 4, min: 18, max: 52 },
    { name: "Batch Jobs", color: "accentTertiary", base: 20, variance: 3, min: 10, max: 36 },
    { name: "Cache", color: "accentQuinary", base: 12, variance: 2, min: 6, max: 22 },
  ];

  const axis = [];
  const dataset = {
    label: "Live Resource Stack",
    live: true,
    axis,
    unit: "% capacity",
    series: baseSeries.map(({ name, color }) => ({ name, color, data: [] })),
    interval: 2400,
    next,
    reset,
  };

  let tick = 0;

  function formatTick(index) {
    const totalMinutes = index * 15;
    const hour = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
    const minute = String(totalMinutes % 60).padStart(2, "0");
    return `${hour}:${minute}`;
  }

  function reset() {
    axis.length = 0;
    tick = axisLength;
    for (let i = 0; i < axisLength; i += 1) {
      axis.push(formatTick(i));
    }

    dataset.series.forEach((series, index) => {
      const config = baseSeries[index];
      series.data.length = 0;
      let value = config.base;
      for (let i = 0; i < axisLength; i += 1) {
        value = jitterValue(value, config.variance, config.min, config.max);
        series.data.push(parseFloat(value.toFixed(1)));
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
      series.data.push(parseFloat(value.toFixed(1)));
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

function createLiveFunnelDataset() {
  const stepShape = [
    { name: "Build", color: "accentPrimary", retention: 1, variance: 26 },
    { name: "Unit Tests", color: "accentSecondary", retention: 0.88, variance: 20 },
    { name: "Integration", color: "accentTertiary", retention: 0.82, variance: 18 },
    { name: "Staging", color: "accentQuinary", retention: 0.78, variance: 16 },
    { name: "Production", color: "accentQuaternary", retention: 0.74, variance: 14 },
  ];

  const dataset = {
    label: "Live Deployment Funnel",
    live: true,
    unit: "builds",
    steps: [],
    interval: 4800,
    reset,
    next,
  };

  function buildSteps() {
    const startingVolume = randomInt(320, 420);
    let previous = startingVolume;

    return stepShape.map((step, index) => {
      if (index === 0) {
        previous = Math.round(jitterValue(startingVolume, step.variance, 260, 460));
      } else {
        const baseline = previous * step.retention;
        previous = Math.max(
          0,
          Math.round(jitterValue(baseline, step.variance, baseline * 0.6, startingVolume)),
        );
      }

      return {
        name: step.name,
        color: step.color,
        value: previous,
      };
    });
  }

  function reset() {
    dataset.steps = buildSteps();
  }

  function next() {
    dataset.steps = buildSteps();
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
  neonDatasets.areaStack.push(createLiveAreaStackDataset());
  neonDatasets.stateTimeline.push(createLiveStateTimelineDataset());
  neonDatasets.statusHistory.push(createLiveStatusHistoryDataset());
  neonDatasets.barChart.push(createLiveBarChartDataset());
  neonDatasets.histogram.push(createLiveHistogramDataset());
  neonDatasets.heatmap.push(createLiveHeatmapDataset());
  neonDatasets.pieChart.push(createLivePieChartDataset());
  neonDatasets.funnel.push(createLiveFunnelDataset());
  neonDatasets.candlestick.push(createLiveCandlestickDataset());
  neonDatasets.gauge.push(createLiveGaugeDataset());
  neonDatasets.trend.push(createLiveTrendDataset());
  neonDatasets.xyScatter.push(createLiveScatterDataset());
  neonDatasets.stat.push(createLiveStatDataset());
  neonDatasets.barGauge.push(createLiveBarGaugeDataset());
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

function renderAreaStack(dataset, container) {
  const chart = createChartInstance(container);

  const unitLabel = dataset.unit ? ` ${dataset.unit}` : "";

  applyChartOption(chart, {
    backgroundColor: "transparent",
    animationDuration: 700,
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
        type: "cross",
        label: {
          backgroundColor: "rgba(15, 23, 42, 0.85)",
        },
      },
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: colorWithAlpha("accentPrimary", 0.3),
      textStyle: {
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f8fafc",
      },
      formatter: (params) => {
        const header = params?.[0]?.axisValueLabel ?? "";
        const lines = [header];
        params.forEach((item) => {
          lines.push(`${item.seriesName}: ${item.data}${unitLabel}`);
        });
        return lines.join("<br/>");
      },
    },
    grid: {
      left: "6%",
      right: "4%",
      top: "16%",
      bottom: "12%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dataset.axis,
      axisLine: {
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.35),
        },
      },
      axisLabel: {
        color: "rgba(148, 163, 184, 0.82)",
        fontFamily: "Share Tech Mono, monospace",
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
      smooth: true,
      stack: dataset.stack ?? "total",
      showSymbol: false,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color: resolveColor(series.color),
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colorWithAlpha(series.color, 0.68) },
          { offset: 1, color: colorWithAlpha(series.color, 0.08) },
        ]),
        opacity: 0.9,
      },
      itemStyle: {
        color: resolveColor(series.color),
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
        shadowBlur: withGlowBlur(20),
        shadowColor: withGlowColor(series.color, 0.42),
      },
      emphasis: {
        focus: "series",
      },
      data: series.data,
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

function renderBoxplot(dataset, container) {
  const chart = createChartInstance(container);

  const categories = dataset.categories?.length
    ? dataset.categories
    : dataset.boxes.map((box) => box.name);
  const unitLabel = dataset.unit ? ` ${dataset.unit}` : "";

  const boxSeries = dataset.boxes.map((box) => ({
    value: box.values,
    name: box.name,
    itemStyle: {
      color: colorWithAlpha(box.color ?? "accentPrimary", 0.2),
      borderColor: resolveColor(box.color ?? "accentPrimary"),
      borderWidth: withOutlineWidth(1.4),
      shadowBlur: withGlowBlur(16),
      shadowColor: withGlowColor(box.color ?? "accentPrimary", 0.38),
    },
  }));

  const outliers = dataset.boxes.flatMap((box, index) => {
    const values = Array.isArray(box.outliers) ? box.outliers : [];
    return values.map((value) => ({
      name: box.name,
      value: [index, value],
      itemStyle: {
        color: resolveColor(box.outlierColor ?? box.color ?? "accentSenary"),
        shadowBlur: withGlowBlur(12),
        shadowColor: withGlowColor(box.outlierColor ?? box.color ?? "accentSenary", 0.55),
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
      },
    }));
  });

  applyChartOption(chart, {
    backgroundColor: "transparent",
    animationDuration: 700,
    legend: {
      data: [dataset.label, ...(outliers.length ? ["Outliers"] : [])],
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
      formatter: (param) => {
        if (param.componentSubType === "boxplot") {
          const values = param.data?.value ?? param.data ?? [];
          const name = dataset.boxes[param.dataIndex]?.name ?? param.name;
          return [
            name,
            `Min: ${values[0]}${unitLabel}`,
            `Q1: ${values[1]}${unitLabel}`,
            `Median: ${values[2]}${unitLabel}`,
            `Q3: ${values[3]}${unitLabel}`,
            `Max: ${values[4]}${unitLabel}`,
          ].join("<br/>");
        }

        if (param.componentSubType === "scatter") {
          const categoryIndex = Array.isArray(param.data?.value)
            ? param.data.value[0]
            : param.data?.[0];
          const category = categories[categoryIndex] ?? param.name;
          const value = Array.isArray(param.data?.value)
            ? param.data.value[1]
            : param.data?.[1];
          return `${category}<br/>Outlier: ${value}${unitLabel}`;
        }

        return param.name;
      },
    },
    grid: {
      left: "6%",
      right: "4%",
      top: "16%",
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
        color: "rgba(148, 163, 184, 0.82)",
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
        name: dataset.label,
        type: "boxplot",
        data: boxSeries,
        itemStyle: {
          borderWidth: withOutlineWidth(1.4),
        },
        emphasis: {
          focus: "series",
        },
      },
      ...(outliers.length
        ? [
            {
              name: "Outliers",
              type: "scatter",
              symbolSize: 9,
              data: outliers,
            },
          ]
        : []),
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

function renderSankey(dataset, container) {
  const chart = createChartInstance(container);

  const unitLabel = dataset.unit ? ` ${dataset.unit}` : "";
  const nodeColorRefs = new Map();

  const nodes = dataset.nodes.map((node) => {
    const colorRef = node.color ?? "accentPrimary";
    nodeColorRefs.set(node.name, colorRef);
    const resolved = resolveColor(colorRef);
    return {
      name: node.name,
      itemStyle: {
        color: resolved,
        borderColor: chartOutlineColor,
        borderWidth: withOutlineWidth(1),
        shadowBlur: withGlowBlur(18),
        shadowColor: withGlowColor(colorRef, 0.5),
      },
    };
  });

  const links = dataset.links.map((link) => {
    const colorRef =
      link.color ?? nodeColorRefs.get(link.source) ?? nodeColorRefs.get(link.target) ?? "accentPrimary";
    return {
      ...link,
      lineStyle: {
        color: colorWithAlpha(colorRef, 0.62),
        opacity: 0.7,
        curveness: link.curveness ?? 0.5,
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
          return `${params.data.source} → ${params.data.target}<br/>${params.data.value}${unitLabel}`;
        }
        const value = params.data?.value ?? params.value ?? 0;
        return `${params.name}<br/>${value}${unitLabel}`;
      },
    },
    series: [
      {
        type: "sankey",
        layout: "none",
        top: "10%",
        bottom: "12%",
        left: "6%",
        right: "6%",
        nodeAlign: "justify",
        data: nodes,
        links,
        emphasis: {
          focus: "adjacency",
        },
        lineStyle: {
          opacity: 0.6,
          curveness: 0.5,
        },
        label: {
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
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

function renderFunnel(dataset, container) {
  const chart = createChartInstance(container);

  const unitLabel = dataset.unit ? ` ${dataset.unit}` : "";
  const steps = dataset.steps ?? [];
  const maxValue = steps.reduce((max, step) => Math.max(max, step.value ?? 0), 0) || 1;

  applyChartOption(chart, {
    backgroundColor: "transparent",
    legend: {
      data: steps.map((step) => step.name),
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
      formatter: (params) => {
        const percent = params.percent ?? Math.round((params.data.value / maxValue) * 100);
        return `${params.name}<br/>${params.data.value}${unitLabel}<br/>${percent}% of start`;
      },
    },
    series: [
      {
        name: dataset.label,
        type: "funnel",
        sort: "descending",
        gap: 4,
        left: "12%",
        right: "10%",
        top: "12%",
        bottom: "14%",
        min: 0,
        max: maxValue,
        label: {
          color: "rgba(226, 232, 240, 0.85)",
          fontFamily: "Space Grotesk, sans-serif",
          formatter: ({ name, percent }) => `${name}\n${Math.round(percent)}%`,
        },
        labelLine: {
          lineStyle: {
            color: "rgba(148, 163, 184, 0.55)",
          },
        },
        itemStyle: {
          borderColor: chartOutlineColor,
          borderWidth: withOutlineWidth(1),
        },
        emphasis: {
          label: {
            color: "#f8fafc",
          },
        },
        data: steps.map((step) => ({
          name: step.name,
          value: step.value,
          itemStyle: {
            color: resolveColor(step.color ?? "accentPrimary"),
            shadowBlur: withGlowBlur(24),
            shadowColor: withGlowColor(step.color ?? "accentPrimary", 0.5),
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

function renderCalendarHeatmap(dataset, container) {
  const chart = createChartInstance(container);

  const values = Array.isArray(dataset.values) ? dataset.values : [];
  const maxValue = values.reduce((max, [, value]) => Math.max(max, value ?? 0), 0) || 1;
  const unitLabel = dataset.unit ? ` ${dataset.unit}` : "";
  const inferredYear = values[0]?.[0]?.slice(0, 4) ?? new Date().getFullYear().toString();
  const range = dataset.year ?? inferredYear;

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
      formatter: ({ value }) => {
        if (!value) {
          return dataset.label;
        }
        const [date, count] = value;
        return `${date}: ${count}${unitLabel}`;
      },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 20,
      textStyle: {
        color: "rgba(226, 232, 240, 0.7)",
      },
      inRange: {
        color: [colorWithAlpha("accentPrimary", 0.1), colorWithAlpha("accentTertiary", 0.9)],
      },
    },
    calendar: {
      range: String(range),
      top: 70,
      left: "center",
      cellSize: [18, 18],
      orient: "horizontal",
      splitLine: {
        show: true,
        lineStyle: {
          color: colorWithAlpha("accentPrimary", 0.12),
          width: withOutlineWidth(1),
        },
      },
      itemStyle: {
        borderColor: colorWithAlpha("accentPrimary", 0.08),
        borderWidth: withOutlineWidth(1),
        color: "rgba(15, 23, 42, 0.85)",
        shadowBlur: withGlowBlur(14),
        shadowColor: colorWithAlpha("accentPrimary", 0.18),
      },
      yearLabel: {
        color: "rgba(226, 232, 240, 0.7)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      monthLabel: {
        color: "rgba(226, 232, 240, 0.85)",
        fontFamily: "Space Grotesk, sans-serif",
      },
      dayLabel: {
        color: "rgba(148, 163, 184, 0.7)",
        fontFamily: "Share Tech Mono, monospace",
      },
    },
    series: [
      {
        name: dataset.label,
        type: "heatmap",
        coordinateSystem: "calendar",
        data: values,
        itemStyle: {
          borderRadius: 4,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: withGlowBlur(18),
            shadowColor: withGlowColor("accentPrimary", 0.5),
          },
        },
      },
    ],
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

const componentRenderers = {
  timeSeries: renderTimeSeries,
  areaStack: renderAreaStack,
  stateTimeline: renderStateTimeline,
  statusHistory: renderStatusHistory,
  barChart: renderBarChart,
  histogram: renderHistogram,
  boxplot: renderBoxplot,
  heatmap: renderHeatmap,
  sankey: renderSankey,
  pieChart: renderPieChart,
  funnel: renderFunnel,
  candlestick: renderCandlestick,
  gauge: renderGauge,
  trend: renderTrend,
  calendarHeatmap: renderCalendarHeatmap,
  xyScatter: renderXYScatter,
  stat: renderStat,
  barGauge: renderBarGauge,
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
