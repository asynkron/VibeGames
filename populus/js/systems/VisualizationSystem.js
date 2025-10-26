class VisualizationSystem {
  static cursorHex = null;
  static selectedHex = null;
  static cursorMesh = null;
  static selectedMesh = null;
  static highlightGroup = null;
  static pulseStart = performance.now();

  static ensureHighlightGroup() {
    if (!this.highlightGroup) {
      this.highlightGroup = new THREE.Group();
      this.highlightGroup.name = 'highlights';
      group.add(this.highlightGroup);
    }
    return this.highlightGroup;
  }

  static createHighlightMesh(hex, color, opacity = 0.45) {
    const shape = new THREE.Shape();
    const radius = MAP_CONFIG.HEX_RADIUS * 0.95;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(hex.userData.x, hex.userData.height + VISUAL_OFFSETS.HIGHLIGHT_OFFSET, hex.userData.z);
    mesh.renderOrder = -1;
    return mesh;
  }

  static setCursorHex(hex) {
    if (this.cursorHex === hex) return;

    const highlights = this.ensureHighlightGroup();
    if (this.cursorMesh) {
      highlights.remove(this.cursorMesh);
      this.cursorMesh.geometry.dispose();
      this.cursorMesh.material.dispose();
      this.cursorMesh = null;
    }

    this.cursorHex = hex;
    if (hex) {
      this.cursorMesh = this.createHighlightMesh(hex, HIGHLIGHT_COLORS.CURSOR, 0.3);
      this.cursorMesh.name = 'cursorHighlight';
      highlights.add(this.cursorMesh);
    }
  }

  static setSelectedHex(hex) {
    if (this.selectedHex === hex) return;

    const highlights = this.ensureHighlightGroup();
    if (this.selectedMesh) {
      highlights.remove(this.selectedMesh);
      this.selectedMesh.geometry.dispose();
      this.selectedMesh.material.dispose();
      this.selectedMesh = null;
    }

    this.selectedHex = hex;
    if (hex) {
      this.selectedMesh = this.createHighlightMesh(hex, HIGHLIGHT_COLORS.SELECTION, 0.5);
      this.selectedMesh.name = 'selectionHighlight';
      highlights.add(this.selectedMesh);
    }
  }

  static clearAll() {
    this.setCursorHex(null);
    this.setSelectedHex(null);
  }

  static updateCursorHighlight() {
    if (!this.cursorMesh) return;
    const elapsed = (performance.now() - this.pulseStart) / 1000;
    const pulse = (Math.sin(elapsed * 3) + 1) / 2;
    this.cursorMesh.material.opacity = 0.2 + pulse * 0.25;
  }
}
