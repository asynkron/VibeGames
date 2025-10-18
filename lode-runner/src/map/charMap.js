export function charMap(ch) {
  switch (ch) {
    case 'X': return 'brick';
    case '=': return 'solid';
    case 'L': return 'ladder';
    case '-': return 'rope';
    case 'G': return 'gold';
    case 'P': return 'player';
    case 'E': return 'enemy';
    default: return 'empty';
  }
}
