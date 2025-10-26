class GridSystem {
  static hexGrid = [];
  static miniHexGeometry = null;
  static materialCache = new Map();

  static generateHexBufferData(radius, height) {
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      vertices.push(radius * Math.cos(angle), 0, radius * Math.sin(angle));
      uvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
    }

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      vertices.push(radius * Math.cos(angle), height, radius * Math.sin(angle));
      uvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
    }

    vertices.push(0, 0, 0, 0, height, 0);
    uvs.push(0.5, 0.5, 0.5, 0.5);

    for (let i = 0; i < 6; i++) {
      indices.push(13, 6 + ((i + 1) % 6), 6 + i);
      indices.push(12, i, (i + 1) % 6);
      const next = (i + 1) % 6;
      indices.push(i, i + 6, next);
      indices.push(i + 6, next + 6, next);
    }

    return { vertices, uvs, indices };
  }

  static createHexGeometryWithColor(radius, height, color) {
    const geometry = new THREE.BufferGeometry();
    geometry.userData.intendedColor = new THREE.Color(color);
    const { vertices, uvs, indices } = this.generateHexBufferData(radius, height);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const colors = new Float32Array(vertices.length);
    const baseColor = geometry.userData.intendedColor;
    for (let i = 0; i < vertices.length; i += 3) {
      colors[i] = baseColor.r;
      colors[i + 1] = baseColor.g;
      colors[i + 2] = baseColor.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }

  static createBoundingMesh(height, x, z) {
    const boundingGeometry = this.createHexGeometryWithColor(MAP_CONFIG.HEX_RADIUS, height, 0xffffff);
    const boundingMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    const boundingMesh = new THREE.Mesh(boundingGeometry, boundingMaterial);
    boundingMesh.position.set(x, 0, z);
    boundingMesh.userData = { isBoundingMesh: true };
    boundingMesh.raycast = THREE.Mesh.prototype.raycast;
    return boundingMesh;
  }

  static createStandardMaterial(type) {
    if (this.materialCache.has(type)) {
      return this.materialCache.get(type);
    }
    const materialProps = TerrainSystem.terrainTypes[type.toUpperCase()]?.material ?? {};
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(materialProps.color ?? 0xffffff),
      metalness: materialProps.metalness ?? 0.1,
      roughness: materialProps.roughness ?? 0.7,
      flatShading: true,
      vertexColors: true,
    });
    material.shadowSide = THREE.FrontSide;
    this.materialCache.set(type, material);
    return material;
  }

  static createHexPrism(color, x, z, height, moveCost, type, q, r) {
    const hexGroup = new THREE.Group();

    const boundingMesh = this.createBoundingMesh(height, x, z);
    hexGroup.add(boundingMesh);

    const hexMesh = new THREE.Mesh(
      this.createHexGeometryWithColor(MAP_CONFIG.HEX_RADIUS, height, color),
      this.createStandardMaterial(type)
    );
    hexMesh.position.set(x, 0, z);
    hexMesh.castShadow = true;
    hexMesh.receiveShadow = true;
    hexGroup.add(hexMesh);

    const userData = { x, z, height, moveCost, type, q, r };
    if (TerrainSystem.isWater(type.toUpperCase())) {
      userData.timeOffset = Math.random() * Math.PI * 2;
      userData.originalHeight = height;
    }
    hexGroup.userData = userData;
    boundingMesh.userData = { ...userData, isBoundingMesh: true };

    return hexGroup;
  }

  static createMiniHex(color, x, z) {
    if (!this.miniHexGeometry) {
      const vertices = [];
      const indices = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        vertices.push(Math.cos(angle) * MAP_CONFIG.HEX_RADIUS * 0.8, 0, Math.sin(angle) * MAP_CONFIG.HEX_RADIUS * 0.8);
      }
      vertices.push(0, 0, 0);
      for (let i = 0; i < 6; i++) {
        indices.push(6, i, (i + 1) % 6);
      }
      this.miniHexGeometry = new THREE.BufferGeometry();
      this.miniHexGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      this.miniHexGeometry.setIndex(indices);
    }

    const miniHexGroup = new THREE.Group();
    const glowColor = new THREE.Color(color).multiplyScalar(1.4);
    const mainMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    });
    const mainHex = new THREE.Mesh(this.miniHexGeometry, mainMaterial);
    mainHex.position.set(x, 0, z);
    miniHexGroup.add(mainHex);
    return miniHexGroup;
  }

  static async createMap(gameMap) {
    this.clear();

    const mapCenterX = (MAP_CONFIG.COLS * MAP_CONFIG.HEX_RADIUS * 1.5) / 2;
    const mapCenterZ = (MAP_CONFIG.ROWS * MAP_CONFIG.HEX_RADIUS * Math.sqrt(3)) / 2;

    for (let q = 0; q < MAP_CONFIG.COLS; q++) {
      for (let r = 0; r < MAP_CONFIG.ROWS; r++) {
        const x = MAP_CONFIG.HEX_RADIUS * 1.5 * q;
        const z = MAP_CONFIG.HEX_RADIUS * Math.sqrt(3) * (r + (q % 2) / 2);
        const tile = gameMap.getTile(q, r);
        if (!tile) continue;
        const type = tile.type.toLowerCase();
        const hex = this.createHexPrism(tile.color, x, z, tile.height, tile.moveCost, type, q, r);
        hex.userData.color = tile.color;
        group.add(hex);
        this.hexGrid.push(hex);

        const miniHex = this.createMiniHex(tile.color, x, z);
        miniMapScene.add(miniHex);
      }
    }

    this.smoothTerrain();
    return { mapCenterX, mapCenterZ };
  }

  static smoothTerrain() {
    this.hexGrid.forEach((hexGroup) => this.smoothHexTile(hexGroup));
  }

  static smoothHexTile(hexGroup) {
    const hexMesh = hexGroup.children.find(
      (child) => child instanceof THREE.Mesh && !child.userData.isBoundingMesh
    );
    if (!hexMesh) return;

    const geometry = hexMesh.geometry;
    const position = geometry.attributes.position;
    const { q, r, height: currentHeight, type } = hexGroup.userData;

    const neighbors = this.getHexNeighbors(q, r);
    const vertexNeighbors = [
      [neighbors[0], neighbors[5]],
      [neighbors[5], neighbors[4]],
      [neighbors[4], neighbors[3]],
      [neighbors[3], neighbors[2]],
      [neighbors[2], neighbors[1]],
      [neighbors[1], neighbors[0]],
    ];

    for (let i = 0; i < 6; i++) position.setY(i, 0);
    position.setY(12, 0);
    const normals = new Float32Array(position.count * 3);

    let highestHeight = -Infinity;
    let lowestHeight = Infinity;

    for (let i = 0; i < 6; i++) {
      const vertexIndex = i + 6;
      let totalHeight = currentHeight;
      let count = 1;
      const neighborCenters = [this.getWorldCoordinatesWithHeight(q, r, currentHeight)];
      const currentColor = hexMesh.geometry.userData.intendedColor;
      let totalR = currentColor.r;
      let totalG = currentColor.g;
      let totalB = currentColor.b;

      vertexNeighbors[i].forEach((neighbor) => {
        if (neighbor) {
          totalHeight += neighbor.userData.height;
          count++;
          const neighborMesh = neighbor.children.find(
            (child) => child instanceof THREE.Mesh && !child.userData.isBoundingMesh
          );
          if (neighborMesh && neighbor.userData.type !== 'water' && type !== 'water') {
            const neighborColor = neighborMesh.geometry.userData.intendedColor;
            totalR += neighborColor.r;
            totalG += neighborColor.g;
            totalB += neighborColor.b;
          }
          neighborCenters.push(
            this.getWorldCoordinatesWithHeight(neighbor.userData.q, neighbor.userData.r, neighbor.userData.height)
          );
        }
      });

      const hasWaterNeighbor = vertexNeighbors[i].some((n) => n && n.userData.type === 'water');
      const finalHeight =
        hasWaterNeighbor || type === 'water'
          ? TerrainSystem.getTerrainBaseHeight('WATER')
          : totalHeight / count;
      const avgR = totalR / count;
      const avgG = totalG / count;
      const avgB = totalB / count;

      const seed = finalHeight * 1000;
      const offsets = getVertexOffsets(seed);
      position.setXYZ(
        vertexIndex,
        position.getX(vertexIndex) + offsets.x,
        finalHeight,
        position.getZ(vertexIndex) + offsets.z
      );

      highestHeight = Math.max(highestHeight, finalHeight);
      lowestHeight = Math.min(lowestHeight, finalHeight);

      const colors = geometry.attributes.color;
      if (type === 'water') {
        const hasLandNeighbor = vertexNeighbors[i].some((n) => n && n.userData.type !== 'water');
        const foamColor = new THREE.Color(hasLandNeighbor ? WATER_FOAM_COLOR : hexGroup.userData.color);
        colors.setXYZ(vertexIndex, foamColor.r, foamColor.g, foamColor.b);
      } else {
        colors.setXYZ(vertexIndex, avgR, avgG, avgB);
      }
      colors.needsUpdate = true;

      let normal;
      if (neighborCenters.length >= 3) {
        const v1 = new THREE.Vector3().subVectors(neighborCenters[1], neighborCenters[0]);
        const v2 = new THREE.Vector3().subVectors(neighborCenters[2], neighborCenters[0]);
        normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
      } else {
        normal = new THREE.Vector3(0, 1, 0);
      }
      normals.set([normal.x, normal.y, normal.z], vertexIndex * 3);
      normals.set([normal.x, normal.y, normal.z], i * 3);
    }

    position.setY(13, (highestHeight + lowestHeight) / 2);
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  static getHexNeighborsCoords(q, r) {
    const isOddColumn = q % 2 === 1;
    const neighborOffsets = isOddColumn
      ? [
          [1, 0],
          [0, -1],
          [-1, 0],
          [-1, 1],
          [0, 1],
          [1, 1],
        ]
      : [
          [1, -1],
          [0, -1],
          [-1, -1],
          [-1, 0],
          [0, 1],
          [1, 0],
        ];
    return neighborOffsets.map(([dq, dr]) => [q + dq, r + dr]);
  }

  static getHexNeighbors(q, r) {
    return this.getHexNeighborsCoords(q, r).map(([nq, nr]) => this.findHex(nq, nr));
  }

  static animateWater(time) {
    this.hexGrid.forEach((hexGroup) => {
      if (hexGroup.userData.type !== 'water') return;
      const hexMesh = hexGroup.children.find(
        (child) => child instanceof THREE.Mesh && !child.userData.isBoundingMesh
      );
      if (!hexMesh) return;
      const geometry = hexMesh.geometry;
      const position = geometry.attributes.position;
      const { timeOffset, originalHeight } = hexGroup.userData;
      const amplitude = 0.015;
      const frequency = 2.5;
      const waveHeight = Math.sin((time + timeOffset) * frequency) * amplitude;

      const baseX =
        (position.getX(6) +
          position.getX(7) +
          position.getX(8) +
          position.getX(9) +
          position.getX(10) +
          position.getX(11)) /
        6;
      const baseZ =
        (position.getZ(6) +
          position.getZ(7) +
          position.getZ(8) +
          position.getZ(9) +
          position.getZ(10) +
          position.getZ(11)) /
        6;

      position.setXYZ(13, baseX, originalHeight + waveHeight, baseZ);
      position.needsUpdate = true;
    });
  }

  static getWorldCoordinates(q, r) {
    const x = MAP_CONFIG.HEX_RADIUS * 1.5 * q;
    const z = MAP_CONFIG.HEX_RADIUS * Math.sqrt(3) * (r + (q % 2) / 2);
    return new THREE.Vector3(x, 0, z);
  }

  static getWorldCoordinatesWithHeight(q, r, height = 0) {
    const pos = this.getWorldCoordinates(q, r);
    pos.y = height;
    return pos;
  }

  static findHex(q, r) {
    return this.hexGrid.find((h) => h.userData.q === q && h.userData.r === r);
  }

  static getHexIntersects(raycaster) {
    const intersectObjects = [];
    this.hexGrid.forEach((hexGroup) => {
      hexGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.userData.isBoundingMesh) {
          intersectObjects.push(child);
        }
      });
    });
    return raycaster.intersectObjects(intersectObjects, false);
  }

  static clear() {
    this.hexGrid.forEach((hex) => {
      group.remove(hex);
    });
    this.hexGrid.length = 0;
  }
}
