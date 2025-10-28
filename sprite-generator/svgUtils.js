const SVG_NS = "http://www.w3.org/2000/svg";

// Small helper so we can declaratively describe the attributes that an element needs.
export function applyAttributes(element, attrs = {}) {
  Object.entries(attrs).forEach(([name, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    element.setAttribute(name, typeof value === "number" ? value.toString() : value);
  });
  return element;
}

// Centralised SVG element factory keeps individual renderers tidy and consistent.
export function createSvgElement(tag, options = {}) {
  const { attrs, classList, children } = options;
  const element = document.createElementNS(SVG_NS, tag);

  if (attrs) {
    applyAttributes(element, attrs);
  }

  if (classList) {
    const classes = Array.isArray(classList) ? classList : [classList];
    classes.filter(Boolean).forEach((cls) => {
      element.classList.add(cls);
    });
  }

  if (children) {
    children.forEach((child) => {
      if (child) {
        element.appendChild(child);
      }
    });
  }

  return element;
}

export { SVG_NS };
