import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// Building blocks and metadata for the generator. Each option keeps short tags so we can
// communicate the personality of the ship to the player without long descriptions.
const HULL_TYPES = [
  {
    id: "needle",
    label: "Needle Hull",
    profile: "Interceptor",
    tags: ["agile", "sleek"],
    notes: "Razor thin silhouette with a glider tail.",
  },
  {
    id: "broadhead",
    label: "Broadhead Hull",
    profile: "Gunship",
    tags: ["armored", "heavy"],
    notes: "Thick mid-section made for recoil dampening.",
  },
  {
    id: "arrow",
    label: "Arrow Hull",
    profile: "Scout",
    tags: ["fast", "light"],
    notes: "Angular plating with recessed thrusters.",
  },
  {
    id: "dragonfly",
    label: "Dragonfly Hull",
    profile: "Support",
    tags: ["modular", "balanced"],
    notes: "Segmented fuselage with exposed pylons.",
  },
  {
    id: "bastion",
    label: "Bastion Hull",
    profile: "Carrier",
    tags: ["armored", "broad"],
    notes: "Wide chassis with multiple engine nacelles.",
  },
];

const WING_TYPES = [
  {
    id: "delta",
    label: "Delta Wings",
    tags: ["stability"],
  },
  {
    id: "forward-swept",
    label: "Forward-Swept Wings",
    tags: ["agile"],
  },
  {
    id: "gull",
    label: "Gull Wings",
    tags: ["lift"],
  },
  {
    id: "blade",
    label: "Blade Wings",
    tags: ["strike"],
  },
  {
    id: "quad",
    label: "Quad Wing Pylons",
    tags: ["support"],
  },
];

const WEAPON_TYPES = [
  {
    id: "pulse",
    label: "Pulse Cannons",
    tags: ["precision"],
  },
  {
    id: "gatling",
    label: "Gatling Array",
    tags: ["suppress"],
  },
  {
    id: "lance",
    label: "Lance Emitters",
    tags: ["pierce"],
  },
  {
    id: "quad",
    label: "Quad Rail Cannons",
    tags: ["heavy"],
  },
  {
    id: "turret",
    label: "Remote Turrets",
    tags: ["coverage"],
  },
];

const ORDNANCE_TYPES = [
  {
    id: "missile-pods",
    label: "Missile Pods",
    tags: ["volley"],
  },
  {
    id: "bomb-rack",
    label: "Bomb Rack",
    tags: ["siege"],
  },
  {
    id: "torpedo",
    label: "Torpedo Tubes",
    tags: ["naval"],
  },
  {
    id: "drone-bay",
    label: "Drone Bay",
    tags: ["support"],
  },
  {
    id: "flare",
    label: "Countermeasure Web",
    tags: ["defense"],
  },
];

const FIN_TYPES = [
  {
    id: "twin-vertical",
    label: "Twin Vertical Fins",
    tags: ["stability"],
  },
  {
    id: "v-tail",
    label: "V-Tail",
    tags: ["sleek"],
  },
  {
    id: "ring",
    label: "Ring Stabilizer",
    tags: ["maneuver"],
  },
  {
    id: "grid",
    label: "Grid Rudder",
    tags: ["retro"],
  },
  {
    id: "quad",
    label: "Quad Rudders",
    tags: ["control"],
  },
];

const COCKPIT_POSITIONS = [
  { id: "front", label: "Forward Cockpit" },
  { id: "mid", label: "Mid-Ship Cockpit" },
  { id: "aft", label: "Aft Cockpit" },
  { id: "tandem", label: "Tandem Capsule" },
];

const FEATURE_MAP = {
  hull: HULL_TYPES,
  wings: WING_TYPES,
  weapon: WEAPON_TYPES,
  ordnance: ORDNANCE_TYPES,
  fins: FIN_TYPES,
  cockpit: COCKPIT_POSITIONS,
};

const NICKNAMES = [
  "Comet",
  "Phantom",
  "Valkyrie",
  "Corsair",
  "Specter",
  "Warden",
  "Nomad",
  "Gryphon",
  "Arrow",
  "Oracle",
  "Cyclone",
  "Harrier",
];

let modelCounter = 0;
const activePreviews = new Set();

function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function lookupFeature(collection, id) {
  return collection.find((item) => item.id === id);
}

function rgbToHex(r, g, b) {
  const toHex = (value) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex) {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function jitterColor(hex, variance = 0.15) {
  const { r, g, b } = hexToRgb(hex);
  const jitter = () => clamp(Math.round((Math.random() * 2 - 1) * 255 * variance), -64, 64);
  const nr = clamp(r + jitter(), 0, 255);
  const ng = clamp(g + jitter(), 0, 255);
  const nb = clamp(b + jitter(), 0, 255);
  return rgbToHex(nr, ng, nb);
}

function createPalette(seedHue = Math.random()) {
  const baseHue = seedHue;
  const accentHue = (baseHue + 0.12) % 1;
  const glowHue = (baseHue + 0.45) % 1;

  const toRgb = (h, s, l) => {
    // Simple HSL → RGB conversion keeps palettes cohesive.
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r;
    let g;
    let b;

    if (s === 0) {
      r = g = b = l; // Achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  };

  const hull = toRgb(baseHue, 0.35, 0.42);
  const accent = toRgb(accentHue, 0.45, 0.55);
  const glass = toRgb((baseHue + 0.58) % 1, 0.32, 0.7);
  const glow = toRgb(glowHue, 0.6, 0.6);

  return {
    hull: rgbToHex(hull.r, hull.g, hull.b),
    accent: rgbToHex(accent.r, accent.g, accent.b),
    glass: rgbToHex(glass.r, glass.g, glass.b),
    glow: rgbToHex(glow.r, glow.g, glow.b),
  };
}

function mutatePalette(basePalette) {
  return {
    hull: jitterColor(basePalette.hull, 0.08),
    accent: jitterColor(basePalette.accent, 0.12),
    glass: jitterColor(basePalette.glass, 0.05),
    glow: jitterColor(basePalette.glow, 0.1),
  };
}

function createModel(overrides = {}) {
  const hull = overrides.hull ?? randomOf(HULL_TYPES).id;
  const wings = overrides.wings ?? randomOf(WING_TYPES).id;
  const weapon = overrides.weapon ?? randomOf(WEAPON_TYPES).id;
  const ordnance = overrides.ordnance ?? randomOf(ORDNANCE_TYPES).id;
  const fins = overrides.fins ?? randomOf(FIN_TYPES).id;
  const cockpit = overrides.cockpit ?? randomOf(COCKPIT_POSITIONS).id;
  const palette = overrides.palette ?? createPalette();
  const lineage = overrides.lineage ? [...overrides.lineage] : [];

  const hullData = lookupFeature(HULL_TYPES, hull);
  const wingsData = lookupFeature(WING_TYPES, wings);
  const weaponData = lookupFeature(WEAPON_TYPES, weapon);
  const ordnanceData = lookupFeature(ORDNANCE_TYPES, ordnance);
  const finsData = lookupFeature(FIN_TYPES, fins);
  const cockpitData = lookupFeature(COCKPIT_POSITIONS, cockpit);

  const tags = new Set([
    ...hullData.tags,
    ...wingsData.tags,
    ...weaponData.tags,
    ...ordnanceData.tags,
    ...finsData.tags,
  ]);

  const model = {
    id: `model-${modelCounter++}`,
    hull,
    wings,
    weapon,
    ordnance,
    fins,
    cockpit,
    palette,
    lineage,
    profile: hullData.profile,
    tags: Array.from(tags),
  };

  model.displayName = overrides.displayName ?? createCallsign(model);
  model.summary = createSummary(model);

  return model;
}

function mutateModel(baseModel) {
  const features = ["hull", "wings", "weapon", "ordnance", "fins", "cockpit"];
  const mutated = {
    hull: baseModel.hull,
    wings: baseModel.wings,
    weapon: baseModel.weapon,
    ordnance: baseModel.ordnance,
    fins: baseModel.fins,
    cockpit: baseModel.cockpit,
    palette: mutatePalette(baseModel.palette),
    lineage: [...(baseModel.lineage ?? []), baseModel.id],
  };

  const changeCount = 1 + Math.floor(Math.random() * 3);
  const used = new Set();

  for (let i = 0; i < changeCount; i += 1) {
    const key = randomOf(features.filter((feature) => !used.has(feature)));
    used.add(key);

    const collection = FEATURE_MAP[key];
    let choice = randomOf(collection).id;
    // Make sure we actually change the feature.
    if (choice === baseModel[key]) {
      const available = collection.filter((item) => item.id !== baseModel[key]);
      choice = randomOf(available).id;
    }

    mutated[key] = choice;
  }

  const model = createModel(mutated);
  model.parentId = baseModel.id;
  return model;
}

function createSummary(model) {
  const pieces = [
    lookupFeature(HULL_TYPES, model.hull).label,
    lookupFeature(WING_TYPES, model.wings).label,
    lookupFeature(WEAPON_TYPES, model.weapon).label,
    lookupFeature(ORDNANCE_TYPES, model.ordnance).label,
    lookupFeature(FIN_TYPES, model.fins).label,
    lookupFeature(COCKPIT_POSITIONS, model.cockpit).label,
  ];

  return pieces.join(" • ");
}

function createCallsign(model) {
  const adjectives = [
    "Azure",
    "Crimson",
    "Obsidian",
    "Silver",
    "Nebula",
    "Solar",
    "Star",
    "Echo",
    "Luminous",
    "Ghost",
    "Iron",
    "Sable",
  ];

  const nouns = {
    Interceptor: ["Striker", "Arrow", "Dart"],
    Gunship: ["Mauler", "Anvil", "Reaver"],
    Scout: ["Sparrow", "Courier", "Wisp"],
    Support: ["Courier", "Lamp", "Pilot"],
    Carrier: ["Bastion", "Citadel", "Atlas"],
  };

  const nounList = nouns[model.profile] ?? ["Vector", "Chimera", "Nova"];
  return `${randomOf(adjectives)} ${randomOf(NICKNAMES.concat(nounList))}`;
}

// -- Scene building helpers -------------------------------------------------

function createMaterial(color, { metalness = 0.35, roughness = 0.45, emissive = 0x000000 } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness,
    roughness,
    emissive,
    emissiveIntensity: 0.45,
  });

  return mat;
}

function createTrimDetail(material, width, height, depth) {
  // Sub-panels give the silhouettes a layered feel without complicating UVs.
  const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  panel.castShadow = false;
  panel.receiveShadow = false;
  return panel;
}

function buildHullGeometry(model) {
  const group = new THREE.Group();
  const color = model.palette.hull;
  const material = createMaterial(color);
  const accentMaterial = createMaterial(model.palette.accent, { metalness: 0.5, roughness: 0.35 });

  switch (model.hull) {
    case "needle": {
      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 6.6, 18, 1, true), material);
      fuselage.rotation.z = Math.PI / 2;
      group.add(fuselage);

      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.4, 18), material);
      nose.rotation.z = Math.PI / 2;
      nose.position.x = 4;
      group.add(nose);

      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 2.2, 14), material);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -3.8;
      group.add(tail);

      const spine = createTrimDetail(accentMaterial, 6.2, 0.12, 0.4);
      spine.rotation.z = Math.PI / 2;
      spine.position.x = 0.2;
      spine.position.y = 0.42;
      group.add(spine);

      const intake = createTrimDetail(accentMaterial, 2, 0.22, 0.22);
      intake.rotation.z = Math.PI / 2;
      intake.position.set(1.1, -0.35, 0);
      group.add(intake);
      break;
    }
    case "broadhead": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 1.8), material);
      group.add(body);

      const prow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.8, 18), material);
      prow.rotation.z = Math.PI / 2;
      prow.position.x = 2.8;
      group.add(prow);

      const prowRidge = createTrimDetail(accentMaterial, 2.1, 0.18, 0.65);
      prowRidge.rotation.z = Math.PI / 2;
      prowRidge.position.set(1.6, 0.35, 0);
      group.add(prowRidge);

      const stern = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.9, 2.4, 12), material);
      stern.rotation.z = Math.PI / 2;
      stern.position.x = -3.1;
      group.add(stern);

      for (let i = 0; i < 3; i += 1) {
        const plating = createTrimDetail(accentMaterial, 1.2, 0.2, 2.6 - i * 0.4);
        plating.rotation.z = Math.PI / 2;
        plating.position.set(-0.8 - i * 0.9, 0.6 - i * 0.08, 0);
        group.add(plating);
      }
      break;
    }
    case "arrow": {
      const core = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 1.2), material);
      group.add(core);

      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 14), material);
      spike.rotation.z = Math.PI / 2;
      spike.position.x = 3.3;
      group.add(spike);

      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.8, 12), material);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -3;
      group.add(tail);

      const keel = createTrimDetail(accentMaterial, 4.6, 0.14, 0.5);
      keel.rotation.z = Math.PI / 2;
      keel.position.set(0.4, -0.45, 0);
      group.add(keel);

      const canard = createTrimDetail(accentMaterial, 1, 0.1, 0.8);
      canard.rotation.z = Math.PI / 2;
      canard.position.set(2.4, 0.2, 0);
      group.add(canard);
      break;
    }
    case "dragonfly": {
      const segments = new THREE.Group();
      for (let i = 0; i < 3; i += 1) {
        const module = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 0.8, 6, 12), material);
        module.rotation.z = Math.PI / 2;
        module.position.set(1.2 - i * 1.5, 0.1 * Math.sin(i), 0);
        segments.add(module);

        const harness = createTrimDetail(accentMaterial, 0.9, 0.12, 1.1);
        harness.rotation.z = Math.PI / 2;
        harness.position.set(1.2 - i * 1.5, 0.4, 0);
        segments.add(harness);
      }
      group.add(segments);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.8), material);
      tail.position.set(-2.7, 0, 0);
      group.add(tail);

      const tailStruts = createTrimDetail(accentMaterial, 1.4, 0.12, 1.2);
      tailStruts.rotation.z = Math.PI / 2;
      tailStruts.position.set(-2.7, 0.45, 0);
      group.add(tailStruts);
      break;
    }
    case "bastion":
    default: {
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.6, 2.5), material);
      group.add(chassis);

      const prow = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.8, 12), material);
      prow.rotation.z = Math.PI / 2;
      prow.position.x = 3.2;
      group.add(prow);

      const stern = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.2, 12), material);
      stern.rotation.z = Math.PI / 2;
      stern.position.x = -3.2;
      group.add(stern);

      for (let i = -1; i <= 1; i += 1) {
        const nacelle = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.6, 8, 16), material);
        nacelle.rotation.z = Math.PI / 2;
        nacelle.position.set(0.5 + i * 1.2, -0.7 + Math.abs(i) * 0.1, 1.5 - Math.abs(i) * 0.6);
        group.add(nacelle);

        const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 12, 24), accentMaterial);
        glowRing.rotation.set(Math.PI / 2, 0, 0);
        glowRing.position.copy(nacelle.position.clone().add(new THREE.Vector3(0.8, 0, 0)));
        group.add(glowRing);
      }

      const dorsalFin = createTrimDetail(accentMaterial, 2.8, 0.18, 1.4);
      dorsalFin.rotation.z = Math.PI / 2;
      dorsalFin.position.set(0.2, 0.75, 0);
      group.add(dorsalFin);
      break;
    }
  }

  return group;
}

function buildCockpit(model) {
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(model.palette.glass),
    metalness: 0.1,
    roughness: 0.05,
    clearcoat: 0.6,
    transmission: 0.8,
    opacity: 0.9,
    transparent: true,
  });
  const frameMaterial = createMaterial(model.palette.accent, { metalness: 0.55, roughness: 0.25 });
  const shroudMaterial = createMaterial(model.palette.hull, { metalness: 0.45, roughness: 0.4 });
  const canopyGeometry = new THREE.SphereGeometry(0.65, 24, 16, 0, Math.PI);

  const offsets = {
    front: 2.6,
    mid: 0.4,
    aft: -1.3,
    tandem: 1.4,
  };

  const canopyHeight = 0.82;
  const anchorX = offsets[model.cockpit] ?? 1.4;

  // Build a canopy assembly that sits proud of the fuselage so the silhouette reads
  // like a fighter jet cockpit with a framed bubble and dorsal shroud.
  const createCanopyAssembly = (offsetX) => {
    const assembly = new THREE.Group();

    const canopy = new THREE.Mesh(canopyGeometry, glassMaterial);
    canopy.scale.set(1, 0.8, 1.2);
    canopy.rotation.x = Math.PI / 2;
    canopy.position.set(offsetX, canopyHeight, 0);
    assembly.add(canopy);

    const shroud = createTrimDetail(shroudMaterial, 1.6, 0.12, 1.1);
    shroud.rotation.z = Math.PI / 2;
    shroud.position.set(offsetX - 0.05, canopyHeight - 0.28, 0);
    assembly.add(shroud);

    const frame = createTrimDetail(frameMaterial, 1.2, 0.05, 0.26);
    frame.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    frame.position.set(offsetX + 0.25, canopyHeight + 0.08, 0);
    assembly.add(frame);

    const spine = createTrimDetail(frameMaterial, 0.9, 0.04, 1.2);
    spine.rotation.z = Math.PI / 2;
    spine.position.set(offsetX + 0.32, canopyHeight + 0.22, 0);
    assembly.add(spine);

    return assembly;
  };

  if (model.cockpit === "tandem") {
    const cockpitGroup = new THREE.Group();
    cockpitGroup.add(createCanopyAssembly(anchorX));
    cockpitGroup.add(createCanopyAssembly(anchorX - 1.15));
    return cockpitGroup;
  }

  return createCanopyAssembly(anchorX);
}

function buildWingGeometry(model) {
  const group = new THREE.Group();
  const material = createMaterial(model.palette.accent, { metalness: 0.25, roughness: 0.5 });
  const trimMaterial = createMaterial(model.palette.glow, { metalness: 0.1, roughness: 0.2, emissive: 0x112233 });
  // A hull-tone mount helps sell the idea that the wings sprout from a reinforced shoulder.
  const mountMaterial = createMaterial(model.palette.hull, { metalness: 0.45, roughness: 0.4 });
  const { wings } = model;

  // Each wing variant returns its own group per side so we can dial in dihedral,
  // sweep, and winglet accents independently for fighter silhouettes.
  const addWingPair = (factory, position) => {
    const leftWing = factory(1);
    leftWing.position.set(position.x, position.y, position.z);
    group.add(leftWing);

    const rightWing = factory(-1);
    rightWing.position.set(position.x, position.y, -position.z);
    group.add(rightWing);
  };

  switch (wings) {
    case "delta": {
      // Broad, aggressive triangles inspired by classic R-Type craft.
      addWingPair((side) => {
        const wingGroup = new THREE.Group();

        const rootFairing = createTrimDetail(mountMaterial, 1.6, 0.18, 0.55);
        rootFairing.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        rootFairing.position.set(0.25, 0.22, 0.28 * side);
        wingGroup.add(rootFairing);

        const delta = new THREE.Mesh(new THREE.ConeGeometry(2.8, 5.4, 4, 1, true), material);
        delta.rotation.set(Math.PI / 2.2, Math.PI / 10 * side, Math.PI / 2);
        delta.position.set(1.3, 0.3, 0);
        wingGroup.add(delta);

        const strake = createTrimDetail(trimMaterial, 3.4, 0.08, 0.36);
        strake.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        strake.position.set(1.5, 0.18, 0.44 * side);
        wingGroup.add(strake);

        const ventral = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.22), material);
        ventral.rotation.set(Math.PI / 2.05, 0, Math.PI / 2);
        ventral.position.set(1.8, -0.1, 0.06 * side);
        wingGroup.add(ventral);

        return wingGroup;
      }, { x: 0.5, y: 0.68, z: 2.35 });
      break;
    }
    case "forward-swept": {
      // Forward canted wings with high-mounted canards for a sleek interceptor look.
      addWingPair((side) => {
        const wingGroup = new THREE.Group();

        const rootFairing = createTrimDetail(mountMaterial, 1.2, 0.14, 0.48);
        rootFairing.rotation.set(Math.PI / 2, 0, Math.PI / 2.2);
        rootFairing.position.set(0.2, 0.28, 0.32 * side);
        wingGroup.add(rootFairing);

        const forwardPlane = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 0.95), material);
        forwardPlane.rotation.set(Math.PI / 2.4, Math.PI / 9 * side, Math.PI / 2.1);
        forwardPlane.position.set(1.4, 0.4, 0);
        wingGroup.add(forwardPlane);

        const canard = createTrimDetail(trimMaterial, 2.2, 0.05, 0.3);
        canard.rotation.set(Math.PI / 2, 0, Math.PI / 2.3);
        canard.position.set(2.4, 0.92, 0.46 * side);
        wingGroup.add(canard);

        const wingtip = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.2, 12), trimMaterial);
        wingtip.rotation.set(Math.PI / 2.3, 0, 0);
        wingtip.position.set(3.3, 0.2, 0.16 * side);
        wingGroup.add(wingtip);

        return wingGroup;
      }, { x: 0.4, y: 0.74, z: 2.1 });
      break;
    }
    case "gull": {
      // Suspended engine pods evoke the classic Y-wing profile.
      addWingPair((side) => {
        const wingGroup = new THREE.Group();

        const spar = createTrimDetail(mountMaterial, 2.6, 0.12, 0.18);
        spar.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        spar.position.set(0.6, 0.4, 0.14 * side);
        wingGroup.add(spar);

        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.6, 0.26), mountMaterial);
        pylon.position.set(1.2, -0.1, 0.86 * side);
        wingGroup.add(pylon);

        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 2.8, 18), material);
        nacelle.rotation.z = Math.PI / 2;
        nacelle.position.set(1.2, 0.1, 1.6 * side);
        wingGroup.add(nacelle);

        const connector = createTrimDetail(trimMaterial, 2.4, 0.06, 0.32);
        connector.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        connector.position.set(2.1, 0.32, 1.1 * side);
        wingGroup.add(connector);

        const winglet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.4), material);
        winglet.rotation.set(Math.PI / 2.1, -Math.PI / 12 * side, Math.PI / 2);
        winglet.position.set(2.4, 0.95, 1.3 * side);
        wingGroup.add(winglet);

        return wingGroup;
      }, { x: 0.6, y: 0.7, z: 2.6 });
      break;
    }
    case "blade": {
      // Downward fins double as strike foils for dramatic silhouettes.
      addWingPair((side) => {
        const wingGroup = new THREE.Group();

        const shoulder = createTrimDetail(mountMaterial, 1.4, 0.16, 0.44);
        shoulder.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        shoulder.position.set(0.22, 0.3, 0.26 * side);
        wingGroup.add(shoulder);

        const mainBlade = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.65), material);
        mainBlade.rotation.set(Math.PI / 1.95, Math.PI / 16 * side, Math.PI / 2.05);
        mainBlade.position.set(1.4, 0.22, 0);
        wingGroup.add(mainBlade);

        const ventral = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.8, 16), material);
        ventral.rotation.set(-Math.PI / 2.4, 0, 0);
        ventral.position.set(2, -0.45, 0.18 * side);
        wingGroup.add(ventral);

        const edge = createTrimDetail(trimMaterial, 3, 0.05, 0.16);
        edge.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        edge.position.set(1.3, -0.05, 0.22 * side);
        wingGroup.add(edge);

        return wingGroup;
      }, { x: 0.7, y: 0.66, z: 1.95 });
      break;
    }
    case "quad":
    default: {
      // Four foils stacked like an X-wing with glowing cannons on the tips.
      addWingPair((side) => {
        const wingGroup = new THREE.Group();

        const root = createTrimDetail(mountMaterial, 1.8, 0.18, 0.5);
        root.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        root.position.set(0.3, 0.24, 0.32 * side);
        wingGroup.add(root);

        const buildFoil = (verticalOffset) => {
          const foil = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.9), material);
          foil.rotation.set(Math.PI / 2.2, Math.PI / 18 * side, Math.PI / 2);
          foil.position.set(1.4, 0.34 + verticalOffset, 0);
          wingGroup.add(foil);

          const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 12), trimMaterial);
          cannon.rotation.z = Math.PI / 2;
          cannon.position.set(3, 0.3 + verticalOffset, 0.38 * side);
          wingGroup.add(cannon);

          const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), trimMaterial);
          muzzle.position.set(3.75, 0.3 + verticalOffset, 0.38 * side);
          wingGroup.add(muzzle);
        };

        buildFoil(0.28);
        buildFoil(-0.28);

        return wingGroup;
      }, { x: 0.5, y: 0.76, z: 2.3 });
      break;
    }
  }

  return group;
}

function buildWeaponGeometry(model) {
  const group = new THREE.Group();
  const material = createMaterial(model.palette.hull, { metalness: 0.45, roughness: 0.35 });
  const accentMaterial = createMaterial(model.palette.accent, { metalness: 0.5, roughness: 0.25 });
  const glowMaterial = createMaterial(model.palette.glow, { metalness: 0.1, roughness: 0.2, emissive: 0x223344 });

  const cannonPair = (offset) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 12), accentMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(2.6, -0.2, offset);

    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 24), glowMaterial);
    muzzle.rotation.y = Math.PI / 2;
    muzzle.position.set(3.2, -0.2, offset);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.8, 12), material);
    base.rotation.z = Math.PI / 2;
    base.position.set(1.6, -0.2, offset);
    group.add(barrel, base, muzzle);
  };

  switch (model.weapon) {
    case "pulse": {
      cannonPair(0.55);
      cannonPair(-0.55);

      const capacitor = createTrimDetail(glowMaterial, 1.2, 0.2, 0.8);
      capacitor.rotation.z = Math.PI / 2;
      capacitor.position.set(1, 0.1, 0);
      group.add(capacitor);
      break;
    }
    case "gatling": {
      for (let i = 0; i < 3; i += 1) {
        cannonPair(0.9 - i * 0.9);
      }

      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 14), material);
      drum.position.set(0.4, -0.2, 0);
      group.add(drum);
      break;
    }
    case "lance": {
      const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 3, 20), accentMaterial);
      emitter.rotation.z = Math.PI / 2;
      emitter.position.set(2.9, 0.1, 0);
      group.add(emitter);

      const charge = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 12), glowMaterial);
      charge.position.set(1.2, 0.1, 0);
      group.add(charge);
      break;
    }
    case "turret": {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), material);
      dome.position.set(0.4, 0.6, 0);
      const turretBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 10), accentMaterial);
      turretBarrel.rotation.z = Math.PI / 2;
      turretBarrel.position.set(1.5, 0.7, 0);
      const sensor = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 10), glowMaterial);
      sensor.rotation.z = Math.PI / 2;
      sensor.position.set(0.8, 0.6, 0);
      group.add(dome, turretBarrel, sensor);
      break;
    }
    case "quad":
    default: {
      cannonPair(0.9);
      cannonPair(0.3);
      cannonPair(-0.3);
      cannonPair(-0.9);

      const targeting = createTrimDetail(glowMaterial, 1.6, 0.14, 0.4);
      targeting.rotation.z = Math.PI / 2;
      targeting.position.set(0.6, 0.1, 0);
      group.add(targeting);
      break;
    }
  }

  return group;
}

function buildOrdnanceGeometry(model) {
  const group = new THREE.Group();
  const material = createMaterial(model.palette.hull, { metalness: 0.35, roughness: 0.4 });
  const accent = createMaterial(model.palette.accent, { metalness: 0.35, roughness: 0.3 });
  const glow = createMaterial(model.palette.glow, { metalness: 0.1, roughness: 0.25, emissive: 0x112233 });

  switch (model.ordnance) {
    case "missile-pods": {
      for (let i = 0; i < 2; i += 1) {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.7), material);
        pod.position.set(-0.6, -0.5, 0.9 - i * 1.8);
        group.add(pod);

        for (let row = 0; row < 2; row += 1) {
          const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 10), glow);
          nozzle.rotation.z = Math.PI / 2;
          nozzle.position.set(-1.2, -0.5 + row * 0.25, 0.9 - i * 1.8 - 0.2 + row * 0.2);
          group.add(nozzle);
        }
      }
      break;
    }
    case "bomb-rack": {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.4), material);
      rack.position.set(-0.5, -0.7, 0);
      group.add(rack);

      for (let i = 0; i < 4; i += 1) {
        const bomb = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 6, 10), accent);
        bomb.rotation.x = Math.PI / 2;
        bomb.position.set(-0.5, -1.2, 0.6 - i * 0.4);
        const fins = createTrimDetail(glow, 0.5, 0.04, 0.4);
        fins.rotation.x = Math.PI / 2;
        fins.position.set(-0.3, -1.2, 0.6 - i * 0.4);
        group.add(bomb, fins);
      }
      break;
    }
    case "torpedo": {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.6, 12), material);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0.6, -0.4, 0);
      group.add(tube);

      const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 12), accent);
      warhead.rotation.x = Math.PI / 2;
      warhead.position.set(2, -0.4, 0);
      group.add(warhead);

      const guidance = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 10, 24), glow);
      guidance.rotation.x = Math.PI / 2;
      guidance.position.set(1, -0.4, 0);
      group.add(guidance);
      break;
    }
    case "drone-bay": {
      const bay = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.8), material);
      bay.position.set(-0.8, -0.4, 0);
      group.add(bay);

      for (let i = 0; i < 3; i += 1) {
        const drone = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 8), accent);
        drone.rotation.z = Math.PI / 2;
        drone.position.set(-1.5, -0.2 + i * 0.25, -0.6 + i * 0.6);
        const thruster = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow);
        thruster.position.copy(drone.position.clone().add(new THREE.Vector3(-0.25, 0, 0)));
        group.add(drone, thruster);
      }
      break;
    }
    case "flare":
    default: {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 0.5, 12, 1, true), accent);
      bowl.position.set(-0.6, -0.3, 0);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), glow);
      core.position.set(-0.6, -0.1, 0);
      group.add(bowl, core);
      break;
    }
  }

  return group;
}

function buildFins(model) {
  const group = new THREE.Group();
  const material = createMaterial(model.palette.accent, { metalness: 0.28, roughness: 0.35 });
  const glow = createMaterial(model.palette.glow, { metalness: 0.1, roughness: 0.25, emissive: 0x112233 });

  switch (model.fins) {
    case "twin-vertical": {
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.7), material);
      left.position.set(-2.8, 0.7, 0.8);
      const right = left.clone();
      right.position.z = -0.8;
      const brace = createTrimDetail(glow, 0.8, 0.08, 1.4);
      brace.rotation.z = Math.PI / 2;
      brace.position.set(-2.6, 0.3, 0);
      group.add(left, right, brace);
      break;
    }
    case "v-tail": {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.9), material);
      fin.position.set(-2.4, 0.5, 0.6);
      fin.rotation.x = THREE.MathUtils.degToRad(28);
      const mirrored = fin.clone();
      mirrored.rotation.x = -THREE.MathUtils.degToRad(28);
      mirrored.position.z = -0.6;
      const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 12), glow);
      joint.rotation.z = Math.PI / 2;
      joint.position.set(-2.2, 0.3, 0);
      group.add(fin, mirrored, joint);
      break;
    }
    case "ring": {
      const torus = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 16, 32), material);
      torus.rotation.y = Math.PI / 2;
      torus.position.set(-2.4, 0.1, 0);
      const spokes = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 12), glow);
      spokes.position.set(-2.4, 0.1, 0);
      spokes.rotation.x = Math.PI / 2;
      group.add(torus, spokes);
      break;
    }
    case "grid": {
      for (let i = 0; i < 3; i += 1) {
        const finPiece = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1 - i * 0.1, 0.7), material);
        finPiece.position.set(-2.6 - i * 0.2, 0.4 + i * 0.1, 0);
        group.add(finPiece);
      }
      const lattice = createTrimDetail(glow, 1.4, 0.06, 0.2);
      lattice.rotation.z = Math.PI / 2;
      lattice.position.set(-2.8, 0.85, 0);
      group.add(lattice);
      break;
    }
    case "quad":
    default: {
      for (let i = 0; i < 2; i += 1) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.7), material);
        fin.position.set(-2.6 - i * 0.45, 0.55 + i * 0.25, 1);
        const mirrored = fin.clone();
        mirrored.position.z = -1;
        const link = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2, 10), glow);
        link.rotation.x = Math.PI / 2;
        link.position.set(-2.6 - i * 0.45, 0.4 + i * 0.2, 0);
        group.add(fin, mirrored, link);
      }
      break;
    }
  }

  return group;
}

function buildEngineGlow(model) {
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(model.palette.glow),
    emissive: new THREE.Color(model.palette.glow),
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.1,
  });

  const group = new THREE.Group();
  const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 1.2, 16, 1, true), glowMaterial);
  thruster.rotation.z = Math.PI / 2;
  thruster.position.x = -3.9;
  group.add(thruster);

  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), glowMaterial);
  glow.position.set(-4.4, 0, 0);
  group.add(glow);

  if (["bastion", "broadhead"].includes(model.hull)) {
    const outer = glow.clone();
    outer.position.z = 0.9;
    const inner = glow.clone();
    inner.position.z = -0.9;
    group.add(outer, inner);
  }

  return group;
}

function buildShip(model) {
  const group = new THREE.Group();
  group.add(buildHullGeometry(model));
  group.add(buildWingGeometry(model));
  group.add(buildWeaponGeometry(model));
  group.add(buildOrdnanceGeometry(model));
  group.add(buildFins(model));

  const cockpit = buildCockpit(model);
  if (cockpit instanceof THREE.Group) {
    cockpit.children.forEach((child) => group.add(child));
  } else {
    group.add(cockpit);
  }

  group.add(buildEngineGlow(model));

  return group;
}

// -- Preview management -----------------------------------------------------

class ShipPreview {
  constructor(container, model) {
    this.container = container;
    this.model = model;
    this.autoRotate = true;
    this.rotationSpeed = 0.01 + Math.random() * 0.005;
    this.scene = new THREE.Scene();
    this.scene.background = null;

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(5, 6, 8);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(-5, -2, -6);
    this.scene.add(ambient, key, rim);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(6, 3.8, 6.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.setModel(model);
    this.resize();
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
  }

  setModel(model) {
    this.model = model;
    if (this.ship) {
      this.scene.remove(this.ship);
      disposeObject(this.ship);
    }
    this.ship = buildShip(model);
    this.ship.rotation.set(THREE.MathUtils.degToRad(10), THREE.MathUtils.degToRad(35), 0);
    this.scene.add(this.ship);
  }

  resize() {
    const width = this.container.clientWidth || 300;
    const height = this.container.clientHeight || width * 0.75;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    if (this.autoRotate && this.ship) {
      this.ship.rotation.y += this.rotationSpeed;
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((material) => material.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.renderer.dispose();
    this.container.innerHTML = "";
  }
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function destroyPreviews() {
  activePreviews.forEach((preview) => preview.destroy());
  activePreviews.clear();
}

function registerPreview(preview) {
  activePreviews.add(preview);
}

// -- UI rendering -----------------------------------------------------------

function createTagBadge(tag) {
  const span = document.createElement("span");
  span.textContent = tag;
  return span;
}

function renderSelectedSection(model, onMutate, onRandomise) {
  const section = document.createElement("section");
  section.className = "model-stage";

  const header = document.createElement("header");
  header.className = "model-stage__header";

  const title = document.createElement("h2");
  title.className = "model-stage__title";
  title.textContent = model.displayName;
  header.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.textContent = model.profile;
  subtitle.setAttribute("aria-label", `Profile: ${model.profile}`);
  header.appendChild(subtitle);

  const actions = document.createElement("div");
  actions.className = "model-stage__actions";

  const mutateButton = document.createElement("button");
  mutateButton.className = "button";
  mutateButton.type = "button";
  mutateButton.textContent = "Mutate Children";
  mutateButton.addEventListener("click", onMutate);

  const randomButton = document.createElement("button");
  randomButton.className = "button";
  randomButton.type = "button";
  randomButton.textContent = "New Seed";
  randomButton.addEventListener("click", onRandomise);

  actions.append(mutateButton, randomButton);
  header.appendChild(actions);
  section.appendChild(header);

  const view = document.createElement("div");
  view.className = "stage-view";
  section.appendChild(view);

  const preview = new ShipPreview(view, model);
  registerPreview(preview);

  const description = document.createElement("div");
  description.className = "model-description";

  const summary = document.createElement("p");
  summary.textContent = model.summary;
  description.appendChild(summary);

  const tagsRow = document.createElement("div");
  tagsRow.className = "variant-card__tags";
  model.tags.forEach((tag) => tagsRow.appendChild(createTagBadge(tag)));
  description.appendChild(tagsRow);

  section.appendChild(description);

  return section;
}

function renderVariantsSection(models, onSelect) {
  const section = document.createElement("section");
  section.className = "model-stage";

  const header = document.createElement("header");
  header.className = "model-stage__header";

  const title = document.createElement("h3");
  title.className = "model-stage__title";
  title.textContent = "Mutated Variants";
  header.appendChild(title);

  const hint = document.createElement("p");
  hint.textContent = "Click a variant to promote it to the main stage.";
  header.appendChild(hint);

  section.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "variant-grid";

  models.forEach((model) => {
    const card = document.createElement("article");
    card.className = "variant-card";
    card.tabIndex = 0;

    const cardTitle = document.createElement("h4");
    cardTitle.className = "variant-card__title";
    cardTitle.textContent = model.displayName;
    card.appendChild(cardTitle);

    const tags = document.createElement("div");
    tags.className = "variant-card__tags";
    model.tags.forEach((tag) => tags.appendChild(createTagBadge(tag)));
    card.appendChild(tags);

    const view = document.createElement("div");
    view.className = "variant-card__view";
    card.appendChild(view);

    const preview = new ShipPreview(view, model);
    registerPreview(preview);

    card.addEventListener("click", () => onSelect(model));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(model);
      }
    });

    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

function generateMutations(model) {
  const variants = [];
  for (let i = 0; i < 6; i += 1) {
    variants.push(mutateModel(model));
  }
  return variants;
}

function initGenerator(root) {
  let selected = createModel();
  let variants = generateMutations(selected);

  const render = () => {
    destroyPreviews();
    root.innerHTML = "";

    const selectedSection = renderSelectedSection(
      selected,
      () => {
        variants = generateMutations(selected);
        render();
      },
      () => {
        selected = createModel();
        variants = generateMutations(selected);
        render();
      },
    );

    const variantsSection = renderVariantsSection(variants, (model) => {
      selected = model;
      variants = generateMutations(selected);
      render();
    });

    root.appendChild(selectedSection);
    root.appendChild(variantsSection);
  };

  render();
}

window.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("generator");
  if (root) {
    initGenerator(root);
  }
});
