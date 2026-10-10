// Each object occupies one of a dungeon tile's nine combat cells.
export const OBJECT_DEFINITIONS = Object.freeze(Object.fromEntries(Object.entries({
  chest: { name: 'Oak treasure chest', blocksSight: false },
  chair: { name: 'Carved chair', blocksSight: false },
  table: { name: 'Tavern table', blocksSight: false },
  pottedPlant: { name: 'Potted fern', blocksSight: false },
  lamp: { name: 'Standing lantern', blocksSight: false, light: Object.freeze({ color: '#ffbd66', intensity: 0.12, range: 0.85 }) },
  barrel: { name: 'Iron-bound barrel', blocksSight: false },
  statue: { name: 'Knight sculpture', blocksSight: true },
  crate: { name: 'Shipping crate', blocksSight: false },
  bookshelf: { name: 'Bookcase', blocksSight: true },
  brazier: { name: 'Ember brazier', blocksSight: false, light: Object.freeze({ color: '#ff772e', intensity: 0.16, range: 0.85 }) },
  bench: { name: 'Wooden bench', blocksSight: false },
  urn: { name: 'Glazed urn', blocksSight: false },
}).map(([kind, definition]) => [kind, Object.freeze(definition)])));
