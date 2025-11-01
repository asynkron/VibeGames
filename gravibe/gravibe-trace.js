/**
 * Gravibe Trace Explorer Toolkit
 * Provides a lightweight data model that mirrors OpenTelemetry trace spans and
 * utilities to render a nested trace timeline inspired by the official proto
 * definitions.
 */

import { normalizeAnyValue, createLogAttribute } from "./gravibe-logs.js";
import { createAttributeTable } from "./gravibe-attributes.js";

/**
 * @typedef {ReturnType<typeof createTraceSpan>} TraceSpan
 * @typedef {ReturnType<typeof createTraceEvent>} TraceEvent
 * @typedef {{ traceId: string, startTimeUnixNano: number, endTimeUnixNano: number, durationNano: number, spanCount: number, roots: TraceSpanNode[], serviceNameMapping: Map<string, number> }} TraceModel
 * @typedef {{ span: TraceSpan, depth: number, children: TraceSpanNode[] }} TraceSpanNode
 */

export const SpanKind = Object.freeze({
  INTERNAL: "SPAN_KIND_INTERNAL",
  SERVER: "SPAN_KIND_SERVER",
  CLIENT: "SPAN_KIND_CLIENT",
  PRODUCER: "SPAN_KIND_PRODUCER",
  CONSUMER: "SPAN_KIND_CONSUMER",
});

/**
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.spanId
 * @param {string} params.traceId
 * @param {string=} params.parentSpanId
 * @param {SpanKind=} params.kind
 * @param {number|bigint} params.startTimeUnixNano
 * @param {number|bigint} params.endTimeUnixNano
 * @param {Array<{ key: string, value: import("./gravibe-logs.js").LogAnyValue | Record<string, any> }>=} params.attributes
 * @param {TraceEvent[]=} params.events
 * @param {{ code: "STATUS_CODE_OK"|"STATUS_CODE_ERROR"|"STATUS_CODE_UNSET", message?: string }=} params.status
 * @param {{ name?: string, version?: string }=} params.instrumentationScope
 * @param {{ serviceName?: string, serviceNamespace?: string }=} params.resource
 * @returns {TraceSpan}
 */
export function createTraceSpan({
  name,
  spanId,
  traceId,
  parentSpanId = "",
  kind = SpanKind.INTERNAL,
  startTimeUnixNano,
  endTimeUnixNano,
  attributes = [],
  events = [],
  status = { code: "STATUS_CODE_UNSET" },
  instrumentationScope = {},
  resource = {},
}) {
  return {
    name,
    spanId,
    traceId,
    parentSpanId,
    kind,
    startTimeUnixNano,
    endTimeUnixNano,
    attributes: attributes.map(({ key, value, description = "" }) =>
      createLogAttribute(key, value, description)
    ),
    events,
    status,
    instrumentationScope,
    resource,
  };
}

/**
 * @param {Object} params
 * @param {string} params.name
 * @param {number|bigint} params.timeUnixNano
 * @param {Array<{ key: string, value: import("./gravibe-logs.js").LogAnyValue | Record<string, any> }>=} params.attributes
 * @returns {TraceEvent}
 */
export function createTraceEvent({ name, timeUnixNano, attributes = [] }) {
  return {
    name,
    timeUnixNano,
    attributes: attributes.map(({ key, value, description = "" }) =>
      createLogAttribute(key, value, description)
    ),
  };
}

function toNumberTimestamp(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number.parseFloat(value) || 0;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Collects unique service names from spans and creates an index mapping.
 * @param {TraceSpan[]} spans
 * @returns {Map<string, number>} Map from service name to index
 */
function buildServiceNameMapping(spans) {
  const serviceNames = new Set();
  spans.forEach((span) => {
    const serviceName = span.resource?.serviceName || "unknown-service";
    serviceNames.add(serviceName);
  });

  const serviceArray = Array.from(serviceNames).sort();
  const mapping = new Map();
  serviceArray.forEach((name, index) => {
    mapping.set(name, index);
  });
  return mapping;
}

/**
 * Gets palette colors from CSS variables.
 * @returns {string[]} Array of palette color hex values
 */
function getPaletteColors() {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const colorRoles = ["primary", "secondary", "tertiary", "quaternary", "quinary", "senary"];
  return colorRoles.map((role) => style.getPropertyValue(`--accent-${role}`).trim());
}

/**
 * Converts hex color to HSL
 * @param {string} hex - Hex color string (e.g., "#00c0ff")
 * @returns {{h: number, s: number, l: number}} HSL values (h: 0-360, s: 0-100, l: 0-100)
 */
function hexToHsl(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { h: 0, s: 0, l: 50 };
  }

  let r = Number.parseInt(result[1], 16) / 255;
  let g = Number.parseInt(result[2], 16) / 255;
  let b = Number.parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL to hex color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string
 */
function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Normalizes a hex color to a specific brightness/intensity.
 * Keeps the hue and saturation but sets a fixed lightness.
 * @param {string} hex - Hex color string
 * @param {number} lightness - Target lightness (0-100), default 65 for neon effect
 * @returns {string} Normalized hex color string
 */
function normalizeColorBrightness(hex, lightness = 65) {
  const hsl = hexToHsl(hex);
  // Keep hue and saturation, set fixed lightness for consistent brightness
  return hslToHex(hsl.h, hsl.s, lightness);
}

/**
 * Builds a hierarchical trace model so spans become aware of their children
 * without mutating the original span definitions.
 * @param {TraceSpan[]} spans
 * @returns {TraceModel}
 */
export function buildTraceModel(spans) {
  if (!Array.isArray(spans) || spans.length === 0) {
    return {
      traceId: "",
      startTimeUnixNano: 0,
      endTimeUnixNano: 0,
      durationNano: 0,
      spanCount: 0,
      roots: [],
      serviceNameMapping: new Map(),
    };
  }

  const spanNodes = new Map();
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;
  let traceId = spans[0].traceId;

  spans.forEach((span) => {
    const start = toNumberTimestamp(span.startTimeUnixNano);
    const end = toNumberTimestamp(span.endTimeUnixNano);
    minStart = Math.min(minStart, start);
    maxEnd = Math.max(maxEnd, end);
    traceId = span.traceId || traceId;
    spanNodes.set(span.spanId, { span, depth: 0, children: [] });
  });

  const serviceNameMapping = buildServiceNameMapping(spans);

  const roots = [];

  spanNodes.forEach((node) => {
    const parentId = node.span.parentSpanId;
    if (parentId && spanNodes.has(parentId)) {
      const parentNode = spanNodes.get(parentId);
      node.depth = parentNode.depth + 1;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (node) => {
    node.children.sort(
      (a, b) =>
        toNumberTimestamp(a.span.startTimeUnixNano) -
        toNumberTimestamp(b.span.startTimeUnixNano)
    );
    node.children.forEach((child) => sortChildren(child));
  };

  roots.sort(
    (a, b) =>
      toNumberTimestamp(a.span.startTimeUnixNano) -
      toNumberTimestamp(b.span.startTimeUnixNano)
  );
  roots.forEach((root) => sortChildren(root));

  const startTimeUnixNano = Number.isFinite(minStart) ? minStart : 0;
  const endTimeUnixNano = Number.isFinite(maxEnd) ? maxEnd : startTimeUnixNano;

  return {
    traceId,
    startTimeUnixNano,
    endTimeUnixNano,
    durationNano: Math.max(endTimeUnixNano - startTimeUnixNano, 0),
    spanCount: spans.length,
    roots,
    serviceNameMapping,
  };
}

export function validateTraceSpans(spans) {
  const result = { errors: [], warnings: [] };

  if (!Array.isArray(spans)) {
    result.errors.push({ level: "error", message: "Trace data must be an array of spans." });
    return result;
  }

  const spanIds = new Set();
  const traceIds = new Set();

  spans.forEach((span, index) => {
    const context = span?.spanId ? `Span "${span.spanId}"` : `Span @ index ${index}`;

    if (!span || typeof span !== "object") {
      result.errors.push({ level: "error", message: `${context}: Span must be an object.` });
      return;
    }

    if (!span.spanId) {
      result.errors.push({ level: "error", message: `${context}: Missing spanId.` });
    } else if (spanIds.has(span.spanId)) {
      result.errors.push({ level: "error", message: `${context}: Duplicate spanId detected.` });
    } else {
      spanIds.add(span.spanId);
    }

    if (!span.traceId) {
      result.errors.push({ level: "error", message: `${context}: Missing traceId.` });
    } else {
      traceIds.add(span.traceId);
    }

    if (!span.name) {
      result.errors.push({ level: "error", message: `${context}: Missing span name.` });
    }

    const start = toNumberTimestamp(span.startTimeUnixNano);
    const end = toNumberTimestamp(span.endTimeUnixNano);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      result.errors.push({ level: "error", message: `${context}: Invalid start or end timestamp.` });
    } else if (end < start) {
      result.errors.push({ level: "error", message: `${context}: endTimeUnixNano occurs before startTimeUnixNano.` });
    }

    if (span.parentSpanId && span.parentSpanId === span.spanId) {
      result.errors.push({ level: "error", message: `${context}: span cannot be its own parent.` });
    }

    const attributes = Array.isArray(span.attributes) ? span.attributes : [];
    const attributeKeys = new Set();
    attributes.forEach((attribute, attrIndex) => {
      if (!attribute || typeof attribute !== "object") {
        result.errors.push({ level: "error", message: `${context}: Attribute at index ${attrIndex} must be an object.` });
        return;
      }
      if (!attribute.key) {
        result.errors.push({ level: "error", message: `${context}: Attribute at index ${attrIndex} is missing key.` });
      } else if (attributeKeys.has(attribute.key)) {
        result.warnings.push({ level: "warning", message: `${context}: Duplicate attribute key "${attribute.key}".` });
      } else {
        attributeKeys.add(attribute.key);
      }
    });

    const events = Array.isArray(span.events) ? span.events : [];
    events.forEach((event, eventIndex) => {
      if (!event || typeof event !== "object") {
        result.errors.push({ level: "error", message: `${context}: Event at index ${eventIndex} must be an object.` });
        return;
      }
      const eventTime = toNumberTimestamp(event.timeUnixNano);
      if (!Number.isFinite(eventTime)) {
        result.warnings.push({ level: "warning", message: `${context}: Event @${eventIndex} has invalid timestamp.` });
      } else if (eventTime < start || eventTime > end) {
        result.warnings.push({ level: "warning", message: `${context}: Event "${event.name ?? eventIndex}" is outside the span time window.` });
      }
    });
  });

  if (traceIds.size > 1) {
    result.warnings.push({ level: "warning", message: "Multiple traceIds detected in span collection." });
  }

  return result;
}

function renderValidationBanner(host, validation) {
  const hasErrors = validation.errors?.length;
  const hasWarnings = validation.warnings?.length;
  if (!hasErrors && !hasWarnings) {
    return;
  }

  const banner = document.createElement("section");
  banner.className = "validation-banner";

  const title = document.createElement("h3");
  title.className = "validation-banner__title";
  title.textContent = hasErrors ? "Trace validation issues" : "Trace validation warnings";
  banner.append(title);

  const list = document.createElement("ul");
  list.className = "validation-banner__list";
  const entries = [...(validation.errors ?? []), ...(validation.warnings ?? [])];
  entries.forEach((issue) => {
    const item = document.createElement("li");
    item.className = `validation-banner__item validation-banner__item--${issue.level}`;
    item.textContent = issue.message;
    list.append(item);
  });

  host.append(banner);
}

/**
 * Computes percentage offsets for rendering a span bar relative to the trace
 * duration. Returns values between 0 and 100.
 * @param {TraceModel} trace
 * @param {TraceSpan} span
 */
export function computeSpanOffsets(trace, span) {
  const totalDuration = trace.durationNano ||
    Math.max(
      toNumberTimestamp(trace.endTimeUnixNano) -
      toNumberTimestamp(trace.startTimeUnixNano),
      1
    );

  const startOffset =
    toNumberTimestamp(span.startTimeUnixNano) - trace.startTimeUnixNano;
  const endOffset =
    toNumberTimestamp(span.endTimeUnixNano) - trace.startTimeUnixNano;

  const startPercent = clamp(startOffset / totalDuration, 0, 1) * 100;
  const endPercent = clamp(endOffset / totalDuration, 0, 1) * 100;
  const width = Math.max(endPercent - startPercent, 0.5);

  return {
    startPercent,
    widthPercent: width,
    endPercent,
  };
}

function formatDurationNano(duration) {
  if (!Number.isFinite(duration) || duration < 0) {
    return "0 ns";
  }
  if (duration >= 1e9) {
    return `${(duration / 1e9).toFixed(2)} s`;
  }
  if (duration >= 1e6) {
    return `${(duration / 1e6).toFixed(2)} ms`;
  }
  if (duration >= 1e3) {
    return `${(duration / 1e3).toFixed(2)} μs`;
  }
  return `${duration.toFixed(0)} ns`;
}

function formatTimestamp(value) {
  const date = new Date(toNumberTimestamp(value) / 1e6);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  }).format(date);
}

function renderSpanEvents(events) {
  if (!events || events.length === 0) {
    return null;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "trace-span-events";

  const heading = document.createElement("h4");
  heading.textContent = "Events";
  wrapper.append(heading);

  const list = document.createElement("ul");
  list.className = "trace-span-events__list";

  events.forEach((event) => {
    const item = document.createElement("li");
    item.className = "trace-span-events__item";

    const title = document.createElement("div");
    title.className = "trace-span-events__title";
    title.textContent = `${formatTimestamp(event.timeUnixNano)} — ${event.name}`;
    item.append(title);

    if (event.attributes?.length) {
      const meta = createAttributeTable(event.attributes);
      meta.classList.add("trace-span-events__meta");
      item.append(meta);
    }

    list.append(item);
  });

  wrapper.append(list);
  return wrapper;
}

function renderSpanDetails(span) {
  const details = document.createElement("div");
  details.className = "trace-span__details";

  if (span.attributes.length) {
    const attributesSection = document.createElement("section");
    attributesSection.className = "log-row-attributes";
    const heading = document.createElement("h4");
    heading.textContent = "Attributes";
    const table = createAttributeTable(span.attributes);
    attributesSection.append(heading, table);
    details.append(attributesSection);
  }

  if (span.events?.length) {
    const eventsSection = renderSpanEvents(span.events);
    if (eventsSection) {
      details.append(eventsSection);
    }
  }

  if (span.status?.code && span.status.code !== "STATUS_CODE_UNSET") {
    const statusSection = document.createElement("section");
    statusSection.className = "trace-span-status";
    const heading = document.createElement("h4");
    heading.textContent = "Status";
    const statusBody = document.createElement("p");
    statusBody.className = "trace-span-status__text";
    statusBody.textContent = span.status.message
      ? `${span.status.code.replace("STATUS_CODE_", "")}: ${span.status.message}`
      : span.status.code.replace("STATUS_CODE_", "");
    statusSection.append(heading, statusBody);
    details.append(statusSection);
  }

  return details;
}

function renderSpanSummary(trace, node) {
  const summary = document.createElement("div");
  summary.className = "trace-span__summary";
  summary.dataset.depth = String(node.depth);
  summary.style.setProperty("--depth", String(node.depth));

  // Create wrapper for expander and service that can be indented
  const leftSection = document.createElement("div");
  leftSection.className = "trace-span__left";
  leftSection.style.paddingLeft = `calc(var(--depth) * var(--trace-indent-width, 1rem))`;

  const expander = document.createElement("button");
  expander.type = "button";
  expander.className = "trace-span__expander";
  expander.setAttribute(
    "aria-label",
    node.children.length ? "Toggle child spans" : "No child spans"
  );
  expander.disabled = !node.children.length;
  leftSection.append(expander);

  const service = document.createElement("button");
  service.type = "button";
  service.className = "trace-span__service";
  const serviceName = node.span.resource?.serviceName || "unknown-service";
  const namespace = node.span.resource?.serviceNamespace;
  const scope = node.span.instrumentationScope?.name;
  service.innerHTML = `
    <span class="trace-span__service-name">${serviceName}</span>
    ${namespace ? `<span class="trace-span__service-namespace">${namespace}</span>` : ""}
    ${scope ? `<span class="trace-span__scope">${scope}</span>` : ""}
  `;
  if (!node.children.length) {
    service.disabled = true;
    service.setAttribute("aria-disabled", "true");
  }
  leftSection.append(service);

  summary.append(leftSection);

  const timeline = document.createElement("button");
  timeline.type = "button";
  timeline.className = "trace-span__timeline";
  timeline.setAttribute("aria-label", "Toggle span details");
  const offsets = computeSpanOffsets(trace, node.span);
  timeline.style.setProperty("--span-start", `${offsets.startPercent}%`);
  timeline.style.setProperty("--span-width", `${offsets.widthPercent}%`);

  // Timeline markers are added at trace-span-list level, not per timeline

  const bar = document.createElement("div");
  bar.className = "trace-span__bar";

  // Get palette color based on service name index
  const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
  const paletteColors = getPaletteColors();
  const paletteLength = paletteColors.length;
  const colorIndex = serviceIndex % paletteLength;
  // Normalize color to lighter shade with opacity for subtle effect
  const paletteColor = paletteColors[colorIndex];
  const normalizedColor = normalizeColorBrightness(paletteColor, 50); // Lighter (50% instead of 35%)

  // Convert hex to RGB for rgba with opacity
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: Number.parseInt(result[1], 16),
      g: Number.parseInt(result[2], 16),
      b: Number.parseInt(result[3], 16),
    } : null;
  };

  const rgb = hexToRgb(normalizedColor);
  if (rgb) {
    // Use rgba with 0.6 opacity for less intense colors
    bar.style.setProperty("--service-color", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
    bar.style.setProperty("--service-shadow", `0 0 18px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
  }

  const name = document.createElement("span");
  name.className = "trace-span__name";
  name.textContent = node.span.name;
  bar.append(name);

  const duration = document.createElement("span");
  duration.className = "trace-span__duration";
  duration.textContent = formatDurationNano(
    toNumberTimestamp(node.span.endTimeUnixNano) -
    toNumberTimestamp(node.span.startTimeUnixNano)
  );

  bar.append(duration);
  timeline.append(bar);
  summary.append(timeline);

  return { summary, expander, service, timeline };
}

// Ensure collapsing a span clears state for all nested spans so we do not
// accidentally reopen them on the next render.
function pruneDescendantState(node, state) {
  if (!state) {
    return;
  }
  node.children.forEach((child) => {
    state.expandedChildren.delete(child.span.spanId);
    state.expandedAttributes.delete(child.span.spanId);
    pruneDescendantState(child, state);
  });
}

function renderSpanNode(trace, node, state) {
  const container = document.createElement("div");
  container.className = "trace-span";
  const hasChildren = node.children.length > 0;
  if (!hasChildren) {
    container.classList.add("trace-span--leaf");
  }

  const { summary, expander, service, timeline } = renderSpanSummary(
    trace,
    node
  );
  container.append(summary);

  const spanState = state ?? {
    expandedChildren: new Set(),
    expandedAttributes: new Set(),
  };

  const detailSections = renderSpanDetails(node.span);
  const hasDetails = detailSections.childElementCount > 0;
  if (hasDetails) {
    detailSections.id = `trace-span-details-${node.span.spanId}`;
    container.append(detailSections);
  }

  let childrenContainer = null;
  if (hasChildren) {
    const body = document.createElement("div");
    body.className = "trace-span__body";
    childrenContainer = document.createElement("div");
    childrenContainer.className = "trace-span__children";
    childrenContainer.id = `trace-span-children-${node.span.spanId}`;
    node.children.forEach((child) => {
      childrenContainer.append(renderSpanNode(trace, child, spanState));
    });
    body.append(childrenContainer);
    container.append(body);
  }

  const spanId = node.span.spanId;
  const childrenOpen = hasChildren && spanState.expandedChildren.has(spanId);
  if (childrenContainer) {
    container.classList.toggle("trace-span--children-open", childrenOpen);
    childrenContainer.hidden = !childrenOpen;
    expander.setAttribute("aria-controls", childrenContainer.id);
    expander.setAttribute("aria-expanded", String(childrenOpen));
    service.setAttribute("aria-controls", childrenContainer.id);
    service.setAttribute("aria-expanded", String(childrenOpen));
  } else {
    expander.setAttribute("aria-expanded", "false");
    service.setAttribute("aria-expanded", "false");
  }

  let detailsOpen = hasDetails && spanState.expandedAttributes.has(spanId);
  if (hasDetails) {
    timeline.setAttribute("aria-controls", detailSections.id);
    detailSections.hidden = !detailsOpen;
    timeline.setAttribute("aria-expanded", String(detailsOpen));
    container.classList.toggle("trace-span--details-open", detailsOpen);
  } else {
    timeline.disabled = true;
    timeline.setAttribute("aria-disabled", "true");
    timeline.setAttribute("aria-expanded", "false");
  }

  const toggleChildren = () => {
    if (!childrenContainer) {
      return;
    }
    const next = !container.classList.contains("trace-span--children-open");
    container.classList.toggle("trace-span--children-open", next);
    childrenContainer.hidden = !next;
    expander.setAttribute("aria-expanded", String(next));
    service.setAttribute("aria-expanded", String(next));
    if (next) {
      spanState.expandedChildren.add(spanId);
    } else {
      spanState.expandedChildren.delete(spanId);
      pruneDescendantState(node, spanState);
    }
  };

  expander.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleChildren();
  });

  service.addEventListener("click", (event) => {
    if (service.disabled) {
      return;
    }
    event.stopPropagation();
    toggleChildren();
  });

  timeline.addEventListener("click", (event) => {
    if (!hasDetails || timeline.disabled) {
      return;
    }
    event.stopPropagation();
    detailsOpen = !detailsOpen;
    container.classList.toggle("trace-span--details-open", detailsOpen);
    detailSections.hidden = !detailsOpen;
    timeline.setAttribute("aria-expanded", String(detailsOpen));
    if (detailsOpen) {
      spanState.expandedAttributes.add(spanId);
    } else {
      spanState.expandedAttributes.delete(spanId);
    }
  });

  return container;
}

function collectSpanIds(nodes, bucket = new Set()) {
  nodes.forEach((node) => {
    bucket.add(node.span.spanId);
    collectSpanIds(node.children, bucket);
  });
  return bucket;
}

// Gather every span that has children so we can expand the whole tree by default.
function collectExpandableSpanIds(nodes, bucket = new Set()) {
  nodes.forEach((node) => {
    if (node.children.length) {
      bucket.add(node.span.spanId);
      collectExpandableSpanIds(node.children, bucket);
    }
  });
  return bucket;
}

function pruneInvalidState(trace, state) {
  if (!state) {
    return;
  }
  const validIds = collectSpanIds(trace.roots);
  Array.from(state.expandedChildren).forEach((id) => {
    if (!validIds.has(id)) {
      state.expandedChildren.delete(id);
    }
  });
  Array.from(state.expandedAttributes).forEach((id) => {
    if (!validIds.has(id)) {
      state.expandedAttributes.delete(id);
    }
  });
}

// Expand all spans with children on first render so the entire trace is visible.
function ensureChildrenExpanded(trace, state) {
  if (!state || state.initializedChildren) {
    return;
  }
  const expandableIds = collectExpandableSpanIds(trace.roots);
  expandableIds.forEach((id) => {
    state.expandedChildren.add(id);
  });
  state.initializedChildren = true;
}

function createTraceViewState(trace) {
  const state = {
    expandedChildren: new Set(),
    expandedAttributes: new Set(),
    initializedChildren: false,
  };
  ensureChildrenExpanded(trace, state);
  return state;
}

/**
 * Renders a non-interactive SVG preview of the trace spans.
 * @param {TraceModel} trace
 * @returns {SVGSVGElement}
 */
function renderTracePreview(trace) {
  const SVG_HEIGHT = 150;
  const MIN_SPAN_WIDTH = 2; // Minimum width in pixels for visibility
  const MIN_SPAN_HEIGHT = 2; // Minimum height in pixels per span
  const SPAN_GAP = 2; // Gap between span rows

  // Flatten all spans from the tree structure
  const allSpans = [];
  const flattenSpans = (nodes) => {
    nodes.forEach((node) => {
      allSpans.push(node);
      if (node.children.length > 0) {
        flattenSpans(node.children);
      }
    });
  };
  flattenSpans(trace.roots);

  // Calculate row count (one row per span)
  const rowCount = Math.max(allSpans.length, 1);

  // Calculate span height to fill the SVG height
  // Total gap space = (rowCount + 1) * SPAN_GAP (gap before first, between, and after last)
  const totalGapSpace = (rowCount + 1) * SPAN_GAP;
  const availableHeight = SVG_HEIGHT - totalGapSpace;
  const calculatedSpanHeight = availableHeight / rowCount;

  // Use minimum height if calculated height is too small
  const spanHeight = Math.max(calculatedSpanHeight, MIN_SPAN_HEIGHT);

  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "trace-preview");
  svg.setAttribute("viewBox", `0 0 100 ${SVG_HEIGHT}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.width = "100%";
  svg.style.height = `${SVG_HEIGHT}px`;

  // Background
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", "100");
  background.setAttribute("height", `${SVG_HEIGHT}`);
  background.setAttribute("fill", "rgb(12 16 24 / 50%)");
  svg.appendChild(background);

  // Get palette colors for service coloring
  const paletteColors = getPaletteColors();
  const paletteLength = paletteColors.length;

  // Helper to get color for a service
  const getServiceColor = (serviceName) => {
    const serviceIndex = trace.serviceNameMapping?.get(serviceName) ?? 0;
    const colorIndex = serviceIndex % paletteLength;
    const paletteColor = paletteColors[colorIndex];
    const normalizedColor = normalizeColorBrightness(paletteColor, 50);
    return normalizedColor;
  };

  // Helper to convert hex to RGBA
  const hexToRgba = (hex, alpha = 0.6) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return `rgba(97, 175, 239, ${alpha})`;
    }
    const r = Number.parseInt(result[1], 16);
    const g = Number.parseInt(result[2], 16);
    const b = Number.parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Render each span
  allSpans.forEach((node, index) => {
    const offsets = computeSpanOffsets(trace, node.span);
    const serviceName = node.span.resource?.serviceName || "unknown-service";
    const color = getServiceColor(serviceName);

    // Calculate Y position: SPAN_GAP + index * (spanHeight + SPAN_GAP)
    const y = SPAN_GAP + index * (spanHeight + SPAN_GAP);
    const height = spanHeight;

    // Calculate X position and width (percentage to viewBox units)
    let x = offsets.startPercent;
    let width = offsets.widthPercent;

    // Ensure minimum width in viewBox units (viewBox is 0 0 100 150)
    // For 100 viewBox units wide, 2px min = (2 / actualSVGWidth) * 100
    // Since viewBox is percentage-based, minWidthPercent should be small
    // Assuming typical SVG width of ~800px, 2px = 0.25% of viewBox
    const minWidthPercent = 0.25; // Minimum 2px when SVG is ~800px wide
    if (width < minWidthPercent) {
      width = minWidthPercent;
      // Adjust x to keep span centered if possible
      const originalCenter = x + offsets.widthPercent / 2;
      x = Math.max(0, originalCenter - width / 2);
      // Ensure we don't go past 100%
      if (x + width > 100) {
        x = 100 - width;
      }
    }

    // Create span rectangle
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", `${x}`);
    rect.setAttribute("y", `${y}`);
    rect.setAttribute("width", `${width}`);
    rect.setAttribute("height", `${height}`);
    rect.setAttribute("fill", hexToRgba(color, 0.6));
    rect.setAttribute("rx", "1.5"); // Rounded corners
    svg.appendChild(rect);
  });

  // Inverted selection overlays (darken non-selected areas)
  const leftOverlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  leftOverlay.setAttribute("class", "trace-preview__selection trace-preview__selection--left");
  leftOverlay.setAttribute("x", "0");
  leftOverlay.setAttribute("y", "0");
  leftOverlay.setAttribute("width", "0");
  leftOverlay.setAttribute("height", `${SVG_HEIGHT}`);
  leftOverlay.setAttribute("fill", "rgba(0, 0, 0, 0.7)");
  leftOverlay.style.pointerEvents = "none";
  svg.appendChild(leftOverlay);

  const rightOverlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rightOverlay.setAttribute("class", "trace-preview__selection trace-preview__selection--right");
  rightOverlay.setAttribute("x", "100");
  rightOverlay.setAttribute("y", "0");
  rightOverlay.setAttribute("width", "0");
  rightOverlay.setAttribute("height", `${SVG_HEIGHT}`);
  rightOverlay.setAttribute("fill", "rgba(0, 0, 0, 0.7)");
  rightOverlay.style.pointerEvents = "none";
  svg.appendChild(rightOverlay);

  // Left draggable marker
  const leftMarker = document.createElementNS("http://www.w3.org/2000/svg", "line");
  leftMarker.setAttribute("class", "trace-preview__marker trace-preview__marker--left");
  leftMarker.setAttribute("x1", "0");
  leftMarker.setAttribute("y1", "0");
  leftMarker.setAttribute("x2", "0");
  leftMarker.setAttribute("y2", `${SVG_HEIGHT}`);
  leftMarker.setAttribute("stroke", "rgba(148, 163, 184, 0.6)");
  leftMarker.setAttribute("stroke-width", "2");
  leftMarker.style.cursor = "col-resize";
  leftMarker.style.opacity = "0";
  leftMarker.style.transition = "opacity 0.2s ease";
  svg.appendChild(leftMarker);

  // Right draggable marker
  const rightMarker = document.createElementNS("http://www.w3.org/2000/svg", "line");
  rightMarker.setAttribute("class", "trace-preview__marker trace-preview__marker--right");
  rightMarker.setAttribute("x1", "100");
  rightMarker.setAttribute("y1", "0");
  rightMarker.setAttribute("x2", "100");
  rightMarker.setAttribute("y2", `${SVG_HEIGHT}`);
  rightMarker.setAttribute("stroke", "rgba(148, 163, 184, 0.6)");
  rightMarker.setAttribute("stroke-width", "2");
  rightMarker.style.cursor = "col-resize";
  rightMarker.style.opacity = "0";
  rightMarker.style.transition = "opacity 0.2s ease";
  svg.appendChild(rightMarker);

  // Selection state
  let isSelecting = false;
  let selectionStart = 0;
  let selectionEnd = 0;
  let isDraggingMarker = false;
  let draggingMarker = null;

  // Helper to convert SVG client coordinates to viewBox percentage
  const getXPercent = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const svgX = clientX - rect.left;
    const percent = (svgX / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  // Helper to update selection overlays (inverted: darken non-selected areas)
  const updateSelection = () => {
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);

    // Left overlay: from 0 to start
    leftOverlay.setAttribute("x", "0");
    leftOverlay.setAttribute("width", `${start}`);

    // Right overlay: from end to 100
    rightOverlay.setAttribute("x", `${end}`);
    rightOverlay.setAttribute("width", `${100 - end}`);

    // Update marker positions
    leftMarker.setAttribute("x1", `${start}`);
    leftMarker.setAttribute("x2", `${start}`);
    rightMarker.setAttribute("x1", `${end}`);
    rightMarker.setAttribute("x2", `${end}`);
  };

  // Show/hide markers
  const showMarkers = () => {
    leftMarker.style.opacity = "1";
    rightMarker.style.opacity = "1";
  };

  const hideMarkers = () => {
    if (!isSelecting && !isDraggingMarker) {
      leftMarker.style.opacity = "0";
      rightMarker.style.opacity = "0";
    }
  };

  // Mouse down on SVG for selection
  const handleMouseDown = (e) => {
    // Check if clicking on a marker
    const target = e.target;
    if (target === leftMarker || target === rightMarker) {
      isDraggingMarker = true;
      draggingMarker = target;
      return;
    }

    // Start new selection
    isSelecting = true;
    const xPercent = getXPercent(e.clientX);
    selectionStart = xPercent;
    selectionEnd = xPercent;
    updateSelection();
    showMarkers();
    svg.style.cursor = "col-resize";
  };

  // Mouse move during selection or marker dragging
  const handleMouseMove = (e) => {
    if (!isSelecting && !isDraggingMarker) {
      // Show markers on hover
      return;
    }

    const xPercent = getXPercent(e.clientX);

    if (isSelecting) {
      selectionEnd = xPercent;
      updateSelection();
    } else if (isDraggingMarker) {
      if (draggingMarker === leftMarker) {
        selectionStart = xPercent;
      } else if (draggingMarker === rightMarker) {
        selectionEnd = xPercent;
      }
      updateSelection();
    }
  };

  // Mouse up - finalize selection
  const handleMouseUp = () => {
    if (isSelecting) {
      // Swap if end < start
      if (selectionEnd < selectionStart) {
        [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
      }

      // Check if selection is too small - if so, reset to full range
      const selectionWidthPercent = Math.abs(selectionEnd - selectionStart);
      const rect = svg.getBoundingClientRect();
      const thresholdPercent = (5 / rect.width) * 100;

      if (selectionWidthPercent < thresholdPercent) {
        // Reset selection to full range
        selectionStart = 0;
        selectionEnd = 100;
      }

      updateSelection();
      isSelecting = false;
      svg.style.cursor = "";
    }

    if (isDraggingMarker) {
      isDraggingMarker = false;
      draggingMarker = null;
    }

    hideMarkers();
  };

  // Add event listeners for mouse interaction
  svg.addEventListener("mousedown", handleMouseDown);
  svg.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Show markers on hover over SVG
  svg.addEventListener("mouseenter", showMarkers);
  svg.addEventListener("mouseleave", hideMarkers);

  return svg;
}

export function renderTrace(host, trace, state) {
  const viewState = state ?? createTraceViewState(trace);
  if (!host) {
    return viewState;
  }
  pruneInvalidState(trace, viewState);
  ensureChildrenExpanded(trace, viewState);

  host.innerHTML = "";

  const header = document.createElement("header");
  header.className = "trace-header";

  const title = document.createElement("h3");
  title.textContent = `Trace ${trace.traceId}`;
  header.append(title);

  const meta = document.createElement("p");
  meta.className = "trace-meta";
  meta.textContent = `Spans: ${trace.spanCount} • Window: ${formatTimestamp(
    trace.startTimeUnixNano
  )} – ${formatTimestamp(trace.endTimeUnixNano)}`;
  header.append(meta);

  host.append(header);

  // Add preview trace component
  const preview = renderTracePreview(trace);
  host.append(preview);

  const list = document.createElement("div");
  list.className = "trace-span-list";

  // Create timeline markers (vertical lines) that span all timelines
  const timelineMarkers = createTimelineMarkers(trace, 3);
  list.append(timelineMarkers);

  trace.roots.forEach((root) => {
    list.append(renderSpanNode(trace, root, viewState));
  });

  host.append(list);

  // Create and add the splitter for resizing service column
  // Splitter is positioned relative to trace-span-list, not the full trace-viewer
  const splitter = createSplitter(list);
  list.append(splitter);

  return viewState;
}

/**
 * Formats duration in nanoseconds to milliseconds string
 * @param {number} durationNano - Duration in nanoseconds
 * @returns {string} Formatted duration in ms
 */
function formatDurationMs(durationNano) {
  const ms = durationNano / 1e6;
  return `${ms.toFixed(2)} ms`;
}

/**
 * Creates vertical timeline markers showing time divisions/swimlanes.
 * @param {TraceModel} trace - The trace model
 * @param {number} numberOfSwimlanes - Number of swimlanes (default 3)
 * @returns {HTMLElement} Container element with timeline markers
 */
function createTimelineMarkers(trace, numberOfSwimlanes = 3) {
  const container = document.createElement("div");
  container.className = "trace-timeline-markers";

  const interval = 100 / numberOfSwimlanes;
  const totalDuration = trace.durationNano || Math.max(
    toNumberTimestamp(trace.endTimeUnixNano) - toNumberTimestamp(trace.startTimeUnixNano),
    1
  );

  // Create markers at 0%, then at each interval, and finally at 100%
  for (let i = 0; i <= numberOfSwimlanes; i++) {
    const position = i * interval;
    const timeDelta = (totalDuration * i) / numberOfSwimlanes;

    const marker = document.createElement("div");
    marker.className = "trace-timeline-marker";
    marker.style.left = `${position}%`;

    // Add top label
    const topLabel = document.createElement("div");
    topLabel.className = "trace-timeline-marker__label trace-timeline-marker__label--top";
    topLabel.textContent = formatDurationMs(timeDelta);
    marker.append(topLabel);

    // Add bottom label
    const bottomLabel = document.createElement("div");
    bottomLabel.className = "trace-timeline-marker__label trace-timeline-marker__label--bottom";
    bottomLabel.textContent = formatDurationMs(timeDelta);
    marker.append(bottomLabel);

    container.append(marker);
  }

  return container;
}

/**
 * Creates a resizable splitter element for adjusting service column width.
 * @param {HTMLElement} container - The trace-viewer container
 * @returns {HTMLElement} The splitter element
 */
function createSplitter(container) {
  const splitter = document.createElement("div");
  splitter.className = "trace-viewer__splitter";
  splitter.setAttribute("aria-label", "Resize service column");

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  const startDrag = (e) => {
    isDragging = true;
    startX = e.clientX || e.touches?.[0]?.clientX || 0;
    const root = document.documentElement;
    const currentWidth = root.style.getPropertyValue("--trace-span-service-width") ||
      getComputedStyle(root).getPropertyValue("--trace-span-service-width") ||
      "16rem";
    startWidth = parseFloat(currentWidth) || 16;
    // Make splitter visible when dragging
    splitter.style.opacity = "1";
    splitter.style.background = "rgba(148, 163, 184, 0.5)";
    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("touchmove", doDrag);
    document.addEventListener("touchend", stopDrag);
    e.preventDefault();
  };

  const doDrag = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX || e.touches?.[0]?.clientX || 0;
    const diff = currentX - startX;
    // Convert pixels to rem (assuming 1rem = 16px)
    const diffRem = diff / 16;
    const newWidth = Math.max(8, Math.min(40, startWidth + diffRem)); // Min 8rem, max 40rem
    const root = document.documentElement;
    root.style.setProperty("--trace-span-service-width", `${newWidth}rem`);
    e.preventDefault();
  };

  const stopDrag = () => {
    isDragging = false;
    // Fade out splitter after a short delay when not dragging
    setTimeout(() => {
      if (!isDragging) {
        splitter.style.opacity = "";
        splitter.style.background = "";
      }
    }, 150);
    document.removeEventListener("mousemove", doDrag);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchmove", doDrag);
    document.removeEventListener("touchend", stopDrag);
  };

  splitter.addEventListener("mousedown", startDrag);
  splitter.addEventListener("touchstart", startDrag);

  return splitter;
}

export function initTraceViewer(host, spans) {
  if (!host) {
    return () => { };
  }
  const trace = buildTraceModel(spans);
  let viewState = renderTrace(host, trace);
  return () => {
    viewState = renderTrace(host, trace, viewState);
  };
}

const ns = 1e6;
const base = Date.now() * 1e6;

export const sampleTraceSpans = [
  createTraceSpan({
    name: "HTTP GET /checkout",
    spanId: "a1",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "",
    kind: SpanKind.SERVER,
    startTimeUnixNano: base,
    endTimeUnixNano: base + 180 * ns,
    resource: { serviceName: "edge-gateway" },
    attributes: [
      { key: "http.method", value: { string_value: "GET" } },
      { key: "http.target", value: { string_value: "/checkout" } },
      { key: "user.id", value: { string_value: "pilot-982" } },
    ],
    events: [
      createTraceEvent({
        name: "http.request.headers",
        timeUnixNano: base + 2 * ns,
        attributes: [
          { key: "user-agent", value: { string_value: "VibeBrowser/1.0" } },
        ],
      }),
    ],
    status: { code: "STATUS_CODE_OK" },
    instrumentationScope: { name: "gateway-server" },
  }),
  createTraceSpan({
    name: "Authorize Session",
    spanId: "b2",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "a1",
    kind: SpanKind.CLIENT,
    startTimeUnixNano: base + 10 * ns,
    endTimeUnixNano: base + 55 * ns,
    resource: { serviceName: "edge-gateway" },
    attributes: [
      { key: "rpc.system", value: { string_value: "grpc" } },
      { key: "rpc.service", value: { string_value: "AuthzService" } },
    ],
    events: [
      createTraceEvent({
        name: "grpc.message",
        timeUnixNano: base + 22 * ns,
        attributes: [
          { key: "grpc.message_type", value: { string_value: "request" } },
        ],
      }),
    ],
  }),
  createTraceSpan({
    name: "AuthzService/Authorize",
    spanId: "c3",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "b2",
    kind: SpanKind.SERVER,
    startTimeUnixNano: base + 12 * ns,
    endTimeUnixNano: base + 52 * ns,
    resource: { serviceName: "identity-core" },
    attributes: [
      { key: "db.system", value: { string_value: "redis" } },
      { key: "net.peer.name", value: { string_value: "auth-cache-01" } },
    ],
    events: [
      createTraceEvent({
        name: "cache.miss",
        timeUnixNano: base + 18 * ns,
        attributes: [
          { key: "cache.key", value: { string_value: "session:pilot-982" } },
        ],
      }),
    ],
    status: { code: "STATUS_CODE_OK" },
  }),
  createTraceSpan({
    name: "Lookup Session",
    spanId: "d4",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "c3",
    kind: SpanKind.CLIENT,
    startTimeUnixNano: base + 20 * ns,
    endTimeUnixNano: base + 40 * ns,
    resource: { serviceName: "identity-core" },
    attributes: [
      { key: "db.system", value: { string_value: "postgresql" } },
      { key: "db.statement", value: { string_value: "SELECT * FROM sessions" } },
    ],
  }),
  createTraceSpan({
    name: "Render Checkout",
    spanId: "e5",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "a1",
    kind: SpanKind.INTERNAL,
    startTimeUnixNano: base + 60 * ns,
    endTimeUnixNano: base + 165 * ns,
    resource: { serviceName: "edge-gateway" },
    attributes: [
      { key: "view.name", value: { string_value: "CheckoutPage" } },
      { key: "feature.flags", value: { array_value: { values: [{ string_value: "express-pay" }, { string_value: "upsell-banner" }] } } },
    ],
  }),
  createTraceSpan({
    name: "InventoryService/Reserve",
    spanId: "f6",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "e5",
    kind: SpanKind.CLIENT,
    startTimeUnixNano: base + 78 * ns,
    endTimeUnixNano: base + 138 * ns,
    resource: { serviceName: "edge-gateway" },
    attributes: [
      { key: "rpc.system", value: { string_value: "grpc" } },
      { key: "inventory.items", value: { int_value: 3 } },
    ],
    status: { code: "STATUS_CODE_OK" },
  }),
  createTraceSpan({
    name: "InventoryService/Reserve",
    spanId: "g7",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "f6",
    kind: SpanKind.SERVER,
    startTimeUnixNano: base + 80 * ns,
    endTimeUnixNano: base + 134 * ns,
    resource: { serviceName: "supply-chain" },
    attributes: [
      { key: "db.system", value: { string_value: "mongodb" } },
      { key: "region", value: { string_value: "us-east-1" } },
    ],
    events: [
      createTraceEvent({
        name: "db.query",
        timeUnixNano: base + 102 * ns,
        attributes: [
          { key: "collection", value: { string_value: "inventory" } },
          { key: "duration.ms", value: { double_value: 12.7 } },
        ],
      }),
    ],
  }),
  createTraceSpan({
    name: "PaymentService/Authorize",
    spanId: "h8",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "e5",
    kind: SpanKind.CLIENT,
    startTimeUnixNano: base + 90 * ns,
    endTimeUnixNano: base + 170 * ns,
    resource: { serviceName: "edge-gateway" },
    attributes: [
      { key: "rpc.system", value: { string_value: "grpc" } },
      { key: "payment.provider", value: { string_value: "gravipay" } },
    ],
    status: { code: "STATUS_CODE_ERROR", message: "card_declined" },
  }),
  createTraceSpan({
    name: "PaymentService/Authorize",
    spanId: "i9",
    traceId: "42d1e0cafef00d1e",
    parentSpanId: "h8",
    kind: SpanKind.SERVER,
    startTimeUnixNano: base + 95 * ns,
    endTimeUnixNano: base + 165 * ns,
    resource: { serviceName: "payments-orchestrator" },
    attributes: [
      { key: "db.system", value: { string_value: "postgresql" } },
      { key: "retry.count", value: { int_value: 1 } },
    ],
    events: [
      createTraceEvent({
        name: "fraud.check",
        timeUnixNano: base + 120 * ns,
        attributes: [
          { key: "result", value: { string_value: "pending_review" } },
        ],
      }),
    ],
    status: { code: "STATUS_CODE_ERROR", message: "Card declined" },
  }),
];
