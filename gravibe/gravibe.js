/*
 * Gravibe Neon Chart Kit
 * Each component exposes multiple datasets and detailed comments so AI agents can remix the visuals quickly.
 */

const neonDatasets = {
  timeSeries: [
    {
      label: "Nebula Production Run",
      axis: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"],
      series: [
        {
          name: "Projected",
          color: "#38f2ff",
          data: [420, 460, 520, 580, 610, 640, 700, 760],
        },
        {
          name: "Actual",
          color: "#f472b6",
          data: [400, 455, 540, 560, 630, 655, 690, 720],
        },
        {
          name: "Capacity",
          color: "#a855f7",
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
          color: "#34d399",
          data: [220, 260, 320, 420, 610, 580, 500],
        },
        {
          name: "Chat Bots",
          color: "#38bdf8",
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
        Idle: "#38bdf8",
        Warmup: "#22d3ee",
        Online: "#38f2ff",
        Alert: "#f97316",
        Cooldown: "#a855f7",
        Offline: "#475569",
        Calibration: "#f472b6",
        Maintenance: "#fb7185",
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
        Idle: "#38bdf8",
        Warmup: "#22d3ee",
        Online: "#38f2ff",
        Alert: "#f97316",
        Cooldown: "#a855f7",
        Calibration: "#f472b6",
        Maintenance: "#fb7185",
      },
    },
  ],
  statusHistory: [
    {
      label: "Ops Squads",
      axis: ["Cycle 1", "Cycle 2", "Cycle 3", "Cycle 4", "Cycle 5"],
      statuses: ["Online", "Degraded", "Offline"],
      series: [
        {
          name: "Online",
          stack: "ops",
          color: "#38f2ff",
          data: [18, 20, 16, 21, 19],
        },
        {
          name: "Degraded",
          stack: "ops",
          color: "#facc15",
          data: [5, 4, 7, 3, 5],
        },
        {
          name: "Offline",
          stack: "ops",
          color: "#f472b6",
          data: [2, 1, 2, 1, 2],
        },
      ],
    },
    {
      label: "Survey Teams",
      axis: ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"],
      statuses: ["Green", "Yellow", "Red"],
      series: [
        {
          name: "Green",
          stack: "survey",
          color: "#34d399",
          data: [10, 8, 12, 9, 11, 13],
        },
        {
          name: "Yellow",
          stack: "survey",
          color: "#facc15",
          data: [3, 5, 2, 4, 3, 2],
        },
        {
          name: "Red",
          stack: "survey",
          color: "#fb7185",
          data: [1, 0, 1, 1, 1, 0],
        },
      ],
    },
  ],
  barChart: [
    {
      label: "Module Output",
      categories: ["A", "B", "C", "D"],
      series: [
        { name: "Current", color: "#38f2ff", data: [32, 44, 39, 50] },
        { name: "Target", color: "#f472b6", data: [36, 40, 45, 48] },
      ],
    },
    {
      label: "Queue Throughput",
      categories: ["North", "South", "East", "West"],
      series: [
        { name: "Morning", color: "#22d3ee", data: [24, 30, 26, 33] },
        { name: "Evening", color: "#a855f7", data: [28, 27, 35, 31] },
      ],
    },
  ],
  histogram: [
    {
      label: "Signal Noise",
      values: [
        4, 5, 6, 8, 9, 5, 7, 6, 4, 10, 8, 11, 7, 6, 8, 9, 10, 12, 9, 7, 6, 5, 4, 5,
      ],
      binCount: 6,
    },
    {
      label: "Drone Latency",
      values: [
        12, 14, 18, 20, 22, 16, 15, 14, 18, 21, 24, 28, 25, 19, 17, 18, 16, 14, 22,
        26, 30, 24, 18, 16,
      ],
      binCount: 7,
    },
  ],
  heatmap: [
    {
      label: "Subsystem Heat",
      columns: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00"],
      rows: [
        { name: "Core", values: [6, 7, 5, 8, 9, 7] },
        { name: "Shields", values: [3, 5, 4, 6, 7, 6] },
        { name: "Sensors", values: [4, 6, 5, 7, 8, 7] },
        { name: "Comms", values: [5, 4, 6, 6, 7, 5] },
      ],
    },
    {
      label: "Lab Reactivity",
      columns: ["Sample A", "Sample B", "Sample C", "Sample D"],
      rows: [
        { name: "Phase 1", values: [1, 3, 4, 2] },
        { name: "Phase 2", values: [2, 5, 6, 3] },
        { name: "Phase 3", values: [3, 4, 5, 4] },
      ],
    },
  ],
  pieChart: [
    {
      label: "Faction Influence",
      slices: [
        { name: "Synth Guild", value: 38 },
        { name: "Data Cult", value: 24 },
        { name: "Rift Runners", value: 18 },
        { name: "Starlance", value: 12 },
        { name: "Wanderers", value: 8 },
      ],
    },
    {
      label: "Signal Channels",
      slices: [
        { name: "Alpha", value: 30 },
        { name: "Beta", value: 25 },
        { name: "Gamma", value: 20 },
        { name: "Delta", value: 15 },
        { name: "Epsilon", value: 10 },
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
          color: "#38f2ff",
          data: [
            32, 34, 36, 33, 31, 29, 28, 32, 38, 42, 48, 52, 56, 61, 65, 63, 58, 54,
            50, 48, 45, 40, 36, 34,
          ],
        },
        {
          name: "Smoothed",
          color: "#f472b6",
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
          color: "#34d399",
          data: [60, 68, 75, 72, 78, 82],
        },
        {
          name: "Campaign B",
          color: "#f97316",
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
          color: "#38f2ff",
          points: [
            [24, 32, 12],
            [28, 36, 14],
            [30, 40, 15],
            [34, 38, 18],
          ],
        },
        {
          name: "Squad B",
          color: "#f472b6",
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
          color: "#a855f7",
          points: [
            [12, 42, 10],
            [16, 48, 12],
            [20, 44, 14],
            [24, 50, 16],
          ],
        },
        {
          name: "South Arc",
          color: "#38bdf8",
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
      label: "Core Efficiency",
      value: 98.6,
      unit: "%",
      delta: 2.1,
      previous: 96.5,
    },
    {
      label: "Shield Integrity",
      value: 84,
      unit: "%",
      delta: -3.2,
      previous: 87.2,
    },
  ],
  barGauge: [
    {
      label: "Power Allocation",
      segments: [
        { name: "Weapons", value: 32, color: "#f472b6" },
        { name: "Shields", value: 28, color: "#38f2ff" },
        { name: "Engines", value: 24, color: "#a855f7" },
        { name: "Sensors", value: 16, color: "#34d399" },
      ],
    },
    {
      label: "Bandwidth Mix",
      segments: [
        { name: "Telepresence", value: 45, color: "#38bdf8" },
        { name: "Logistics", value: 30, color: "#facc15" },
        { name: "Exploration", value: 25, color: "#fb7185" },
      ],
    },
  ],
};

const chartBuilders = {
  timeSeries: (dataset) => ({
    backgroundColor: "transparent",
    animationDuration: 700, // this changes the animation transition speed
    textStyle: {
      fontFamily: 'Space Grotesk, "Segoe UI", sans-serif',
      fontSize: 12, // this sets the font size for chart labels
      color: "#e2e8f0",
    },
    tooltip: {
      trigger: "axis",
    },
    legend: {
      top: 10,
      textStyle: {
        color: "#cbd5f5",
      },
    },
    grid: { left: 40, right: 24, top: 60, bottom: 36 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dataset.axis,
      axisLine: { lineStyle: { color: "rgba(56, 242, 255, 0.35)" } },
      axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
      splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
    },
    series: dataset.series.map((serie) => ({
      type: "line",
      name: serie.name,
      data: serie.data,
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 3,
        color: serie.color,
        shadowColor: `${serie.color}80`,
        shadowBlur: 12,
      },
      areaStyle: {
        color: `${serie.color}33`,
      },
    })),
  }),
  stateTimeline: (dataset) => {
    const yCategories = dataset.tracks.map((track) => track.name);
    const palette = dataset.palette;
    const renderer = (paletteMap) => (params, api) => {
      const categoryIndex = api.value(2);
      const start = api.value(0);
      const end = api.value(1);
      const state = api.value(3);
      const coordStart = api.coord([start, categoryIndex]);
      const coordEnd = api.coord([end, categoryIndex]);
      const barHeight = api.size([0, 1])[1] * 0.6;
      return {
        type: "rect",
        shape: {
          x: coordStart[0],
          y: coordStart[1] - barHeight / 2,
          width: Math.max(coordEnd[0] - coordStart[0], 2),
          height: barHeight,
        },
        style: {
          fill: paletteMap[state] || "#38f2ff",
          shadowBlur: 14,
          shadowColor: `${(paletteMap[state] || "#38f2ff")}aa`,
        },
      };
    };

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const span = params.data.span;
          return `${params.seriesName}<br/>${span.state}: ${span.start} → ${span.end}`;
        },
      },
      grid: { left: 80, right: 32, top: 36, bottom: 36 },
      xAxis: {
        type: "value",
        min: 0,
        max: dataset.maxTime,
        axisLine: { lineStyle: { color: "rgba(56, 242, 255, 0.35)" } },
        axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
        splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
      },
      yAxis: {
        type: "category",
        data: yCategories,
        axisTick: { show: false },
        axisLabel: { color: "rgba(226, 232, 240, 0.85)" },
      },
      series: dataset.tracks.map((track, trackIndex) => ({
        type: "custom",
        name: track.name,
        renderItem: renderer(palette),
        dimensions: ["start", "end", "category", "state"],
        encode: { x: [0, 1], y: 2 },
        data: track.spans.map((span) => ({
          value: [span.start, span.end, trackIndex, span.state],
          span,
        })),
      })),
    };
  },
  statusHistory: (dataset) => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
    },
    legend: {
      top: 12,
      textStyle: { color: "#cbd5f5" },
    },
    grid: { left: 60, right: 24, top: 60, bottom: 36 },
    xAxis: {
      type: "category",
      data: dataset.axis,
      axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
      axisLine: { lineStyle: { color: "rgba(56, 242, 255, 0.35)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
      splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
    },
    series: dataset.series.map((serie) => ({
      type: "line",
      stack: serie.stack,
      name: serie.name,
      data: serie.data,
      areaStyle: { color: `${serie.color}44` },
      lineStyle: { color: serie.color, width: 2 },
      showSymbol: false,
    })),
  }),
  barChart: (dataset) => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { top: 12, textStyle: { color: "#cbd5f5" } },
    grid: { left: 60, right: 24, top: 60, bottom: 36 },
    xAxis: {
      type: "category",
      data: dataset.categories,
      axisLabel: { color: "rgba(226, 232, 240, 0.85)" },
      axisLine: { lineStyle: { color: "rgba(56, 242, 255, 0.35)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "rgba(226, 232, 240, 0.85)" },
      splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
    },
    series: dataset.series.map((serie) => ({
      type: "bar",
      name: serie.name,
      data: serie.data,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
          { offset: 0, color: `${serie.color}40` },
          { offset: 1, color: serie.color },
        ]),
        shadowBlur: 10,
        shadowColor: `${serie.color}55`,
      },
      emphasis: { focus: "series" },
      barWidth: "26%",
    })),
  }),
  histogram: (dataset) => {
    const { labels, counts } = buildHistogram(dataset.values, dataset.binCount);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      grid: { left: 60, right: 24, top: 36, bottom: 40 },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
        splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
      },
      series: [
        {
          type: "bar",
          data: counts,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
              { offset: 0, color: "#0ea5e944" },
              { offset: 1, color: "#38f2ff" },
            ]),
            shadowBlur: 12,
            shadowColor: "rgba(56, 242, 255, 0.5)",
          },
          barWidth: "40%",
        },
      ],
    };
  },
  heatmap: (dataset) => {
    const data = [];
    dataset.rows.forEach((row, rowIndex) => {
      row.values.forEach((value, columnIndex) => {
        data.push([columnIndex, rowIndex, value]);
      });
    });
    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        formatter: (params) => {
          const row = dataset.rows[params.data[1]].name;
          const column = dataset.columns[params.data[0]];
          return `${row} @ ${column}: <strong>${params.data[2]}</strong>`;
        },
      },
      grid: { left: 60, right: 24, top: 40, bottom: 60 },
      xAxis: {
        type: "category",
        data: dataset.columns,
        axisLabel: { color: "rgba(226, 232, 240, 0.85)" },
      },
      yAxis: {
        type: "category",
        data: dataset.rows.map((row) => row.name),
        axisLabel: { color: "rgba(226, 232, 240, 0.85)" },
      },
      visualMap: {
        min: Math.min(...data.map((d) => d[2])),
        max: Math.max(...data.map((d) => d[2])),
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        inRange: {
          color: ["#0f172a", "#0ea5e9", "#38f2ff", "#f472b6"],
        },
        textStyle: { color: "#cbd5f5" },
      },
      series: [
        {
          type: "heatmap",
          data,
          label: { show: false },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: "rgba(248, 113, 113, 0.35)",
            },
          },
        },
      ],
    };
  },
  pieChart: (dataset) => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: 10,
      top: "center",
      textStyle: { color: "#cbd5f5" },
    },
    series: [
      {
        name: dataset.label,
        type: "pie",
        radius: ["40%", "65%"],
        roseType: "radius",
        itemStyle: {
          shadowBlur: 18,
          shadowColor: "rgba(56, 242, 255, 0.35)",
        },
        label: {
          color: "#e2e8f0",
        },
        data: dataset.slices,
      },
    ],
  }),
  candlestick: (dataset) => ({
    backgroundColor: "transparent",
    animationDuration: 600,
    grid: { left: 60, right: 24, top: 36, bottom: 36 },
    xAxis: {
      type: "category",
      data: dataset.axis,
      axisLabel: { color: "rgba(226, 232, 240, 0.85)" },
      axisLine: { lineStyle: { color: "rgba(56, 242, 255, 0.35)" } },
    },
    yAxis: {
      scale: true,
      axisLabel: { color: "rgba(226, 232, 240, 0.85)" },
      splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
    },
    tooltip: {
      trigger: "axis",
    },
    series: [
      {
        type: "candlestick",
        name: dataset.label,
        data: dataset.candles,
        itemStyle: {
          color: "#34d399",
          color0: "#fb7185",
          borderColor: "#34d399",
          borderColor0: "#fb7185",
        },
      },
    ],
  }),
  gauge: (dataset) => ({
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        progress: {
          show: true,
          width: 18,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: "#fb7185" },
              { offset: 1, color: "#38f2ff" },
            ]),
            shadowBlur: 12,
            shadowColor: "rgba(56, 242, 255, 0.4)",
          },
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [[dataset.target / 100, "rgba(56, 189, 248, 0.2)"], [1, "rgba(248, 113, 113, 0.25)"]],
          },
        },
        pointer: {
          icon: "rect",
          width: 6,
          length: "60%",
        },
        axisTick: { distance: -24, length: 6 },
        splitLine: { distance: -24, length: 12 },
        axisLabel: { color: "rgba(226, 232, 240, 0.6)" },
        detail: {
          valueAnimation: true,
          formatter: "{value}%",
          color: "#f8fafc",
          fontSize: 26,
        },
        data: [{ value: dataset.value, name: dataset.label }],
      },
    ],
  }),
  trend: (dataset) => ({
    backgroundColor: "transparent",
    animationDuration: 700,
    legend: { top: 12, textStyle: { color: "#cbd5f5" } },
    grid: { left: 60, right: 24, top: 60, bottom: 40 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: dataset.axis,
      boundaryGap: false,
      axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
      splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
    },
    series: dataset.series.map((serie) => ({
      type: "line",
      name: serie.name,
      data: serie.data,
      smooth: true,
      lineStyle: { color: serie.color, width: 3 },
      areaStyle: { color: `${serie.color}28` },
      showSymbol: false,
    })),
  }),
  xyScatter: (dataset) => ({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const [x, y, size] = params.data;
        return `${params.seriesName}<br/>X: ${x}<br/>Y: ${y}<br/>Size: ${size}`;
      },
    },
    legend: { top: 12, textStyle: { color: "#cbd5f5" } },
    grid: { left: 60, right: 24, top: 60, bottom: 40 },
    xAxis: {
      type: "value",
      axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
      splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "rgba(226, 232, 240, 0.8)" },
      splitLine: { lineStyle: { color: "rgba(56, 242, 255, 0.12)" } },
    },
    series: dataset.series.map((serie) => ({
      type: "scatter",
      name: serie.name,
      data: serie.points,
      symbolSize: (value) => value[2],
      itemStyle: {
        color: serie.color,
        shadowBlur: 14,
        shadowColor: `${serie.color}55`,
      },
    })),
  }),
};

function buildHistogram(values, binCount) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const binSize = range === 0 ? 1 : range / binCount; // ensures stable bins even when values are identical
  const counts = new Array(binCount).fill(0);

  values.forEach((value) => {
    const index = range === 0
      ? 0
      : Math.min(Math.floor((value - min) / binSize), binCount - 1);
    counts[index] += 1;
  });

  const labels = counts.map((_, index) => {
    const start = min + binSize * index;
    const end = start + binSize;
    return `${start.toFixed(0)}-${end.toFixed(0)}`;
  });

  return { labels, counts };
}

const statHandlers = {
  stat: (dataset, card) => {
    const value = card.querySelector(".stat-value");
    const meta = card.querySelector(".stat-meta");
    value.textContent = `${dataset.value.toFixed(1)}${dataset.unit}`;
    const deltaClass = dataset.delta >= 0 ? "delta-positive" : "delta-negative";
    meta.innerHTML = `
      <span class="${deltaClass}">${dataset.delta > 0 ? "▲" : "▼"} ${Math.abs(dataset.delta).toFixed(1)}${dataset.unit}</span>
      <span>Prev: ${dataset.previous}${dataset.unit}</span>
    `;
  },
  barGauge: (dataset, card) => {
    const fill = card.querySelector(".bar-gauge-fill");
    const legend = card.querySelector(".bar-gauge-legend");
    const total = dataset.segments.reduce((sum, segment) => sum + segment.value, 0);
    let cumulative = 0;
    const stops = dataset.segments.flatMap((segment) => {
      const start = (cumulative / total) * 100;
      cumulative += segment.value;
      const end = (cumulative / total) * 100;
      return [
        `${segment.color} ${start.toFixed(1)}%`,
        `${segment.color} ${end.toFixed(1)}%`,
      ];
    });
    fill.style.setProperty("--fill-percent", "100%");
    fill.style.background = `linear-gradient(90deg, ${stops.join(", ")})`;
    legend.innerHTML = "";
    dataset.segments.forEach((segment) => {
      const li = document.createElement("li");
      const percent = ((segment.value / total) * 100).toFixed(1);
      li.innerHTML = `<span style="color:${segment.color}"></span>${segment.name} • ${segment.value} (${percent}%)`;
      legend.appendChild(li);
    });
  },
};

const chartInstances = new Map();

function initComponent(card) {
  const key = card.dataset.component;
  const select = card.querySelector(".dataset-select");
  const datasets = neonDatasets[key];

  if (select && datasets) {
    datasets.forEach((dataset, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = dataset.label;
      select.append(option);
    });
    select.addEventListener("change", (event) => {
      const index = Number(event.target.value);
      applyDataset(key, datasets[index], card);
    });
    applyDataset(key, datasets[0], card);
  } else if (datasets) {
    applyDataset(key, datasets[0], card);
  }
}

function applyDataset(key, dataset, card) {
  const builder = chartBuilders[key];
  if (builder) {
    const shell = card.querySelector(".chart-canvas");
    let chart = chartInstances.get(shell);
    if (!chart) {
      chart = echarts.init(shell);
      chartInstances.set(shell, chart);
    }
    chart.setOption(builder(dataset), true);
  } else if (statHandlers[key]) {
    statHandlers[key](dataset, card);
  }
}

function registerResize() {
  window.addEventListener("resize", () => {
    chartInstances.forEach((chart) => chart.resize());
  });
}

function init() {
  document
    .querySelectorAll(".component-card")
    .forEach((card) => initComponent(card));
  registerResize();
}

document.addEventListener("DOMContentLoaded", init);
