import { ITEM_DB } from '../items.js';
import { COIN_TYPES, createCoins, formatCoins } from '../systems/money.js';
import { createTilePainter, wrapText } from './tiles.js';

const COLORS = { text: '#ffffff', cyan: '#55ffff', green: '#55ff55', yellow: '#ffff55', red: '#f46a64' };

function element(tag, className = '') {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function bitmap(node, text, color = COLORS.text, columns = 48) {
  const lines = wrapText(text, columns);
  const canvas = element('canvas', 'treasure-lettering');
  const width = Math.max(1, ...lines.map(line => line.length));
  canvas.width = width * 8;
  canvas.height = lines.length * 16 - 8;
  canvas.style.width = `${width}ch`;
  canvas.style.height = `${lines.length * 2 - 1}em`;
  canvas.setAttribute('aria-hidden', 'true');
  const painter = createTilePainter(canvas.getContext('2d'));
  lines.forEach((line, index) => painter.text(line, 0, index * 2, color));
  const accessible = element('span', 'treasure-readable');
  accessible.textContent = text;
  node.replaceChildren(canvas, accessible);
  return node;
}

function text(tag, content, color = COLORS.text, className = '', columns = 48) {
  return bitmap(element(tag, className), content, color, columns);
}

function button(label, action, key, className = '') {
  const node = text('button', label, COLORS.yellow, className);
  node.type = 'button';
  node.dataset.focusKey = key;
  node.addEventListener('click', action);
  return node;
}

function itemName(entry) {
  const item = ITEM_DB[entry.itemId];
  if (item.requiresReadMagic && !entry.identified) return 'Unread arcane scroll';
  return item.name;
}

/** Treasure remains on the ground until the player assigns it to a character. */
export function createTreasurePanel({ parent = document.body, systems, onView, onOpen = () => {}, onClose = () => {} }) {
  const screen = element('section', 'treasure-screen');
  screen.hidden = true;
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', 'treasure-title');
  const shell = element('div', 'treasure-shell');
  const border = element('canvas', 'treasure-border');
  border.setAttribute('aria-hidden', 'true');
  const body = element('div', 'treasure-body');
  const title = element('h1');
  title.id = 'treasure-title';
  const intro = text('p', 'Select a character, then TAKE treasure.', COLORS.green, 'treasure-intro');
  const party = element('nav', 'treasure-party');
  party.setAttribute('aria-label', 'Choose who takes treasure');
  const purse = element('section', 'treasure-purse');
  purse.setAttribute('aria-label', 'Selected character purse and carrying capacity');
  const workspace = element('div', 'treasure-workspace');
  const money = element('section', 'treasure-money');
  const items = element('section', 'treasure-items');
  workspace.append(money, items);
  const take = element('section', 'treasure-take');
  const commands = element('nav', 'treasure-commands');
  commands.setAttribute('aria-label', 'Treasure commands');
  const confirmation = element('section', 'treasure-confirmation');
  confirmation.hidden = true;
  const status = element('p', 'treasure-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  body.append(title, intro, party, purse, workspace, take, commands, confirmation, status);
  shell.append(border, body);
  screen.append(shell);
  parent.append(screen);

  let snapshot = null;
  let characterId;
  let selection = null;
  let mode = 'items';
  let quantity = 1;
  let coinType = 'gold';
  let coinAmount = 1;
  let opened = false;
  let suspended = false;
  let previousFocus;
  let message = '';
  let error = false;
  let confirming = false;

  function drawBorder() {
    const columns = Math.max(3, Math.floor(shell.clientWidth / 16));
    const rows = Math.max(3, Math.floor(shell.clientHeight / 16));
    border.width = columns * 8;
    border.height = rows * 8;
    createTilePainter(border.getContext('2d')).frame(0, 0, columns, rows);
  }
  const resize = new ResizeObserver(drawBorder);
  resize.observe(shell);

  function focus(key) {
    const node = [...screen.querySelectorAll('[data-focus-key]')].find(control => control.dataset.focusKey === key && !control.disabled);
    node?.focus({ preventScroll: true });
  }

  function mutate(action) {
    const result = action();
    message = result.message || (result.ok ? 'Treasure updated.' : 'Cannot take that treasure.');
    error = !result.ok;
    confirming = Boolean(result.needsConfirmation);
    refresh();
    if (confirming) focus('return');
  }

  function chooseHero(id) {
    characterId = id;
    message = '';
    refresh();
  }

  function showMode(next) {
    mode = next;
    confirming = false;
    refresh();
    focus(next === 'items' ? `item-${selection}` : 'coin-type');
  }

  function renderTake(hero) {
    take.replaceChildren();
    if (mode === 'items') {
      const entry = snapshot.items[selection];
      if (!entry) {
        take.append(text('p', snapshot.items.some(Boolean) ? 'Choose an item to TAKE.' : 'No items remain.', COLORS.green));
        return;
      }
      take.append(text('h3', `TAKE ${itemName(entry)} for ${hero.name}`, COLORS.cyan, '', 48));
      const row = element('form', 'treasure-amount-row');
      const label = text('label', 'Quantity', COLORS.green);
      const amount = element('input');
      amount.type = 'number'; amount.min = '1'; amount.max = String(entry.qty); amount.step = '1';
      amount.value = String(Math.max(1, Math.min(quantity, entry.qty)));
      amount.setAttribute('aria-label', 'Item quantity'); amount.dataset.focusKey = 'item-quantity';
      amount.addEventListener('input', () => { quantity = Number(amount.value); });
      label.append(amount);
      const takeItem = button('TAKE ITEM', () => mutate(() => systems.takeTreasureItem(characterId, selection, Number(amount.value))), 'take-item', 'treasure-primary');
      takeItem.disabled = !hero.alive;
      row.addEventListener('submit', event => { event.preventDefault(); if (!takeItem.disabled) takeItem.click(); });
      row.append(label, takeItem);
      take.append(row);
    } else {
      take.append(text('h3', `TAKE MONEY for ${hero.name}`, COLORS.cyan));
      const row = element('form', 'treasure-amount-row');
      const denomination = element('select');
      denomination.setAttribute('aria-label', 'Coin denomination'); denomination.dataset.focusKey = 'coin-type';
      for (const coin of COIN_TYPES) {
        const option = element('option');
        option.value = coin.id; option.textContent = `${coin.label} (${coin.abbreviation}) - ${snapshot.coins[coin.id]}`;
        denomination.append(option);
      }
      denomination.value = coinType;
      const label = text('label', 'Amount', COLORS.green);
      const amount = element('input');
      amount.type = 'number'; amount.min = '1'; amount.max = String(snapshot.coins[coinType]); amount.step = '1';
      amount.value = String(coinAmount); amount.setAttribute('aria-label', 'Coin amount'); amount.dataset.focusKey = 'coin-amount';
      amount.addEventListener('input', () => { coinAmount = Number(amount.value); });
      denomination.addEventListener('change', () => {
        coinType = denomination.value;
        coinAmount = Math.max(1, Math.min(coinAmount, snapshot.coins[coinType]));
        refresh();
      });
      label.append(amount);
      const takeMoney = button('TAKE MONEY', () => mutate(() => systems.takeTreasureCoins(characterId, denomination.value, Number(amount.value))), 'take-money', 'treasure-primary');
      takeMoney.disabled = !hero.alive || !snapshot.coins[coinType];
      row.addEventListener('submit', event => { event.preventDefault(); if (!takeMoney.disabled) takeMoney.click(); });
      row.append(denomination, label, takeMoney);
      take.append(row);
    }
  }

  function render() {
    const focusKey = screen.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
    const hero = snapshot.party.find(member => member.id === characterId) || snapshot.party.find(member => member.alive) || snapshot.party[0];
    characterId = hero.id;
    bitmap(title, snapshot.pendingLeave ? `${snapshot.title} - Leaving` : snapshot.title, COLORS.yellow);
    bitmap(intro, snapshot.source === 'service' ? 'POOL money to pay here. TAKE or SHARE what remains.' : 'Select a character, then TAKE treasure.', COLORS.green);
    party.replaceChildren(...snapshot.party.map((member, index) => {
      const node = button(`${index + 1} ${member.name}`, () => chooseHero(member.id), `hero-${member.id}`, 'treasure-party-member');
      node.setAttribute('aria-pressed', String(member.id === characterId));
      node.append(text('small', member.alive ? member.displayClass : `${member.displayClass} - DEAD`, member.alive ? COLORS.green : COLORS.red, '', 18));
      return node;
    }));
    purse.replaceChildren(
      text('h2', `${hero.name}'s purse`, COLORS.cyan),
      text('p', formatCoins(createCoins(hero.coins)), COLORS.green),
      text('p', `Carried ${hero.stats.carriedWeight}/${hero.stats.maxCarryWeight} coin weight    Movement ${hero.stats.movement}`, COLORS.green, '', 52),
    );
    money.replaceChildren(text('h2', snapshot.source === 'service' ? 'Money on counter' : 'Treasure money', COLORS.cyan));
    const coinList = element('dl', 'treasure-coins');
    COIN_TYPES.forEach(coin => {
      const pair = element('div');
      pair.append(text('dt', coin.label, COLORS.green), text('dd', `${snapshot.coins[coin.id]} ${coin.abbreviation}`, COLORS.text));
      coinList.append(pair);
    });
    money.append(coinList);
    items.hidden = snapshot.source === 'service';
    items.replaceChildren(text('h2', 'Treasure items', COLORS.cyan));
    const itemList = element('div', 'treasure-item-list');
    const hasItems = snapshot.items.some(Boolean);
    if (!snapshot.items[selection]) selection = hasItems ? snapshot.items.findIndex(Boolean) : null;
    if (!hasItems) itemList.append(text('p', 'No items remain.', COLORS.green));
    snapshot.items.forEach((entry, index) => {
      if (!entry) return;
      const node = button(`${itemName(entry)}${entry.qty > 1 ? ` x${entry.qty}` : ''}${entry.magicalVisible ? ' *MAGIC*' : ''}`, () => { selection = index; quantity = 1; mode = 'items'; refresh(); }, `item-${index}`, 'treasure-item');
      node.setAttribute('aria-pressed', String(index === selection));
      node.append(text('small', `Weight ${ITEM_DB[entry.itemId].weight} each`, COLORS.green));
      itemList.append(node);
    });
    items.append(itemList);
    if (snapshot.source === 'service') mode = 'money';
    renderTake(hero);
    const commandList = [
      ['[V] VIEW', () => onView(characterId), 'view'],
      ['[I] TAKE ITEMS', () => showMode('items'), 'items'],
      ['[M] TAKE MONEY', () => showMode('money'), 'money'],
      ['[P] POOL', () => mutate(() => systems.poolTreasureCoins()), 'pool'],
      ['[S] SHARE', () => mutate(() => systems.shareTreasureCoins()), 'share'],
      ['[D] DETECT', () => mutate(() => systems.detectTreasureMagic(characterId)), 'detect'],
      [snapshot.source === 'service' && !snapshot.pendingLeave ? '[ESC] RETURN TO SERVICE' : '[ESC] EXIT', () => mutate(() => systems.exitTreasure()), 'exit'],
    ];
    commands.replaceChildren(...commandList.map(([label, action, key]) => {
      const node = button(label, action, key);
      node.disabled = (key === 'items' && !hasItems) || (key === 'detect' && (!hasItems || snapshot.detected || !hero.alive));
      if (key === mode) node.setAttribute('aria-pressed', 'true');
      if (snapshot.source === 'service' && (key === 'items' || key === 'detect')) node.hidden = true;
      return node;
    }));
    confirmation.hidden = !confirming;
    confirmation.replaceChildren(
      text('h2', 'Leave treasure behind?', COLORS.yellow),
      text('p', 'The remaining money and items will be lost.', COLORS.green),
      button('Return to treasure', () => { confirming = false; message = ''; refresh(); focus('exit'); }, 'return'),
      button('Leave treasure behind', () => mutate(() => systems.exitTreasure(true)), 'discard', 'treasure-danger'),
    );
    workspace.inert = take.inert = commands.inert = party.inert = confirming;
    bitmap(status, message || 'SHARE divides money only. Items go to the character you choose.', error ? COLORS.red : COLORS.green);
    if (focusKey) focus(focusKey);
    drawBorder();
  }

  function refresh() {
    snapshot = systems.getTreasureSnapshot();
    if (!snapshot) {
      if (opened) {
        opened = false;
        screen.hidden = true;
        document.body.classList.remove('treasure-open');
        onClose();
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      }
      return;
    }
    if (!opened) {
      opened = true;
      previousFocus = document.activeElement;
      selection = null;
      message = '';
      confirming = false;
      mode = snapshot.source === 'service' ? 'money' : 'items';
      onOpen();
      screen.hidden = suspended;
      document.body.classList.add('treasure-open');
      render();
      if (!suspended) focus('view');
      return;
    }
    screen.hidden = suspended;
    render();
  }

  screen.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Tab') {
      const controls = [...screen.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')].filter(node => !node.closest('[inert]') && node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (confirming) { confirming = false; refresh(); focus('exit'); }
      else mutate(() => systems.exitTreasure());
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey || confirming || event.target.matches('input,select')) return;
    const key = event.key.toLowerCase();
    const member = snapshot.party[Number(key) - 1];
    if (/^[1-6]$/.test(key) && member) { event.preventDefault(); chooseHero(member.id); return; }
    const command = { v: 'view', i: 'items', m: 'money', p: 'pool', s: 'share', d: 'detect' }[key];
    const node = command && [...commands.children].find(control => control.dataset.focusKey === command);
    if (node && !node.disabled && !node.hidden) { event.preventDefault(); node.click(); }
  });
  screen.addEventListener('keyup', event => event.stopPropagation());
  const unsubscribe = systems.subscribeTreasure(refresh);
  refresh();
  return {
    isOpen: () => opened,
    setSuspended(value) {
      suspended = value;
      screen.hidden = !opened || suspended;
      if (opened && !suspended) { refresh(); focus('view'); }
    },
    dispose() {
      unsubscribe();
      resize.disconnect();
      document.body.classList.remove('treasure-open');
      screen.remove();
    },
  };
}
