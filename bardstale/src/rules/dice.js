export function rollDice(expression, random = Math.random) {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/.exec(expression);
  if (!match) throw new TypeError(`Invalid damage dice: ${expression}`);
  const [, count, sides, bonus] = match;
  let value = Number(bonus || 0);
  for (let die = 0; die < Number(count); die += 1) value += 1 + Math.floor(random() * Number(sides));
  return value;
}

export function attackRoll(thac0, armorClass, bonus = 0, random = Math.random) {
  const rolled = 1 + Math.floor(random() * 20);
  return { roll: rolled, success: rolled === 20 || (rolled !== 1 && rolled + bonus >= thac0 - armorClass) };
}

export function savingThrow(saves, type = 'spell', bonus = 0, random = Math.random) {
  const rolled = 1 + Math.floor(random() * 20);
  return rolled === 20 || (rolled !== 1 && rolled + bonus >= saves[type]);
}

export function diceBounds(expression) {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/.exec(expression);
  if (!match) throw new TypeError(`Invalid damage dice: ${expression}`);
  const [, count, sides, bonus] = match;
  return { min: Number(count) + Number(bonus || 0), max: Number(count) * Number(sides) + Number(bonus || 0) };
}
