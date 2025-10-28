export const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Create an SVG element, assign attributes, and optionally append CSS classes.
 * Keeping this logic in one place helps the render modules stay tidy.
 */
export function createSvgElement(tag, attributes = {}, classNames) {
  const element = document.createElementNS(SVG_NS, tag);

  Object.entries(attributes).forEach(([name, value]) => {
    if (value !== undefined && value !== null) {
      element.setAttribute(name, value);
    }
  });

  if (classNames) {
    const classes = Array.isArray(classNames)
      ? classNames
      : String(classNames).split(/\s+/).filter(Boolean);
    if (classes.length > 0) {
      element.classList.add(...classes);
    }
  }

  return element;
}
