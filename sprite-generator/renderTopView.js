import { loadComponent } from "./componentLoader.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const TOP_FRONT_SEGMENTS = {
  needle: "body-front-top-needle-prow",
  canopy: "body-front-top-canopy-prow",
  ram: "body-front-top-ram-prow",
};

const TOP_MID_SEGMENTS = {
  slim: "body-mid-top-slim-mid-body",
  bulwark: "body-mid-top-bulwark-fuselage",
  modular: "body-mid-top-modular-spine",
};

const TOP_REAR_SEGMENTS = {
  tapered: "body-rear-top-tapered-tail",
  thruster: "body-rear-top-thruster-cluster",
  block: "body-rear-top-block-stern",
};

const TOP_WING_COMPONENTS = {
  delta: "wing-top-delta-strike-wing",
  swept: "wing-top-swept-interceptor-wing",
  forward: "wing-top-forward-reconnaissance-wing",
  box: "wing-top-box-transport-wing",
  broad: "wing-top-broad-hauler-wing",
  ladder: "wing-top-ladder-drone-wing",
  split: "wing-top-split-shuttle-wing",
};

const TOP_NOSE_ARMAMENT = {
  1: "armament-nose-top-single-cannon",
  2: "armament-nose-top-dual-pulse-cannons",
  3: "armament-nose-top-triple-rotary-battery",
};

const TOP_WING_ARMAMENT = {
  bomb: "armament-wing-top-heavy-bomb-racks",
  missile: "armament-wing-top-twin-missile-pylons",
};

export async function drawTopDownSpaceship(root, config) {
  await drawWings(root, config);
  await drawBody(root, config);
  await drawTopArmament(root, config);
  await drawTopCanopy(root, config);
}

async function drawBody(root, config) {
  const { body, palette } = config;
  if (!body?.segments) {
    return;
  }

  const frontSlug = TOP_FRONT_SEGMENTS[body.segments.front?.type] ?? TOP_FRONT_SEGMENTS.canopy;
  const midSlug = TOP_MID_SEGMENTS[body.segments.mid?.type] ?? TOP_MID_SEGMENTS.modular;
  const rearSlug = TOP_REAR_SEGMENTS[body.segments.rear?.type] ?? TOP_REAR_SEGMENTS.tapered;

  const slugs = [frontSlug, midSlug, rearSlug];
  const segments = await Promise.all(slugs.map((slug) => (slug ? loadComponent(slug, palette) : null)));

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("body-top");
  segments.forEach((segment, index) => {
    if (!segment) {
      return;
    }

    const slug = slugs[index];
    if (slug === TOP_FRONT_SEGMENTS.canopy) {
      retainHullOnly(segment);
    }

    group.appendChild(segment);
  });

  if (group.childNodes.length > 0) {
    root.appendChild(group);
  }
}

async function drawWings(root, config) {
  const { wings, palette } = config;
  if (!wings?.enabled) {
    return;
  }

  const slug = TOP_WING_COMPONENTS[wings.style] ?? null;
  if (!slug) {
    return;
  }

  const component = await loadComponent(slug, palette);
  if (!component) {
    return;
  }

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("wings-top");
  group.appendChild(component);
  root.appendChild(group);
}

async function drawTopCanopy(root, config) {
  const { body, cockpit, palette } = config;
  if (!body?.segments || !cockpit) {
    return;
  }

  const component = await loadComponent(TOP_FRONT_SEGMENTS.canopy, palette);
  if (!component) {
    return;
  }

  removeHullPath(component);
  if (component.childElementCount === 0) {
    return;
  }

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("canopy-top");
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

async function drawTopArmament(root, config) {
  const { armament, palette, wings } = config;
  if (!armament) {
    return;
  }

  let slug = null;
  if (armament.mount === "wing" && wings?.enabled) {
    slug = TOP_WING_ARMAMENT[armament.type] ?? "armament-wing-top-outer-line-rockets";
  } else if (armament.mount === "nose") {
    slug = TOP_NOSE_ARMAMENT[armament.barrels] ?? TOP_NOSE_ARMAMENT[2];
  }

  if (!slug) {
    return;
  }

  const component = await loadComponent(slug, palette);
  if (!component) {
    return;
  }

  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("armament-top");
  group.appendChild(component);
  root.appendChild(group);
}
