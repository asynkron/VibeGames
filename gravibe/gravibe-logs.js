/**
 * Gravibe Log Console Toolkit
 * Provides lightweight data model helpers and rendering utilities inspired by
 * the OpenTelemetry Logs v1 protobuf definition. The goal is to keep the
 * structure mappable from the proto payloads while remaining ergonomic in JS.
 */

import { formatAnyValueInline, formatAnyValueMultiline, createAttributeTable } from "./gravibe-attributes.js";

/**
 * @typedef {Object} LogAnyValue
 * @property {"string"|"boolean"|"int"|"double"|"bytes"|"array"|"kvlist"|"empty"} kind
 * @property {string|number|boolean|Uint8Array|LogAnyValue[]|Array<{key:string,value:LogAnyValue}>|null} value
 */

/**
 * @typedef {Object} LogAttribute
 * @property {string} key
 * @property {LogAnyValue} value
 * @property {string=} description
 */

/**
 * @typedef {Object} LogRow
 * @property {string} id
 * @property {bigint|number} timeUnixNano
 * @property {bigint|number=} observedTimeUnixNano
 * @property {number=} severityNumber
 * @property {string=} severityText
 * @property {LogAnyValue=} body
 * @property {LogAttribute[]} attributes
 * @property {number=} droppedAttributesCount
 * @property {number=} flags
 * @property {string=} traceId
 * @property {string=} spanId
 * @property {string} template
 */

export const LogAnyValueKind = Object.freeze({
  STRING: "string",
  BOOLEAN: "boolean",
  INT: "int",
  DOUBLE: "double",
  BYTES: "bytes",
  ARRAY: "array",
  KVLIST: "kvlist",
  EMPTY: "empty",
});

function asUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value);
  }
  if (typeof value === "string") {
    const clean = value.replace(/[^0-9a-fA-F]/g, "");
    if (clean.length % 2 !== 0) {
      return new Uint8Array();
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
      bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16) & 0xff;
    }
    return bytes;
  }
  return new Uint8Array();
}

/**
 * Normalizes an AnyValue like structure so templates can use a consistent shape.
 * The converter accepts already-normalized values or a proto-like object with the
 * canonical field names (string_value, bool_value, etc).
 * @param {LogAnyValue | Record<string, any> | null | undefined} input
 * @returns {LogAnyValue}
 */
export function normalizeAnyValue(input) {
  if (!input || typeof input !== "object") {
    return { kind: LogAnyValueKind.EMPTY, value: null };
  }

  if ("kind" in input && "value" in input) {
    const kind = input.kind;
    if (kind === LogAnyValueKind.BYTES) {
      return { kind, value: asUint8Array(input.value) };
    }
    if (kind === LogAnyValueKind.ARRAY && Array.isArray(input.value)) {
      return {
        kind,
        value: input.value.map((item) => normalizeAnyValue(item)),
      };
    }
    if (kind === LogAnyValueKind.KVLIST && Array.isArray(input.value)) {
      return {
        kind,
        value: input.value.map(({ key, value }) => ({
          key,
          value: normalizeAnyValue(value),
        })),
      };
    }
    return input;
  }

  if (Object.prototype.hasOwnProperty.call(input, "string_value")) {
    return { kind: LogAnyValueKind.STRING, value: input.string_value ?? "" };
  }
  if (Object.prototype.hasOwnProperty.call(input, "bool_value")) {
    return { kind: LogAnyValueKind.BOOLEAN, value: Boolean(input.bool_value) };
  }
  if (Object.prototype.hasOwnProperty.call(input, "int_value")) {
    return { kind: LogAnyValueKind.INT, value: Number(input.int_value) };
  }
  if (Object.prototype.hasOwnProperty.call(input, "double_value")) {
    return { kind: LogAnyValueKind.DOUBLE, value: Number(input.double_value) };
  }
  if (Object.prototype.hasOwnProperty.call(input, "bytes_value")) {
    return { kind: LogAnyValueKind.BYTES, value: asUint8Array(input.bytes_value) };
  }
  if (Object.prototype.hasOwnProperty.call(input, "array_value")) {
    const rawValues = Array.isArray(input.array_value?.values)
      ? input.array_value.values
      : [];
    return {
      kind: LogAnyValueKind.ARRAY,
      value: rawValues.map((item) => normalizeAnyValue(item)),
    };
  }
  if (Object.prototype.hasOwnProperty.call(input, "kvlist_value")) {
    const rawList = Array.isArray(input.kvlist_value?.values)
      ? input.kvlist_value.values
      : [];
    return {
      kind: LogAnyValueKind.KVLIST,
      value: rawList.map((entry) => ({
        key: entry?.key ?? "",
        value: normalizeAnyValue(entry?.value ?? null),
      })),
    };
  }

  return { kind: LogAnyValueKind.EMPTY, value: null };
}

/**
 * Creates a LogAttribute aligned with the proto KeyValue definition.
 * @param {string} key
 * @param {LogAnyValue | Record<string, any> | null | undefined} rawValue
 * @param {string=} description
 * @returns {LogAttribute}
 */
export function createLogAttribute(key, rawValue, description = "") {
  return {
    key,
    value: normalizeAnyValue(rawValue),
    description,
  };
}

/**
 * Creates a structured log row. The shape mirrors LogRecord while injecting a
 * template useful for formatted rendering.
 * @param {Omit<LogRow, "attributes"> & { attributes: Array<LogAttribute | { key: string; value: any; description?: string }> }} params
 * @returns {LogRow}
 */
export function createLogRow(params) {
  const {
    attributes = [],
    id,
    template,
    timeUnixNano,
    observedTimeUnixNano,
    severityNumber,
    severityText,
    body,
    droppedAttributesCount,
    flags,
    traceId,
    spanId,
  } = params;

  if (!id) {
    throw new Error("LogRow requires an id");
  }
  if (!template) {
    throw new Error("LogRow requires a template string");
  }
  if (typeof timeUnixNano !== "bigint" && typeof timeUnixNano !== "number") {
    throw new Error("LogRow requires timeUnixNano as number or bigint");
  }

  const normalizedAttributes = attributes.map((attribute) => {
    if (attribute && typeof attribute === "object" && "key" in attribute && "value" in attribute) {
      return {
        key: attribute.key,
        value: normalizeAnyValue(attribute.value),
        description: attribute.description ?? "",
      };
    }
    if (attribute && typeof attribute === "object" && "key" in attribute) {
      return createLogAttribute(attribute.key, attribute.value, attribute.description ?? "");
    }
    throw new Error(`Invalid attribute provided for log row ${id}`);
  });

  return {
    id,
    template,
    timeUnixNano,
    observedTimeUnixNano,
    severityNumber,
    severityText,
    body: body ? normalizeAnyValue(body) : undefined,
    attributes: normalizedAttributes,
    droppedAttributesCount,
    flags,
    traceId,
    spanId,
  };
}

function extractTemplatePlaceholders(template) {
  if (!template || typeof template !== "string") {
    return new Set();
  }
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = new Set();
  let match = regex.exec(template);
  while (match) {
    if (match[1]) {
      matches.add(match[1].trim());
    }
    match = regex.exec(template);
  }
  return matches;
}

function describeAttribute(attribute) {
  if (!attribute) {
    return "";
  }
  return attribute.key || "";
}

function isValidSeverityNumber(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 24;
}

function validateTraceContext(row) {
  const issues = [];
  if (row.traceId && typeof row.traceId === "string" && row.traceId.trim()) {
    if (row.traceId.length !== 32) {
      issues.push({ level: "warning", message: `TraceId should be 32 characters, found ${row.traceId.length}.` });
    }
  }
  if (row.spanId && typeof row.spanId === "string" && row.spanId.trim()) {
    if (row.spanId.length !== 16) {
      issues.push({ level: "warning", message: `SpanId should be 16 characters, found ${row.spanId.length}.` });
    }
  }
  if (row.traceId && !row.spanId) {
    issues.push({ level: "warning", message: "TraceId provided without a spanId." });
  }
  return issues;
}

export function validateLogRows(rows) {
  const result = { errors: [], warnings: [] };
  if (!Array.isArray(rows)) {
    result.errors.push({ level: "error", message: "Log rows must be provided as an array." });
    return result;
  }

  const ids = new Set();

  rows.forEach((row, index) => {
    const context = row?.id ? `Log "${row.id}"` : `Log @ index ${index}`;

    if (!row || typeof row !== "object") {
      result.errors.push({ level: "error", message: `${context}: Row must be an object.` });
      return;
    }

    if (!row.id) {
      result.errors.push({ level: "error", message: `${context}: Missing required id.` });
    } else if (ids.has(row.id)) {
      result.warnings.push({ level: "warning", message: `${context}: Duplicate id detected.` });
    } else {
      ids.add(row.id);
    }

    if (typeof row.timeUnixNano !== "number" && typeof row.timeUnixNano !== "bigint") {
      result.errors.push({ level: "error", message: `${context}: timeUnixNano must be a number or bigint.` });
    }

    if (
      row.observedTimeUnixNano !== undefined &&
      typeof row.observedTimeUnixNano !== "number" &&
      typeof row.observedTimeUnixNano !== "bigint"
    ) {
      result.warnings.push({ level: "warning", message: `${context}: observedTimeUnixNano should be a number or bigint.` });
    }

    if (
      typeof row.timeUnixNano === "number" &&
      typeof row.observedTimeUnixNano === "number" &&
      row.observedTimeUnixNano < row.timeUnixNano
    ) {
      result.warnings.push({ level: "warning", message: `${context}: observedTimeUnixNano occurs before timeUnixNano.` });
    }

    if (row.severityNumber !== undefined && !isValidSeverityNumber(row.severityNumber)) {
      result.warnings.push({
        level: "warning",
        message: `${context}: severityNumber should be an integer between 1 and 24.`,
      });
    }

    const attributes = Array.isArray(row.attributes) ? row.attributes : [];
    const attributeKeys = new Set();
    attributes.forEach((attribute, attrIndex) => {
      if (!attribute || typeof attribute !== "object") {
        result.errors.push({
          level: "error",
          message: `${context}: Attribute at index ${attrIndex} must be an object.`,
        });
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

    const placeholders = extractTemplatePlaceholders(row.template ?? "");
    placeholders.forEach((placeholder) => {
      if (!attributeKeys.has(placeholder)) {
        result.warnings.push({
          level: "warning",
          message: `${context}: Template placeholder "${placeholder}" does not match any attribute key.`,
        });
      }
    });

    validateTraceContext(row).forEach((issue) => {
      result.warnings.push({ level: issue.level, message: `${context}: ${issue.message}` });
    });
  });

  return result;
}

function renderValidationBanner(host, validation) {
  const hasErrors = validation.errors?.length;
  const hasWarnings = validation.warnings?.length;
  if (!hasErrors && !hasWarnings) {
    return null;
  }

  const banner = document.createElement("section");
  banner.className = "validation-banner";

  const title = document.createElement("h3");
  title.className = "validation-banner__title";
  title.textContent = hasErrors ? "Log validation issues" : "Log validation warnings";
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

  banner.append(list);
  host.append(banner);
  return banner;
}

// Collapse the proto severity spectrum into the four common log levels so the
// UI can style each row with a predictable palette.
const severityGroups = [
  {
    name: "debug",
    numbers: new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    pattern: /trace|debug/i,
  },
  {
    name: "info",
    numbers: new Set([9, 10, 11, 12]),
    pattern: /info/i,
  },
  {
    name: "warn",
    numbers: new Set([13, 14, 15, 16]),
    pattern: /warn|warning/i,
  },
  {
    name: "error",
    numbers: new Set([17, 18, 19, 20, 21, 22, 23, 24]),
    pattern: /error|fatal|critical/i,
  },
];

function resolveSeverityGroup(logRow) {
  const { severityNumber, severityText } = logRow;
  if (typeof severityNumber === "number") {
    for (const group of severityGroups) {
      if (group.numbers.has(severityNumber)) {
        return group.name;
      }
    }
  }
  if (typeof severityText === "string" && severityText.trim()) {
    const match = severityGroups.find((group) => group.pattern.test(severityText));
    if (match) {
      return match.name;
    }
  }
  return "info";
}

function createAttributeBadge(attribute) {
  const badge = document.createElement("span");
  badge.className = `log-attr log-attr--${attribute.value.kind}`;
  badge.dataset.attrKey = attribute.key;
  badge.textContent = formatAnyValueInline(attribute.value);
  return badge;
}

function buildTemplateFragment(logRow) {
  const fragment = document.createDocumentFragment();
  const template = logRow.template ?? "";
  const regex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  const attributeMap = new Map(logRow.attributes.map((attr) => [attr.key, attr]));

  let match = regex.exec(template);
  while (match) {
    const preceding = template.slice(lastIndex, match.index);
    if (preceding) {
      fragment.appendChild(document.createTextNode(preceding));
    }
    const rawKey = match[1]?.trim();
    if (rawKey && attributeMap.has(rawKey)) {
      fragment.appendChild(createAttributeBadge(attributeMap.get(rawKey)));
    } else {
      fragment.appendChild(document.createTextNode(match[0]));
    }
    lastIndex = regex.lastIndex;
    match = regex.exec(template);
  }

  const tail = template.slice(lastIndex);
  if (tail) {
    fragment.appendChild(document.createTextNode(tail));
  }
  return fragment;
}

function formatNanoseconds(value) {
  if (typeof value === "bigint") {
    const ms = Number(value / 1000000n);
    return new Date(ms).toLocaleString();
  }
  if (typeof value === "number") {
    const ms = value / 1e6;
    return new Date(ms).toLocaleString();
  }
  return "—";
}

// Re-export for external consumers
export { formatAnyValueInline, formatAnyValueMultiline, createAttributeTable } from "./gravibe-attributes.js";

function createMetaSection(logRow) {
  const wrapper = document.createElement("div");
  wrapper.className = "log-row-details";

  const metaList = document.createElement("dl");
  metaList.className = "log-row-meta";

  const entries = [
    ["Event Time", formatNanoseconds(logRow.timeUnixNano)],
    [
      "Observed",
      logRow.observedTimeUnixNano ? formatNanoseconds(logRow.observedTimeUnixNano) : "—",
    ],
    ["Trace Id", logRow.traceId ?? "—"],
    ["Span Id", logRow.spanId ?? "—"],
    ["Flags", typeof logRow.flags === "number" ? `0x${logRow.flags.toString(16)}` : "—"],
    [
      "Dropped Attributes",
      typeof logRow.droppedAttributesCount === "number"
        ? String(logRow.droppedAttributesCount)
        : "0",
    ],
  ];

  entries.forEach(([label, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    metaList.append(dt, dd);
  });

  wrapper.appendChild(metaList);

  if (logRow.body && logRow.body.kind !== LogAnyValueKind.EMPTY) {
    const bodySection = document.createElement("section");
    bodySection.className = "log-row-body";
    const bodyTitle = document.createElement("h4");
    bodyTitle.textContent = "Body";
    const pre = document.createElement("pre");
    pre.textContent = formatAnyValueMultiline(logRow.body);
    bodySection.append(bodyTitle, pre);
    wrapper.appendChild(bodySection);
  }

  if (logRow.attributes.length) {
    const attributesSection = document.createElement("section");
    attributesSection.className = "log-row-attributes";
    const attrTitle = document.createElement("h4");
    attrTitle.textContent = "Attributes";
    attributesSection.append(attrTitle, createAttributeTable(logRow.attributes));
    wrapper.appendChild(attributesSection);
  }

  return wrapper;
}

function createLogRowElement(logRow, expandedIds) {
  const details = document.createElement("details");
  details.className = `log-row log-row--severity-${resolveSeverityGroup(logRow)}`;
  details.dataset.rowId = logRow.id;
  if (expandedIds.has(logRow.id)) {
    details.open = true;
  }

  const summary = document.createElement("summary");
  summary.className = "log-row-summary";

  const severity = document.createElement("span");
  severity.className = "log-row-severity";
  severity.textContent = logRow.severityText ?? resolveSeverityGroup(logRow).toUpperCase();

  const timestamp = document.createElement("time");
  timestamp.className = "log-row-timestamp";
  timestamp.dateTime =
    typeof logRow.timeUnixNano === "bigint"
      ? new Date(Number(logRow.timeUnixNano / 1000000n)).toISOString()
      : new Date((logRow.timeUnixNano ?? 0) / 1e6).toISOString();
  timestamp.textContent = formatNanoseconds(logRow.timeUnixNano);

  const message = document.createElement("span");
  message.className = "log-row-message";
  message.appendChild(buildTemplateFragment(logRow));

  summary.append(timestamp, severity, message);
  details.appendChild(summary);
  details.appendChild(createMetaSection(logRow));

  details.addEventListener("toggle", () => {
    if (details.open) {
      expandedIds.add(logRow.id);
    } else {
      expandedIds.delete(logRow.id);
    }
  });

  return details;
}

class LogConsoleView {
  /**
   * @param {HTMLElement} root
   * @param {LogRow[]} rows
   */
  constructor(root, rows) {
    this.root = root;
    this.rows = rows;
    this.expandedIds = new Set();
  }

  setRows(rows) {
    this.rows = rows;
    this.render();
  }

  render() {
    if (!this.root) {
      return;
    }

    const previouslyOpen = new Set();
    this.root.querySelectorAll(".log-row[open]").forEach((element) => {
      const id = element.getAttribute("data-row-id");
      if (id) {
        previouslyOpen.add(id);
      }
    });
    if (previouslyOpen.size) {
      this.expandedIds = previouslyOpen;
    }

    this.root.innerHTML = "";
    const list = document.createElement("div");
    list.className = "log-console-list";

    this.rows.forEach((row) => {
      const element = createLogRowElement(row, this.expandedIds);
      list.appendChild(element);
    });

    this.root.appendChild(list);
  }
}

/**
 * Initializes a log console inside the provided element.
 * @param {HTMLElement | null} hostElement
 * @param {LogRow[]} rows
 * @returns {() => void} rerender handle so palette changes can refresh the UI
 */
export function initLogConsole(hostElement, rows) {
  if (!hostElement) {
    return () => {};
  }
  const view = new LogConsoleView(hostElement, rows);
  view.render();
  return () => view.render();
}

function nowNano(offsetMs = 0) {
  const base = BigInt(Date.now() + offsetMs);
  return base * 1000000n;
}

const anyValues = {
  string: (value) => ({ kind: LogAnyValueKind.STRING, value }),
  bool: (value) => ({ kind: LogAnyValueKind.BOOLEAN, value }),
  int: (value) => ({ kind: LogAnyValueKind.INT, value }),
  double: (value) => ({ kind: LogAnyValueKind.DOUBLE, value }),
  bytes: (value) => ({ kind: LogAnyValueKind.BYTES, value: asUint8Array(value) }),
  array: (values) => ({ kind: LogAnyValueKind.ARRAY, value: values.map((item) => normalizeAnyValue(item)) }),
  kvlist: (entries) => ({
    kind: LogAnyValueKind.KVLIST,
    value: entries.map(([key, value]) => ({ key, value: normalizeAnyValue(value) })),
  }),
};

function fakeTraceId(seed) {
  return seed.padEnd(32, "0").slice(0, 32);
}

function fakeSpanId(seed) {
  return seed.padEnd(16, "0").slice(0, 16);
}

/**
 * Semi-realistic sample rows so the gallery has something to showcase.
 */
export const sampleLogRows = [
  createLogRow({
    id: "log-boot",
    template:
      "Node {{resource.node}} started worker {{worker.id}} for job {{job.name}} in {{region}} region",
    timeUnixNano: nowNano(-120000),
    observedTimeUnixNano: nowNano(-115000),
    severityNumber: 9,
    severityText: "INFO",
    traceId: fakeTraceId("boot001a"),
    spanId: fakeSpanId("a1f7"),
    attributes: [
      createLogAttribute("resource.node", anyValues.string("gravibe-ingest-03")),
      createLogAttribute("worker.id", anyValues.int(42)),
      createLogAttribute("job.name", anyValues.string("daily-compaction")),
      createLogAttribute("region", anyValues.string("eu-central")),
      createLogAttribute("worker.cold_start", anyValues.bool(false)),
      createLogAttribute(
        "worker.capabilities",
        anyValues.array([
          anyValues.string("logs"),
          anyValues.string("metrics"),
          anyValues.string("profiles"),
        ])
      ),
    ],
    body: anyValues.string("Worker runtime initialized"),
  }),
  createLogRow({
    id: "log-rate-limit",
    template: "Rate limiter triggered on route {{http.route}} with {{rate.limit}} requests/min",
    timeUnixNano: nowNano(-75000),
    observedTimeUnixNano: nowNano(-74000),
    severityNumber: 13,
    severityText: "WARN",
    traceId: fakeTraceId("rl-87be"),
    spanId: fakeSpanId("12ef"),
    attributes: [
      createLogAttribute("http.route", anyValues.string("/api/session")),
      createLogAttribute("http.method", anyValues.string("POST")),
      createLogAttribute("rate.limit", anyValues.int(900)),
      createLogAttribute("client.id", anyValues.string("orbital-console")),
      createLogAttribute("limit.exceeded", anyValues.bool(true)),
      createLogAttribute(
        "sample.requests",
        anyValues.array([
          anyValues.kvlist([
            ["ip", anyValues.string("10.42.1.22")],
            ["duration_ms", anyValues.double(183.5)],
          ]),
          anyValues.kvlist([
            ["ip", anyValues.string("10.42.1.23")],
            ["duration_ms", anyValues.double(156.2)],
          ]),
        ])
      ),
    ],
    body: anyValues.string("Throttled burst of session creations"),
  }),
  createLogRow({
    id: "log-config",
    template: "Updated config bundle {{config.name}} to revision {{config.revision}}",
    timeUnixNano: nowNano(-51000),
    severityNumber: 10,
    severityText: "INFO2",
    traceId: fakeTraceId("cfg-9dd1"),
    spanId: fakeSpanId("88aa"),
    attributes: [
      createLogAttribute("config.name", anyValues.string("grafana-dashboards")),
      createLogAttribute("config.revision", anyValues.int(128)),
      createLogAttribute("config.author", anyValues.string("luna")),
      createLogAttribute(
        "config.diff",
        anyValues.kvlist([
          ["added_panels", anyValues.int(3)],
          ["removed_panels", anyValues.int(1)],
          ["validation", anyValues.bool(true)],
        ])
      ),
      createLogAttribute("checksum", anyValues.bytes("c0ffee42")),
    ],
    body: anyValues.string("Config pushed via automation"),
  }),
  createLogRow({
    id: "log-latency",
    template: "Latency probe {{probe.name}} measured p95 {{latency.p95_ms}} ms",
    timeUnixNano: nowNano(-32000),
    observedTimeUnixNano: nowNano(-30000),
    severityNumber: 13,
    severityText: "WARN2",
    traceId: fakeTraceId("lat-5521"),
    spanId: fakeSpanId("7771"),
    attributes: [
      createLogAttribute("probe.name", anyValues.string("edge-vectors")),
      createLogAttribute("latency.p95_ms", anyValues.double(412.8)),
      createLogAttribute("latency.sample_size", anyValues.int(240)),
      createLogAttribute("latency.threshold_ms", anyValues.double(250)),
      createLogAttribute("slo.breach", anyValues.bool(true)),
    ],
    body: anyValues.string("Latency beyond SLO for 3 consecutive checks"),
  }),
  createLogRow({
    id: "log-fatal",
    template:
      "Ingest pipeline {{pipeline.id}} crashed: {{error.message}} (restarts {{restart.count}})",
    timeUnixNano: nowNano(-9000),
    observedTimeUnixNano: nowNano(-8000),
    severityNumber: 17,
    severityText: "ERROR",
    traceId: fakeTraceId("ing-ff10"),
    spanId: fakeSpanId("dead"),
    flags: 0x1,
    droppedAttributesCount: 2,
    attributes: [
      createLogAttribute("pipeline.id", anyValues.string("gravibe-stream-01")),
      createLogAttribute("error.message", anyValues.string("out of memory")),
      createLogAttribute("error.code", anyValues.string("OOM-7")),
      createLogAttribute("restart.count", anyValues.int(5)),
      createLogAttribute(
        "last.restart",
        anyValues.kvlist([
          ["time", anyValues.string("2024-04-23T07:11:02Z")],
          ["duration_ms", anyValues.double(1420.6)],
          ["strategy", anyValues.string("backoff")],
        ])
      ),
    ],
    body: anyValues.string("Pipeline entered crash loop"),
  }),
];
