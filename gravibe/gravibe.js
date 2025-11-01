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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  // Clamp values so the gauge never renders beyond its 0-100 domain.
  const value = Math.min(Math.max(dataset.value ?? 0, 0), 100);
  const target = Math.min(Math.max(dataset.target ?? 0, 0), 100);
  const valueRatio = value / 100;
  const targetRatio = target / 100;

  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.clear();
  chart.setOption({
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

  chart.setOption({
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
