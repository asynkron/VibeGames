// utils.js
console.log('utils.js starting');

/*
 * Hex Grid Coordinate System and Neighbor Calculations
 * 
 * We use an offset coordinate system with flat-top hexes:
 * - q: column (horizontal position)
 * - r: row (vertical position)
 * 
 * The grid is offset, meaning odd columns are shifted up by half a hex height.
 * This creates a natural honeycomb pattern but requires special handling for neighbors.
 * 
 * For a hex at position (q,r):
 * 
 * Odd columns (q % 2 === 1):
 *   NW: (q-1, r)      N: (q, r-1)     NE: (q+1, r)
 *   SW: (q-1, r+1)    S: (q, r+1)     SE: (q+1, r+1)
 * 
 * Even columns (q % 2 === 0):
 *   NW: (q-1, r-1)    N: (q, r-1)     NE: (q+1, r-1)
 *   SW: (q-1, r+1)    S: (q, r+1)     SE: (q+1, r+1)
 * 
 * Key points:
 * 1. The N and S neighbors are always (q, r-1) and (q, r+1) regardless of column
 * 2. Diagonal neighbors (NW, NE, SW, SE) need to be adjusted based on column parity
 * 3. For odd columns, diagonal neighbors are shifted up by 1 in the r coordinate
 * 4. The getHexPosition function handles this offset in the visual layout
 */

// Perlin noise implementation
function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t, a, b) {
    return a + t * (b - a);
}

function grad(hash, x, y) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlinNoise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const A = p[X] + Y;
    const AA = p[A];
    const AB = p[A + 1];
    const B = p[X + 1] + Y;
    const BA = p[B];
    const BB = p[B + 1];

    return lerp(v, lerp(u, grad(p[AA], x, y), grad(p[BA], x - 1, y)),
        lerp(u, grad(p[AB], x, y - 1), grad(p[BB], x - 1, y - 1)));
}

// Permutation table
const p = new Array(512);
const permutation = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142,
    8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117,
    35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41,
    55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89,
    18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226,
    250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182,
    189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43,
    172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97,
    228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138,
    236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
for (let i = 0; i < 256; i++) {
    p[256 + i] = p[i] = permutation[i];
}

function noise(x, y) {
    return perlinNoise(x, y);
}

function getHexIntersects(raycaster) {
    return GridSystem.getHexIntersects(raycaster);
}

function getMinimapWorldPosition(event, minimapOverlay) {
    const rect = minimapOverlay.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / MAP_CONFIG.MINIMAP.WIDTH;
    const clickY = (event.clientY - rect.top) / MAP_CONFIG.MINIMAP.HEIGHT;
    if (clickX >= 0 && clickX <= 1 && clickY >= 0 && clickY <= 1) {
        const mapWidth = MAP_CONFIG.COLS * MAP_CONFIG.HEX_RADIUS * 1.5;
        const mapHeight = MAP_CONFIG.ROWS * MAP_CONFIG.HEX_RADIUS * Math.sqrt(3);
        return {
            x: clickX * mapWidth,
            z: clickY * mapHeight
        };
    }
    return null;
}

function updateCameraLookAt(camera, worldPos, matrices) {
    const worldLookDirection = getLookDirection(cameraHeight).clone().applyMatrix4(matrices.localToWorldMatrix);
    camera.lookAt(worldPos.clone().add(worldLookDirection.multiplyScalar(10)));
}

// Camera controls
function updateCamera() {
    camera.position.x = cameraTarget.x;
    camera.position.y = cameraTarget.y;
    camera.position.z = cameraTarget.z;
    camera.lookAt(scene.position);
}

function moveCamera(direction) {
    const speed = 0.1;
    switch (direction) {
        case 'up':
            cameraTarget.y += speed;
            break;
        case 'down':
            cameraTarget.y -= speed;
            break;
        case 'left':
            cameraTarget.x -= speed;
            break;
        case 'right':
            cameraTarget.x += speed;
            break;
    }
    updateCamera();
}

// Hash function for deterministic vertex offsets
function hash(seed) {
    let h = seed;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = (h >> 16) ^ h;
    return h;
}

// Get vertex offset for terrain smoothing
function getVertexOffset(seed) {
    const hashValue = hash(seed);
    return ((hashValue & 0xFF) / 255.0 - 0.5) * 0.0; // ±0.1 units
}

// Get vertex offsets for terrain smoothing
function getVertexOffsets(seed) {
    const hashValue = hash(seed);
    return {
        x: getVertexOffset(hashValue),
        z: getVertexOffset(hashValue >> 8)
    };
}

function addColorVariation(color, variation = 0.05) {
    const baseColor = new THREE.Color(color);
    baseColor.r += (Math.random() - 0.5) * variation;
    baseColor.g += (Math.random() - 0.5) * variation;
    baseColor.b += (Math.random() - 0.5) * variation;
    return baseColor;
}

// Export functions
window.noise = noise;
window.updateCamera = updateCamera;
window.moveCamera = moveCamera;
window.getHexIntersects = getHexIntersects;

console.log('utils.js loaded');