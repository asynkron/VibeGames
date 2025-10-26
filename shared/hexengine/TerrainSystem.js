// Shared terrain definitions aligned with the Battle Isle prototype.
class TerrainSystem {
  static terrainTypes = {
    WATER: {
      name: 'water',
      moveCost: Infinity,
      baseHeight: 0,
      heightVariation: 0,
      heightModifier: 1,
      threshold: 0.4,
      impassable: true,
      decorations: [],
      material: {
        color: 0x293d86,
        metalness: 0.3,
        roughness: 0.4,
      },
    },
    SAND: {
      name: 'sand',
      moveCost: 1.5,
      baseHeight: 0.1,
      heightVariation: 0.1,
      heightModifier: 1,
      threshold: 0.45,
      impassable: false,
      decorations: [
        {
          model: '/assets/3d/decorator_natural_dune.obj',
          color: 0xe8b27d,
          chance: 0.05,
        },
      ],
      material: {
        color: 0xe8a27d,
        metalness: 0.1,
        roughness: 0.6,
      },
    },
    GRASS: {
      name: 'grass',
      moveCost: 1,
      baseHeight: 0.3,
      heightVariation: 0.1,
      heightModifier: 1,
      threshold: 0.6,
      impassable: false,
      decorations: [
        {
          model: '/assets/3d/decorator_building_ruins.obj',
          color: 0x808080,
          chance: 0.003,
        },
        {
          model: '/assets/3d/decorator_building_watchtower.obj',
          color: 0x696969,
          chance: 0.002,
        },
        {
          model: '/assets/3d/decorator_building_lightHouse.obj',
          color: 0xffffff,
          chance: 0.001,
        },
        {
          model: '/assets/3d/decorator_building_temple.obj',
          color: 0xdeb887,
          chance: 0.001,
        },
        {
          model: '/assets/3d/decorator_building_barracks.obj',
          color: 0x8b4513,
          chance: 0.002,
        },
        {
          model: '/assets/3d/decorator_building_barn.obj',
          color: 0x8b4513,
          chance: 0.003,
        },
        {
          model: '/assets/3d/decorator_building_city1.obj',
          color: 0xcd853f,
          chance: 0.001,
        },
        {
          model: '/assets/3d/decorator_building_city2.obj',
          color: 0xdeb887,
          chance: 0.001,
        },
        {
          model: '/assets/3d/decorator_building_towersignalLight.obj',
          color: 0x696969,
          chance: 0.001,
        },
        {
          model: '/assets/3d/decorator_natural_Forest_pine_cut.obj',
          color: 0x1b3b1b,
          chance: 0.01,
        },
        {
          model: '/assets/3d/decorator_natural_pineForest.obj',
          color: 0x1b3b1b,
          chance: 0.02,
        },
        {
          model: '/assets/3d/decorator_natural_forest_deciduous.obj',
          color: 0x355e3b,
          chance: 0.04,
        },
      ],
      material: {
        color: 0x495627,
        metalness: 0.15,
        roughness: 0.6,
      },
    },
    FOREST: {
      name: 'forest',
      moveCost: 2,
      baseHeight: 0.5,
      heightVariation: 0.4,
      heightModifier: 1,
      threshold: 0.7,
      impassable: false,
      decorations: [
        {
          model: '/assets/3d/decorator_natural_Forest_pine_cut.obj',
          color: 0x1b3b1b,
          chance: 0.1,
        },
        {
          model: '/assets/3d/decorator_natural_pineForest.obj',
          color: 0x1b3b1b,
          chance: 0.4,
        },
        {
          model: '/assets/3d/decorator_natural_forest_deciduous.obj',
          color: 0x355e3b,
          chance: 0.8,
        },
      ],
      material: {
        color: 0x322e17,
        metalness: 0.1,
        roughness: 0.6,
      },
    },
    MOUNTAIN: {
      name: 'mountain',
      moveCost: 3,
      baseHeight: 1,
      heightVariation: 4,
      heightModifier: 14.5,
      threshold: 1.0,
      impassable: true,
      decorations: [],
      material: {
        color: 0x4f4d44,
        metalness: 0.1,
        roughness: 0.8,
      },
    },
  };

  static getTerrainColor(terrainType) {
    return this.terrainTypes[terrainType]?.material?.color || this.terrainTypes.GRASS.material.color;
  }

  static getTerrainName(terrainType) {
    return this.terrainTypes[terrainType]?.name || 'grass';
  }

  static getTerrainBaseHeight(terrainType) {
    return this.terrainTypes[terrainType]?.baseHeight || this.terrainTypes.GRASS.baseHeight;
  }

  static getTerrainHeightVariation(terrainType) {
    return this.terrainTypes[terrainType]?.heightVariation || this.terrainTypes.GRASS.heightVariation;
  }

  static getTerrainHeightModifier(terrainType) {
    return this.terrainTypes[terrainType]?.heightModifier || 0;
  }

  static getTerrainThreshold(terrainType) {
    return this.terrainTypes[terrainType]?.threshold || this.terrainTypes.GRASS.threshold;
  }

  static isImpassable(terrainType) {
    return this.terrainTypes[terrainType]?.impassable || false;
  }

  static getMoveCost(hex, unit) {
    const engine = typeof window !== 'undefined' ? window.HEX_ENGINE : null;
    const roadsEnabled = engine?.getOption ? engine.getOption('enableRoads') : true;
    const unitsEnabled = engine?.getOption ? engine.getOption('enableUnitSystems') : true;

    if (roadsEnabled && typeof gameState !== 'undefined' && gameState?.map) {
      const tile = gameState.map.getTile(hex.userData.q, hex.userData.r);
      if (tile && tile.hasRoad) {
        return 0.5;
      }
    }

    const terrainType = hex?.userData?.type?.toUpperCase();

    if (
      unitsEnabled &&
      typeof UnitSystem !== 'undefined' &&
      UnitSystem.getMovementCost &&
      unit
    ) {
      const cost = UnitSystem.getMovementCost(unit.type, terrainType);
      if (typeof cost === 'number') {
        return cost;
      }
    }

    return this.terrainTypes[terrainType]?.moveCost ?? 1;
  }

  static getHeight(hex) {
    return hex?.userData?.height || 0;
  }

  static getTerrainTypeFromNoise(noiseValue) {
    const sortedTypes = Object.entries(this.terrainTypes).sort(([, a], [, b]) => a.threshold - b.threshold);
    for (const [type, data] of sortedTypes) {
      if (noiseValue <= data.threshold) {
        return type;
      }
    }
    return 'MOUNTAIN';
  }

  static getTerrainDecorations(terrainType) {
    const engine = typeof window !== 'undefined' ? window.HEX_ENGINE : null;
    if (!(engine?.getOption ? engine.getOption('enableDecorations') : true)) {
      return [];
    }
    return this.terrainTypes[terrainType]?.decorations || [];
  }

  static getRandomDecoration(terrainType) {
    const decorations = this.getTerrainDecorations(terrainType);
    if (decorations.length === 0) return null;
    for (const decoration of decorations) {
      if (Math.random() < decoration.chance) {
        return decoration;
      }
    }
    return null;
  }

  static addDecorator(hex, decoratorType) {
    const engine = typeof window !== 'undefined' ? window.HEX_ENGINE : null;
    if (!(engine?.getOption ? engine.getOption('enableDecorations') : true)) {
      return;
    }
    if (typeof ModelSystem === 'undefined') {
      return;
    }
    if (this.decoratorModels && this.decoratorModels[decoratorType]) {
      const decorator = this.decoratorModels[decoratorType].clone();
      const worldPos = new HexCoord(hex.userData.q, hex.userData.r).getWorldPosition();
      decorator.position.set(worldPos.x, this.getHeight(hex), worldPos.z);
      decorator.rotation.y = Math.floor(Math.random() * 6) * (Math.PI / 3);
      hex.userData.decorator = decorator;
      scene.add(decorator);
    }
  }

  static getTerrainMaterial(terrainType) {
    return this.terrainTypes[terrainType]?.material || this.terrainTypes.GRASS.material;
  }

  static getLerpedTerrainColor(noiseValue) {
    const sortedTypes = Object.entries(this.terrainTypes).sort(([, a], [, b]) => a.threshold - b.threshold);

    let currentType = null;
    let nextType = null;
    let currentThreshold = 0;
    let nextThreshold = 1;

    for (let i = 0; i < sortedTypes.length; i++) {
      const [type, data] = sortedTypes[i];
      if (noiseValue <= data.threshold) {
        currentType = type;
        currentThreshold = i > 0 ? sortedTypes[i - 1][1].threshold : 0;
        nextType = i < sortedTypes.length - 1 ? sortedTypes[i + 1][0] : type;
        nextThreshold = data.threshold;
        break;
      }
    }

    if (!currentType) {
      const lastType = sortedTypes[sortedTypes.length - 1][0];
      return this.getTerrainColor(lastType);
    }

    if (currentType === 'WATER') {
      const waterColor = new THREE.Color(this.getTerrainColor('WATER'));
      return waterColor.getHex();
    }

    const lerpFactor = (noiseValue - currentThreshold) / (nextThreshold - currentThreshold || 1);
    const currentColor = new THREE.Color(this.getTerrainColor(currentType));
    const nextColor = new THREE.Color(this.getTerrainColor(nextType));

    const resultColor = new THREE.Color();
    resultColor.r = currentColor.r + (nextColor.r - currentColor.r) * lerpFactor;
    resultColor.g = currentColor.g + (nextColor.g - currentColor.g) * lerpFactor;
    resultColor.b = currentColor.b + (nextColor.b - currentColor.b) * lerpFactor;

    return addColorVariation(resultColor).getHex();
  }

  static isWater(type) {
    return type === 'WATER' || type === 'water';
  }
}

if (typeof window !== 'undefined') {
  window.TerrainSystem = TerrainSystem;
}
