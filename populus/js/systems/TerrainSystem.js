// Terrain definition copied from Battle Isle but trimmed so it can run without
// the turn based systems. Keeping the thresholds and base heights identical
// ensures the terrain looks the same across projects.
class TerrainSystem {
  static terrainTypes = {
    WATER: {
      name: 'water',
      moveCost: Infinity,
      baseHeight: 0,
      heightVariation: 0,
      threshold: 0.4,
      material: { color: 0x293d86 },
    },
    SAND: {
      name: 'sand',
      moveCost: 1.5,
      baseHeight: 0.1,
      heightVariation: 0.1,
      threshold: 0.45,
      material: { color: 0xe8a27d },
    },
    GRASS: {
      name: 'grass',
      moveCost: 1,
      baseHeight: 0.3,
      heightVariation: 0.1,
      threshold: 0.6,
      material: { color: 0x495627 },
    },
    FOREST: {
      name: 'forest',
      moveCost: 2,
      baseHeight: 0.5,
      heightVariation: 0.4,
      threshold: 0.7,
      material: { color: 0x322e17 },
    },
    MOUNTAIN: {
      name: 'mountain',
      moveCost: 3,
      baseHeight: 1,
      heightVariation: 4,
      threshold: 1.0,
      material: { color: 0x4f4d44 },
    },
  };

  static getTerrainTypeFromNoise(noiseValue) {
    const sortedTypes = Object.entries(this.terrainTypes).sort(
      ([, a], [, b]) => a.threshold - b.threshold
    );
    for (const [type, data] of sortedTypes) {
      if (noiseValue <= data.threshold) {
        return type;
      }
    }
    return 'MOUNTAIN';
  }

  static getTerrainColor(terrainType) {
    return this.terrainTypes[terrainType]?.material?.color ?? this.terrainTypes.GRASS.material.color;
  }

  static getTerrainBaseHeight(terrainType) {
    return this.terrainTypes[terrainType]?.baseHeight ?? this.terrainTypes.GRASS.baseHeight;
  }

  static getTerrainHeightVariation(terrainType) {
    return this.terrainTypes[terrainType]?.heightVariation ?? 0;
  }

  static getTerrainMoveCost(terrainType) {
    return this.terrainTypes[terrainType]?.moveCost ?? 1;
  }

  static getLerpedTerrainColor(noiseValue) {
    const sortedTypes = Object.entries(this.terrainTypes).sort(
      ([, a], [, b]) => a.threshold - b.threshold
    );

    let currentType = sortedTypes[0][0];
    let nextType = currentType;
    let currentThreshold = 0;
    let nextThreshold = sortedTypes[0][1].threshold;

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
      return this.getTerrainColor(sortedTypes[sortedTypes.length - 1][0]);
    }

    if (currentType === 'WATER') {
      return this.getTerrainColor('WATER');
    }

    const lerpFactor = (noiseValue - currentThreshold) / (nextThreshold - currentThreshold || 1);
    const currentColor = new THREE.Color(this.getTerrainColor(currentType));
    const nextColor = new THREE.Color(this.getTerrainColor(nextType));
    currentColor.lerp(nextColor, lerpFactor);
    return currentColor.getHex();
  }

  static getRandomDecoration() {
    return null; // Decorations rely on the model loader which we deliberately skip here.
  }

  static isWater(type) {
    return type === 'WATER' || type === 'water';
  }
}
