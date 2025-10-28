import { clamp } from "./math.js";

export function computeWingPlanform(body, wings) {
  if (!wings?.enabled) {
    return {
      enabled: false,
      position: 0,
      length: 0,
      span: 0,
      thickness: 0,
      dihedral: 0,
      drop: 0,
      mountOffset: 0,
      mountHeight: 0,
      style: wings?.style ?? null,
    };
  }

  const halfLength = body.length / 2;
  const span = Math.max(0, wings.span ?? 0);
  const forward = Math.max(0, wings.forward ?? 0);
  const sweep = Math.max(0, wings.sweep ?? 0);
  const chord = forward + sweep;
  const length = Math.max(24, chord);
  const rootOffset = clamp(halfLength + (wings.offsetY ?? 0), 0, body.length);
  const leadingBuffer = Math.max(length * 0.12, span * 0.05);
  const trailingBuffer = Math.max(length * 0.25, span * 0.1);
  const position = clamp(rootOffset, leadingBuffer, body.length - trailingBuffer);
  const thickness = Math.max(10, (wings.thickness ?? 0) * 0.5, span * 0.45, chord * 0.3);
  const dihedral = Math.max(0, (wings.dihedral ?? 0) * 0.8);
  const drop = Math.max(6, sweep * 0.6, span * 0.25, chord * 0.22);
  const positionPercent = body.length > 0 ? position / body.length : 0;
  const lengthPercent = body.length > 0 ? length / body.length : 0;
  const mountHeight = wings.mountHeight ?? wings.verticalOffset ?? 0;

  return {
    enabled: true,
    position,
    length,
    positionPercent,
    lengthPercent,
    span,
    thickness,
    dihedral,
    drop,
    mountOffset: wings.offsetY ?? 0,
    mountHeight,
    style: wings.style,
  };
}
