// MapSystem.js - Manages the game map and tiles

class Tile {
    constructor(height, type, color) {
        this.height = height;
        this.type = type;
        this.color = color;
        this.hasRoad = false;
    }
}

class GameMap {
    constructor(rows = MAP_CONFIG.ROWS, cols = MAP_CONFIG.COLS) {
        this.rows = rows;
        this.cols = cols;
        this.tiles = [];
        // Initialize empty 2D array using axial coordinates [q][r]
        for (let q = 0; q < cols; q++) {
            this.tiles[q] = [];
        }
        this.generateMap();
    }

    // Generates the terrain map using Perlin noise for height variation
    generateMap() {
        for (let q = 0; q < this.cols; q++) {
            for (let r = 0; r < this.rows; r++) {
                // Normalize noise value from [-1,1] to [0,1]
                const rawNoise = perlinNoise(q / TERRAIN_CONFIG.PERLIN_SCALE, r / TERRAIN_CONFIG.PERLIN_SCALE);
                const noiseValue = (rawNoise + 1) / 2;

                // Determine terrain type based on noise value
                const terrainType = TerrainSystem.getTerrainTypeFromNoise(noiseValue);

                // Get base height for this terrain type
                const baseHeight = TerrainSystem.getTerrainBaseHeight(terrainType);
                const heightVariation = Math.random() * TerrainSystem.getTerrainHeightVariation(terrainType);

                // For water, use fixed height. For other terrain, use noise value but ensure minimum height
                let height;
                if (terrainType === 'WATER') {
                    height = baseHeight; // Fixed height for water
                } else {
                    // Scale height and subtract terrain offset to create valleys
                    height = baseHeight + (noiseValue * TERRAIN_CONFIG.HEIGHT_SCALE + heightVariation) - TERRAIN_CONFIG.VALLEY_OFFSET;
                }

                const color = TerrainSystem.getLerpedTerrainColor(noiseValue);

                this.tiles[q][r] = new Tile(height, terrainType, color);
            }
        }


    }

    getTile(q, r) {
        if (q >= 0 && q < this.cols && r >= 0 && r < this.rows) {
            return this.tiles[q][r];
        }
        return null;
    }
}

console.log('MapSystem.js loaded'); 