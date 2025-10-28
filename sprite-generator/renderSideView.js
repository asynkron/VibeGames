import { loadComponent } from "./componentLoader.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const SIDE_FRONT_SEGMENTS = {
  needle: "body-front-side-needle-prow",
  canopy: "body-front-side-canopy-prow",
  ram: "body-front-side-ram-prow",
};

const SIDE_MID_SEGMENTS = {
  slim: "body-mid-side-slim-mid-body",
  bulwark: "body-mid-side-bulwark-fuselage",
  modular: "body-mid-side-modular-spine",
};

const SIDE_REAR_SEGMENTS = {
  tapered: "body-rear-side-tapered-tail",
  thruster: "body-rear-side-thruster-cluster",
  block: "body-rear-side-block-stern",
};

const SIDE_WING_COMPONENTS = {
  delta: "wing-side-delta-strike-wing",
  swept: "wing-side-swept-interceptor-wing",
  forward: "wing-side-forward-reconnaissance-wing",
  box: "wing-side-box-transport-wing",
  broad: "wing-side-broad-hauler-wing",
  ladder: "wing-side-ladder-drone-wing",
  split: "wing-side-split-shuttle-wing",
};

const SIDE_WING_ARMAMENT = {
  bomb: "armament-wing-side-heavy-bomb-racks",
  missile: "armament-wing-side-twin-missile-pylons",
};

const SIDE_NOSE_ARMAMENT = {
  1: "armament-nose-side-single-cannon",
  2: "armament-nose-side-dual-pulse-cannons",
  3: "armament-nose-side-triple-rotary-battery",
};

export async function drawSideViewSpaceship(root, config) {
  await drawSideHull(root, config);
  await drawSideWeapons(root, config);
  await drawSideCanopy(root, config);
  await drawSideWing(root, config);
}

async function drawSideHull(root, config) {
  const { body, palette } = config;
  if (!body?.segments) {
    return;
  }

  const frontSlug = SIDE_FRONT_SEGMENTS[body.segments.front?.type] ?? SIDE_FRONT_SEGMENTS.canopy;
  const midSlug = SIDE_MID_SEGMENTS[body.segments.mid?.type] ?? SIDE_MID_SEGMENTS.modular;
  const rearSlug = SIDE_REAR_SEGMENTS[body.segments.rear?.type] ?? SIDE_REAR_SEGMENTS.tapered;

  const slugs = [frontSlug, midSlug, rearSlug];
  const segments = await Promise.all(slugs.map((slug) => (slug ? loadComponent(slug, palette) : null)));

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("body-side");
  segments.forEach((segment, index) => {
    if (!segment) {
      return;
    }

    const slug = slugs[index];
    if (slug === SIDE_FRONT_SEGMENTS.canopy) {
      retainHullOnly(segment);
    }

    group.appendChild(segment);
  });

  if (group.childNodes.length > 0) {
    root.appendChild(group);
  }
}

async function drawSideWing(root, config) {
  const { wings, palette } = config;
  if (!wings?.enabled) {
    return;
  }

  const slug = SIDE_WING_COMPONENTS[wings.style] ?? null;
  if (!slug) {
    return;
  }

  const component = await loadComponent(slug, palette);
  if (!component) {
    return;
  }

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("wings-side");
  group.appendChild(component);
  root.appendChild(group);
}

async function drawSideWeapons(root, config) {
  const { armament, palette, wings } = config;
  if (!armament) {
    return;
  }

  let slug = null;
  if (armament.mount === "wing" && wings?.enabled) {
    slug = SIDE_WING_ARMAMENT[armament.type] ?? "armament-wing-side-outer-line-rockets";
  } else if (armament.mount === "nose") {
    slug = SIDE_NOSE_ARMAMENT[armament.barrels] ?? SIDE_NOSE_ARMAMENT[2];
  }

  if (!slug) {
    return;
  }

  const component = await loadComponent(slug, palette);
  if (!component) {
    return;
  }

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("armament-side");
  group.appendChild(component);
  root.appendChild(group);
}

async function drawSideCanopy(root, config) {
  const { body, cockpit, palette } = config;
  if (!body?.segments || !cockpit) {
    return;
  }

  const component = await loadComponent(SIDE_FRONT_SEGMENTS.canopy, palette);
  if (!component) {
    return;
  }

  removeHullPath(component);
  if (component.childElementCount === 0) {
    return;
  }

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("canopy-side");
  group.appendChild(component);
  root.appendChild(group);
}

function retainHullOnly(segment) {
  const hull = segment.querySelector("path");
  if (!hull) {
    return;
  }

  Array.from(segment.children).forEach((child) => {
    if (child !== hull) {
      child.remove();
    }
  });
}

function removeHullPath(segment) {
  const hull = segment.querySelector("path");
  if (hull) {
    hull.remove();
  }
}
