class HexCoord {
  constructor(q, r) {
    this.q = q;
    this.r = r;
  }

  static getHexPosition(q, r) {
    const x = MAP_CONFIG.HEX_RADIUS * 1.5 * q;
    const z = MAP_CONFIG.HEX_RADIUS * Math.sqrt(3) * (r + (q % 2) / 2);
    return { x, z };
  }

  static isWithinMapBounds(q, r) {
    return q >= 0 && q < MAP_CONFIG.COLS && r >= 0 && r < MAP_CONFIG.ROWS;
  }

  static findHex(q, r) {
    return GridSystem.findHex(q, r);
  }

  static getNeighbors(q, r) {
    const isOddColumn = q % 2 === 1;
    return [
      { q: q - 1, r: r - (isOddColumn ? 0 : 1) },
      { q, r: r - 1 },
      { q: q + 1, r: r - (isOddColumn ? 0 : 1) },
      { q: q + 1, r: r + 1 - (isOddColumn ? 0 : 1) },
      { q, r: r + 1 },
      { q: q - 1, r: r + 1 - (isOddColumn ? 0 : 1) },
    ];
  }

  static getWorldPositionFromCoords(q, r, height = 0) {
    const pos = HexCoord.getHexPosition(q, r);
    return new THREE.Vector3(pos.x, height, pos.z);
  }

  getKey() {
    return `${this.q},${this.r}`;
  }

  getWorldPosition(height = 0) {
    return HexCoord.getWorldPositionFromCoords(this.q, this.r, height);
  }
}
