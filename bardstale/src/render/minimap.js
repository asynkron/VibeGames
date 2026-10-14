import { DIR, WALL, getWall } from '../dungeon.js';
import { UI_SETTINGS } from '../../config/uiSettings.js';
import { createTilePainter } from './tiles.js';

const HEADING_PIXELS = Object.freeze({
  [DIR.N]: ['00100', '01110', '11111', '00100', '00100'],
  [DIR.E]: ['00100', '00010', '11111', '00010', '00100'],
  [DIR.S]: ['00100', '00100', '11111', '01110', '00100'],
  [DIR.W]: ['00100', '01000', '11111', '01000', '00100'],
});

const HEADING_NAMES = Object.freeze({
  [DIR.N]: 'NORTH',
  [DIR.E]: 'EAST',
  [DIR.S]: 'SOUTH',
  [DIR.W]: 'WEST',
});

export function createMinimapOverlay(screenElement, state) {
  const { resolution, tileSize, columns, rows, colors } = UI_SETTINGS;
  const mapColumns = columns - 6;
  const mapRows = rows - 10;
  let mapScale = 1;
  let mapCellSize = tileSize;
  const overlay = document.createElement('div');
  overlay.className = 'minimap-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.inert = true;

  const canvas = document.createElement('canvas');
  canvas.width = resolution.width;
  canvas.height = resolution.height;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.imageRendering = 'pixelated';
  canvas.setAttribute('role', 'img');
  overlay.appendChild(canvas);
  screenElement.appendChild(overlay);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const painter = createTilePainter(ctx);

  function drawEdge(px, py, direction, wall) {
    ctx.fillStyle = wall === WALL.WALL ? colors.red : wall === WALL.DOOR ? colors.yellow : colors.cyan;
    const offset = wall === WALL.WALL ? 0 : 2;
    const length = wall === WALL.WALL ? mapCellSize : mapCellSize - 4;
    if (direction === DIR.N) ctx.fillRect(px + offset, py, length, 1);
    else if (direction === DIR.S) ctx.fillRect(px + offset, py + mapCellSize - 1, length, 1);
    else if (direction === DIR.E) ctx.fillRect(px + mapCellSize - 1, py + offset, 1, length);
    else ctx.fillRect(px, py + offset, 1, length);
  }

  function drawHeading(px, py) {
    ctx.fillStyle = colors.background;
    const offset = Math.floor((mapCellSize - 5 * mapScale) / 2);
    ctx.fillRect(px + offset, py + offset, 5 * mapScale, 5 * mapScale);
    ctx.fillStyle = colors.green;
    for (const [row, pixels] of HEADING_PIXELS[state.dir].entries()) {
      for (let column = 0; column < pixels.length; column += 1) {
        if (pixels[column] === '1') ctx.fillRect(px + offset + column * mapScale, py + offset + row * mapScale, mapScale, mapScale);
      }
    }
  }

  function draw() {
    mapScale = Math.max(1, Math.floor(Math.min(mapColumns / state.width, mapRows / state.height)));
    mapCellSize = tileSize * mapScale;
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, resolution.width, resolution.height);
    painter.frame(0, 0, columns, rows);
    painter.text(`MAP ${state.name.toUpperCase()} - ${state.encounters ? "BEGINNER AREA" : "SAFE CITY"}`, 3, 2, colors.yellow, mapColumns);

    const visibleColumns = Math.min(state.width, Math.floor(mapColumns / mapScale));
    const visibleRows = Math.min(state.height, Math.floor(mapRows / mapScale));
    const firstX = Math.max(0, Math.min(state.width - visibleColumns, state.x - Math.floor(visibleColumns / 2)));
    const firstY = Math.max(0, Math.min(state.height - visibleRows, state.y - Math.floor(visibleRows / 2)));
    const mapLeft = 3 * tileSize + Math.floor((mapColumns * tileSize - visibleColumns * mapCellSize) / 2);
    const mapTop = 5 * tileSize;

    for (let row = 0; row < visibleRows; row += 1) {
      for (let column = 0; column < visibleColumns; column += 1) {
        const x = firstX + column;
        const y = firstY + row;
        if (!state.cells[y][x].visited) continue;
        const px = mapLeft + column * mapCellSize;
        const py = mapTop + row * mapCellSize;
        ctx.fillStyle = state.cells[y][x].terrain === 'water' ? '#346d91' : state.cells[y][x].terrain === 'dock' ? '#ba9761' : colors.cyan;
        ctx.fillRect(px + 1, py + 1, mapCellSize - 2, mapCellSize - 2);
        for (const direction of [DIR.N, DIR.E, DIR.S, DIR.W]) {
          drawEdge(px, py, direction, getWall(state.cells, state.width, state.height, x, y, direction));
        }
      }
    }

    for (const exit of state.exits) {
      if (exit.x < firstX || exit.y < firstY || exit.x >= firstX + visibleColumns || exit.y >= firstY + visibleRows) continue;
      const px = mapLeft + (exit.x - firstX) * mapCellSize;
      const py = mapTop + (exit.y - firstY) * mapCellSize;
      ctx.fillStyle = colors.yellow;
      ctx.fillRect(px + 2, py + 2, mapCellSize - 4, mapCellSize - 4);
    }
    const exits = state.exits.map(exit => `${exit.name} ${exit.x+1},${exit.y+1}`).join(' / ');
    const exitText=`EXITS: ${exits.toUpperCase()}`;
    painter.text(exitText.slice(0,mapColumns), 3, 3, colors.yellow, mapColumns);
    if (exitText.length>mapColumns) painter.text(exitText.slice(mapColumns),3,4,colors.yellow,mapColumns);

    state.services.forEach((service, index) => {
      if (service.x < firstX || service.y < firstY || service.x >= firstX + visibleColumns || service.y >= firstY + visibleRows) return;
      const px = mapLeft + (service.x - firstX) * mapCellSize;
      const py = mapTop + (service.y - firstY) * mapCellSize;
      ctx.fillStyle = service.type === 'temple' ? colors.yellow : colors.text;
      ctx.fillRect(px + 2, py + 2, mapCellSize - 4, mapCellSize - 4);
      ctx.save();
      const label=String(index+1);
      ctx.translate(px+Math.floor((mapCellSize-tileSize*label.length)/2),py+Math.floor((mapCellSize-tileSize)/2));
      painter.text(label, 0, 0, colors.background, label.length);
      ctx.restore();
      painter.text(`${index + 1} ${service.name}`, 3 + (index % 3) * 25, 38 + Math.floor(index / 3), colors.text, 24);
    });
    drawHeading(mapLeft + (state.x - firstX) * mapCellSize, mapTop + (state.y - firstY) * mapCellSize);
    painter.text('PASSAGE', 3, rows - 4, colors.cyan, 9);
    painter.text('DOOR', 15, rows - 4, colors.yellow, 6);
    painter.text('WALL', 24, rows - 4, colors.red, 6);
    painter.text('PARTY', 33, rows - 4, colors.green, 7);
    const position = `POSITION ${state.x + 1},${state.y + 1}  ${HEADING_NAMES[state.dir]}  MAP ${state.width}X${state.height}`;
    const view = visibleColumns < state.width || visibleRows < state.height
      ? `  VIEW ${firstX + 1}-${firstX + visibleColumns},${firstY + 1}-${firstY + visibleRows}`
      : '';
    painter.text(position + view, 3, rows - 3, colors.text, mapColumns);
    painter.text('M / ESC / CLICK TO CLOSE', 3, rows - 2, colors.yellow, mapColumns);
    const services = state.services.map(service => `${service.name} at ${service.x+1}, ${service.y+1}`).join('; ');
    canvas.setAttribute('aria-label', `Map of ${state.name}. Party at ${state.x + 1}, ${state.y + 1}, facing ${HEADING_NAMES[state.dir].toLowerCase()}. Known exits: ${exits}. City services: ${services || "none"}. Press M or Escape, or click, to close.`);
  }

  function show() {
    draw();
    overlay.inert = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-visible');
  }

  function hide() {
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
  }

  overlay.addEventListener('click', (event) => {
    event.preventDefault();
    hide();
  });

  return {
    hide,
    toggle() { if (overlay.classList.contains('is-visible')) hide(); else show(); },
    isVisible() { return overlay.classList.contains('is-visible'); },
  };
}
