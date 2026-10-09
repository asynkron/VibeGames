import { UI_SETTINGS } from '../../config/uiSettings.js';
import { createTilePainter, wrapText } from './tiles.js';

const ACTION_ROWS = 8;
const DETAIL_ROWS = 12;
const DETAIL_COLUMNS = 29;
const ROSTER_FIRST_ROW = 5;
const ROSTER_ROW_STRIDE = 2;

export function createHudRenderer(canvas, { onViewportClick, onCombatCellClick }) {
  const { resolution, colors, layout, combatLayout, tileSize, columns, rows } = UI_SETTINGS;
  canvas.width = resolution.width;
  canvas.height = resolution.height;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = false;
  const tiles = createTilePainter(ctx);
  const accessibility = document.getElementById('ui-accessibility');
  const portraits = new Map();
  const state = {
    log: [],
    party: [],
    gold: 0,
    location: null,
    inspectedCharacterId: '',
    active: null,
    prompt: '',
    buttons: [],
    actionPage: 0,
    detailPage: 0,
    combat: null,
  };
  let zones = [];
  let visibleCommands = [];
  let detailPageCount = 1;
  let framePending = false;

  function getPortraitImage(path) {
    if (!path) return null;
    let image = portraits.get(path);
    if (!image) {
      image = new Image();
      image.decoding = 'async';
      image.addEventListener('load', render, { once: true });
      image.addEventListener('error', render, { once: true });
      portraits.set(path, image);
      image.src = path;
    }
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null;
  }

  function drawContainedImage(image, column, row, widthInCells, heightInCells) {
    const width = widthInCells * tileSize;
    const height = heightInCells * tileSize;
    const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const imageWidth = Math.max(1, Math.round(image.naturalWidth * ratio));
    const imageHeight = Math.max(1, Math.round(image.naturalHeight * ratio));
    const x = column * tileSize + Math.floor((width - imageWidth) / 2);
    const y = row * tileSize + Math.floor((height - imageHeight) / 2);
    ctx.drawImage(image, x, y, imageWidth, imageHeight);
  }

  function addZone(column, row, widthInCells, heightInCells, onSelect) {
    zones.push({
      x: column * tileSize,
      y: row * tileSize,
      width: widthInCells * tileSize,
      height: heightInCells * tileSize,
      onSelect,
    });
  }

  function drawRightAligned(value, column, row, width, color = colors.green) {
    const text = String(value);
    tiles.text(text, column + Math.max(0, width - text.length), row, color, width);
  }

  function inspectedMember() {
    const id = state.active?.id || state.inspectedCharacterId;
    return state.party.find((member) => member.id === id);
  }

  function inspectMember(member) {
    if (state.combat || state.buttons.length) return;
    state.inspectedCharacterId = member.id;
    state.detailPage = 0;
    render();
  }

  function characterDetailLines(member) {
    if (!member && !state.active) return [];
    const active = state.active;
    const paragraphs = [active?.heading || active?.name || (member ? `${member.name} - ${member.classType}` : '')];
    if (member) {
      paragraphs.push(
        `LEVEL ${member.level}  AC ${member.ac}`,
        `HP ${member.hpCurrent}/${member.hpMax}  SP ${member.spCurrent}/${member.spMax}`,
        `TO HIT ${member.toHit}  DAMAGE ${member.damageMin}-${member.damageMax}`,
      );
      const attributes = member.attributes || {};
      const attributeLabels = [
        ['STR', 'strength'], ['INT', 'intelligence'], ['DEX', 'dexterity'],
        ['CON', 'constitution'], ['LCK', 'luck'],
      ];
      const attributeText = attributeLabels
        .filter(([, key]) => attributes[key] !== undefined)
        .map(([label, key]) => `${label} ${attributes[key]}`);
      if (attributeText.length) paragraphs.push(attributeText.join('  '));
      if (!member.alive) paragraphs.push('DEAD');
      else if (member.statusText) paragraphs.push(member.statusText);
    }
    if (active?.details) paragraphs.push(active.details);
    return paragraphs.flatMap((paragraph) => wrapText(paragraph, DETAIL_COLUMNS));
  }

  function drawRoster() {
    for (const [label, column] of [['NAME', 35], ['CLASS', 48], ['LV', 62], ['AC', 66], ['HP', 71]]) {
      tiles.text(label, column, 3, colors.text);
    }
    const selected = inspectedMember();
    state.party.forEach((member, index) => {
      const row = ROSTER_FIRST_ROW + index * ROSTER_ROW_STRIDE;
      if (row + 1 >= 17) return;
      if (member.id === selected?.id) tiles.text('>', 34, row, colors.yellow);
      tiles.text(member.name, 35, row, member.alive ? colors.cyan : colors.red, 12);
      tiles.text(member.classType, 48, row, colors.text, 12);
      drawRightAligned(member.level, 62, row, 2);
      drawRightAligned(member.ac, 66, row, 3);
      const hpColor = !member.alive ? colors.red : member.hpCurrent * 2 <= member.hpMax ? colors.yellow : colors.green;
      drawRightAligned(`${member.hpCurrent}/${member.hpMax}`, 71, row, 7, hpColor);
      tiles.text(member.alive ? member.statusText || '' : 'DEAD', 35, row + 1, member.alive ? colors.yellow : colors.red, 12);
      tiles.text(`SP ${member.spCurrent}/${member.spMax}`, 48, row + 1, colors.green, 12);
      if (!state.combat && !state.buttons.length) addZone(34, row, 44, 2, () => inspectMember(member));
    });
  }

  function nextDetailPage() {
    if (detailPageCount <= 1) return;
    state.detailPage = (state.detailPage + 1) % detailPageCount;
    render();
  }

  function drawCharacter() {
    const member = inspectedMember();
    if (!member && !state.active) return;
    tiles.frame(34, 17, 14, 14);
    const portrait = getPortraitImage(state.active?.portrait || member?.portrait);
    if (portrait) drawContainedImage(portrait, 35, 18, 12, 12);
    const lines = characterDetailLines(member);
    detailPageCount = Math.max(1, Math.ceil(lines.length / DETAIL_ROWS));
    state.detailPage = Math.min(state.detailPage, detailPageCount - 1);
    lines.slice(state.detailPage * DETAIL_ROWS, (state.detailPage + 1) * DETAIL_ROWS).forEach((line, index) => {
      tiles.text(line, 49, 18 + index, index === 0 && state.detailPage === 0 ? colors.cyan : colors.green, DETAIL_COLUMNS);
    });
    if (detailPageCount > 1) {
      tiles.text(`[D] MORE ${state.detailPage + 1}/${detailPageCount}`, 49, 30, colors.yellow, DETAIL_COLUMNS);
      addZone(49, 30, DETAIL_COLUMNS, 1, nextDetailPage);
    }
  }

  function numberedButtons() {
    return state.buttons.filter((button) => button.role !== 'back');
  }

  function backButton() {
    return state.buttons.find((button) => button.role === 'back');
  }

  function actionPageCount() {
    return Math.max(1, Math.ceil(numberedButtons().length / ACTION_ROWS));
  }

  function changeActionPage(delta) {
    const page = Math.max(0, Math.min(actionPageCount() - 1, state.actionPage + delta));
    if (page === state.actionPage) return;
    state.actionPage = page;
    render();
  }

  function drawMessagesAndActions() {
    const contentRow = layout.dividerRow + 2;
    if (!state.buttons.length) {
      const lines = state.log.flatMap((message) => wrapText(message, 76));
      const messageRows = rows - 1 - contentRow;
      lines.slice(-messageRows).forEach((line, index) => tiles.text(line, 2, contentRow + index, colors.green, 76));
      visibleCommands = [];
      return;
    }
    const promptLines = wrapText(state.prompt, 76);
    promptLines.slice(0, 2).forEach((line, index) => tiles.text(line, 2, contentRow + index, colors.green, 76));
    const options = numberedButtons();
    visibleCommands = options.slice(state.actionPage * ACTION_ROWS, (state.actionPage + 1) * ACTION_ROWS);
    visibleCommands.forEach((button, index) => {
      tiles.text(`[${index + 1}] ${button.label}`, 2, contentRow + 2 + index, colors.text, 76);
      addZone(2, contentRow + 2 + index, 76, 1, button.onSelect);
    });
    const back = backButton();
    if (back) {
      tiles.text('[0] BACK', 2, 48, colors.yellow);
      addZone(2, 48, 8, 1, back.onSelect);
    }
    const pages = actionPageCount();
    if (pages > 1) {
      tiles.text(`PAGE ${state.actionPage + 1}/${pages}`, 35, 48, colors.green, 14);
      if (state.actionPage > 0) {
        tiles.text('[PGUP] PREV', 51, 48, colors.yellow);
        addZone(51, 48, 11, 1, () => changeActionPage(-1));
      }
      if (state.actionPage < pages - 1) {
        tiles.text('[PGDN] NEXT', 66, 48, colors.yellow);
        addZone(66, 48, 12, 1, () => changeActionPage(1));
      }
    }
  }

  function activeCombatUnit() {
    return state.combat.units.find((unit) => unit.id === state.combat.activeId);
  }

  function drawCombatStatus() {
    const unit = activeCombatUnit();
    if (!unit) {
      tiles.text(`ROUND ${state.combat.round}`, 48, 2, colors.green, 30);
      return;
    }
    tiles.text(unit.name, 48, 2, colors.cyan, 30);
    tiles.text(unit.kind.replace(/_/g, ' '), 48, 3, colors.green, 30);
    tiles.text('HP', 48, 5, colors.green);
    tiles.text(`${unit.hpCurrent}/${unit.hpMax}`, 51, 5, colors.text, 27);
    if (unit.spMax > 0) {
      tiles.text('SP', 48, 6, colors.green);
      tiles.text(`${unit.spCurrent}/${unit.spMax}`, 51, 6, colors.text, 27);
    }
    tiles.text('AC', 48, 7, colors.green);
    tiles.text(unit.ac, 51, 7, colors.text, 27);
    tiles.text('WEAPON', 48, 9, colors.green);
    tiles.text(unit.weapon, 48, 10, colors.text, 30);
  }

  function drawCombatMessagesAndActions() {
    const lines = state.log.flatMap((message) => wrapText(message, 30));
    const logRows = state.buttons.length ? 20 : 35;
    lines.slice(-logRows).forEach((line, index) => tiles.text(line, 48, 12 + index, colors.green, 30));
    visibleCommands = [];
    if (!state.buttons.length) return;
    wrapText(state.prompt, 30).slice(0, 3).forEach((line, index) => tiles.text(line, 48, 33 + index, colors.green, 30));
    visibleCommands = numberedButtons().slice(state.actionPage * ACTION_ROWS, (state.actionPage + 1) * ACTION_ROWS);
    visibleCommands.forEach((button, index) => {
      tiles.text(`[${index + 1}] ${button.label}`, 48, 36 + index, colors.text, 30);
      addZone(48, 36 + index, 30, 1, button.onSelect);
    });
    const back = backButton();
    if (back) {
      tiles.text('[0] BACK', 48, 45, colors.yellow);
      addZone(48, 45, 8, 1, back.onSelect);
    }
    const pages = actionPageCount();
    if (pages > 1) {
      tiles.text(`PAGE ${state.actionPage + 1}/${pages}`, 64, 45, colors.green, 14);
      if (state.actionPage > 0) {
        tiles.text('[PGUP] PREV', 48, 47, colors.yellow);
        addZone(48, 47, 11, 1, () => changeActionPage(-1));
      }
      if (state.actionPage < pages - 1) {
        tiles.text('[PGDN] NEXT', 65, 47, colors.yellow);
        addZone(65, 47, 12, 1, () => changeActionPage(1));
      }
    }
  }

  function appendAccessibleButton(container, label, onSelect) {
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;
    button.textContent = label;
    button.addEventListener('click', onSelect);
    container.append(button);
  }

  function syncAccessibility() {
    if (!accessibility) return;
    const fragment = document.createDocumentFragment();
    const status = document.createElement('p');
    const phase = state.combat ? `Combat round ${state.combat.round}` : "Bard's Tale exploration";
    status.textContent = `${state.prompt || phase}. Gold ${state.gold}.`;
    fragment.append(status);
    if (state.combat) {
      const unit = activeCombatUnit();
      if (unit) {
        const actor = document.createElement('p');
        actor.textContent = `${unit.name}, ${unit.kind}, HP ${unit.hpCurrent}/${unit.hpMax}, AC ${unit.ac}, weapon ${unit.weapon}.`;
        fragment.append(actor);
      }
    }
    for (const member of state.party) {
      const label = `${member.name}, ${member.classType}, level ${member.level}, AC ${member.ac}, HP ${member.hpCurrent}/${member.hpMax}, SP ${member.spCurrent}/${member.spMax}${member.statusText ? `, ${member.statusText}` : ''}${member.alive ? '' : ', dead'}`;
      const combatUnit = state.combat?.units.find((unit) => unit.id === member.id);
      if (combatUnit?.canAct && !state.combat.busy) {
        appendAccessibleButton(fragment, `Select ${label}, movement ${combatUnit.movementRemaining}/4`, () => onCombatCellClick(combatUnit.x, combatUnit.y));
      } else if (state.combat || state.buttons.length) {
        const entry = document.createElement('p');
        entry.textContent = label;
        fragment.append(entry);
      } else appendAccessibleButton(fragment, `Inspect ${label}`, () => inspectMember(member));
    }
    if (state.combat && !state.combat.busy) {
      for (const cell of state.combat.reachable) {
        if (cell.cost > 0) appendAccessibleButton(fragment, `Move to combat cell ${cell.x}, ${cell.y}, ${cell.cost} steps`, () => onCombatCellClick(cell.x, cell.y));
      }
      for (const unit of state.combat.units) {
        if (!state.combat.targetIds.includes(unit.id)) continue;
        const action = state.combat.targetKind === 'attack' ? 'Attack' : 'Cast on';
        appendAccessibleButton(fragment, `${action} ${unit.name}, HP ${unit.hpCurrent}/${unit.hpMax}`, () => onCombatCellClick(unit.x, unit.y));
      }
    }
    const details = document.createElement('p');
    details.textContent = characterDetailLines(inspectedMember()).join(' ');
    fragment.append(details);
    visibleCommands.forEach((button, index) => appendAccessibleButton(fragment, `${index + 1}: ${button.label}`, button.onSelect));
    const back = backButton();
    if (back) appendAccessibleButton(fragment, '0: Back', back.onSelect);
    if (state.actionPage > 0) appendAccessibleButton(fragment, 'Previous command page', () => changeActionPage(-1));
    if (state.actionPage + 1 < actionPageCount()) appendAccessibleButton(fragment, 'Next command page', () => changeActionPage(1));
    const log = document.createElement('p');
    log.textContent = state.log.slice(state.combat ? -35 : -10).join(' ');
    fragment.append(log);
    accessibility.replaceChildren(fragment);
  }

  function render() {
    zones = [];
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => {
      framePending = false;
      paint();
    });
  }

  function paint() {
    ctx.clearRect(0, 0, resolution.width, resolution.height);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, resolution.width, resolution.height);
    zones = [];
    detailPageCount = 1;
    const viewport = (state.combat ? combatLayout : layout).viewport;
    ctx.clearRect(viewport.column * tileSize, viewport.row * tileSize, viewport.columns * tileSize, viewport.rows * tileSize);
    tiles.frame(0, 0, columns, rows);
    if (state.combat) {
      tiles.vertical(combatLayout.dividerColumn, 0, rows);
      tiles.corner(combatLayout.dividerColumn, 0);
      tiles.corner(combatLayout.dividerColumn, rows - 1);
      drawCombatStatus();
      drawCombatMessagesAndActions();
      syncAccessibility();
      return;
    }
    tiles.vertical(layout.dividerColumn, 0, layout.dividerRow + 1);
    tiles.horizontal(0, layout.dividerRow, columns);
    for (const [column, row] of [[layout.dividerColumn, 0], [0, layout.dividerRow], [layout.dividerColumn, layout.dividerRow], [columns - 1, layout.dividerRow]]) {
      tiles.corner(column, row);
    }
    drawRoster();
    drawCharacter();
    if (state.location) {
      const facing = ['N', 'E', 'S', 'W'][state.location.dir];
      tiles.text(`${state.location.x + 1},${state.location.y + 1} ${facing}   GOLD ${state.gold}`, 35, layout.dividerRow - 1, colors.green, 43);
    } else tiles.text(`GOLD ${state.gold}`, 35, layout.dividerRow - 1, colors.green, 43);
    drawMessagesAndActions();
    syncAccessibility();
  }

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) * resolution.width / rect.width;
    const y = (event.clientY - rect.top) * resolution.height / rect.height;
    const view = (state.combat ? combatLayout : layout).viewport;
    if (x >= view.column * tileSize && x < (view.column + view.columns) * tileSize
      && y >= view.row * tileSize && y < (view.row + view.rows) * tileSize) {
      onViewportClick(event);
      return;
    }
    const zone = zones.find((entry) => x >= entry.x && x < entry.x + entry.width && y >= entry.y && y < entry.y + entry.height);
    if (!zone) return;
    event.preventDefault();
    zone.onSelect();
  });

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.defaultPrevented) return;
    const key = event.key.toLowerCase();
    if (key === 'd' && detailPageCount > 1) {
      event.preventDefault();
      nextDetailPage();
      return;
    }
    if (!state.buttons.length) {
      if (state.combat) return;
      const member = state.party[Number(key) - 1];
      if (/^[1-5]$/.test(key) && member) {
        event.preventDefault();
        inspectMember(member);
      }
      return;
    }
    if (key === 'pageup' || key === 'pagedown') {
      event.preventDefault();
      changeActionPage(key === 'pageup' ? -1 : 1);
      return;
    }
    const button = key === '0' ? backButton() : /^[1-8]$/.test(key) ? numberedButtons()[state.actionPage * ACTION_ROWS + Number(key) - 1] : null;
    if (button) {
      event.preventDefault();
      button.onSelect();
    }
  });

  render();
  return {
    appendLog(message) {
      state.log.push(String(message));
      if (state.log.length > 64) state.log.splice(0, state.log.length - 64);
      render();
    },
    setParty(data) {
      state.party = Array.isArray(data?.members) ? data.members.slice() : [];
      state.gold = data?.gold ?? state.gold;
      if (!state.party.some((member) => member.id === state.inspectedCharacterId)) {
        state.inspectedCharacterId = state.party[0]?.id || '';
        state.detailPage = 0;
      }
      render();
    },
    setActions({ prompt = '', buttons = [], active = null, details = '' } = {}) {
      state.prompt = prompt;
      state.buttons = Array.isArray(buttons) ? buttons.slice() : [];
      state.active = active ? { ...active, details: active.details || details } : null;
      state.actionPage = 0;
      state.detailPage = 0;
      render();
    },
    clearActions() {
      state.prompt = '';
      state.buttons = [];
      state.active = null;
      state.actionPage = 0;
      state.detailPage = 0;
      render();
    },
    setLocation(location) {
      state.location = { x: location.x, y: location.y, dir: location.dir };
      render();
    },
    setCombatStatus(snapshot) {
      state.combat = snapshot;
      if (snapshot && state.party.some((member) => member.id === snapshot.activeId)) {
        state.inspectedCharacterId = snapshot.activeId;
      }
      render();
    },
  };
}
