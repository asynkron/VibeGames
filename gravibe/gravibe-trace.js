/**
 * Gravibe Trace Explorer Toolkit
 * Provides a lightweight data model that mirrors OpenTelemetry trace spans and
 * utilities to render a nested trace timeline inspired by the official proto
 * definitions.
 */

import { normalizeAnyValue, createLogAttribute } from "./gravibe-logs.js";

/**
 * @typedef {ReturnType<typeof createTraceSpan>} TraceSpan
 * @typedef {ReturnType<typeof createTraceEvent>} TraceEvent
 * @typedef {{ traceId: string, startTimeUnixNano: number, endTimeUnixNano: number, durationNano: number, spanCount: number, roots: TraceSpanNode[] }} TraceModel
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
  };
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

function renderAttributeList(attributes) {
  const container = document.createElement("dl");
  container.className = "log-row-meta";
  attributes.forEach(({ key, value }) => {
    const dt = document.createElement("dt");
    dt.textContent = key;
    const dd = document.createElement("dd");
    dd.textContent = describeAnyValue(normalizeAnyValue(value));
    container.append(dt, dd);
  });
  return container;
}

function describeAnyValue(anyValue) {
  if (!anyValue) {
    return "";
  }
  const { kind, value } = anyValue;
  switch (kind) {
    case "string":
      return String(value ?? "");
    case "boolean":
      return value ? "true" : "false";
    case "int":
    case "double":
      return String(value);
    case "bytes":
      return `0x${Array.from(value || [])
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")}`;
    case "array":
      return `[${
        Array.isArray(value)
          ? value.map((entry) => describeAnyValue(entry)).join(", ")
          : ""
      }]`;
    case "kvlist":
      return `{${
        Array.isArray(value)
          ? value
              .map((entry) => `${entry.key}: ${describeAnyValue(entry.value)}`)
              .join(", ")
          : ""
      }}`;
    default:
      return "";
  }
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
      const meta = renderAttributeList(event.attributes);
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
    const list = renderAttributeList(span.attributes);
    attributesSection.append(heading, list);
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

  const expander = document.createElement("button");
  expander.type = "button";
  expander.className = "trace-span__expander";
  expander.setAttribute(
    "aria-label",
    node.children.length ? "Toggle child spans" : "No child spans"
  );
  expander.disabled = !node.children.length;
  summary.append(expander);

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
  summary.append(service);

  const timeline = document.createElement("button");
  timeline.type = "button";
  timeline.className = "trace-span__timeline";
  timeline.setAttribute("aria-label", "Toggle span details");
  const offsets = computeSpanOffsets(trace, node.span);
  timeline.style.setProperty("--span-start", `${offsets.startPercent}%`);
  timeline.style.setProperty("--span-width", `${offsets.widthPercent}%`);

  const bar = document.createElement("div");
  bar.className = "trace-span__bar";
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

function renderSpanNode(trace, node) {
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

  const body = document.createElement("div");
  body.className = "trace-span__body";

  const detailSections = renderSpanDetails(node.span);
  const hasDetails = detailSections.childElementCount > 0;
  if (hasDetails) {
    detailSections.hidden = true;
    detailSections.id = `trace-span-details-${node.span.spanId}`;
    body.append(detailSections);
  }

  let childrenContainer = null;
  if (hasChildren) {
    childrenContainer = document.createElement("div");
    childrenContainer.className = "trace-span__children";
    childrenContainer.id = `trace-span-children-${node.span.spanId}`;
    node.children.forEach((child) => {
      childrenContainer.append(renderSpanNode(trace, child));
    });
    body.append(childrenContainer);
  }

  if (body.childElementCount > 0) {
    container.append(body);
  }

  const defaultChildrenOpen = hasChildren && node.depth === 0;
  if (childrenContainer) {
    childrenContainer.hidden = !defaultChildrenOpen;
    if (defaultChildrenOpen) {
      container.classList.add("trace-span--children-open");
    }
    expander.setAttribute("aria-controls", childrenContainer.id);
    expander.setAttribute("aria-expanded", String(defaultChildrenOpen));
    service.setAttribute("aria-controls", childrenContainer.id);
    service.setAttribute("aria-expanded", String(defaultChildrenOpen));
  } else {
    expander.setAttribute("aria-expanded", "false");
    service.setAttribute("aria-expanded", "false");
  }

  let detailsOpen = false;
  if (hasDetails) {
    timeline.setAttribute("aria-controls", detailSections.id);
    timeline.setAttribute("aria-expanded", "false");
  } else {
    timeline.disabled = true;
    timeline.setAttribute("aria-disabled", "true");
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
  });

  return container;
}

export function renderTrace(host, trace) {
  if (!host) {
    return;
  }
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

  const list = document.createElement("div");
  list.className = "trace-span-list";
  trace.roots.forEach((root) => {
    list.append(renderSpanNode(trace, root));
  });
  host.append(list);
}

export function initTraceViewer(host, spans) {
  if (!host) {
    return () => {};
  }
  const trace = buildTraceModel(spans);
  renderTrace(host, trace);
  return () => renderTrace(host, trace);
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
      { key: "feature.flags", value: { array_value: { values: [ { string_value: "express-pay" }, { string_value: "upsell-banner" } ] } } },
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
