# Ultima II Tribute

A lightweight browser homage to the world exploration of **Ultima II**. Navigate Moon Isle on a CRT-inspired canvas, trade words with
NPCs, and rebuild the sanctum through branching quests.

## Play

Open `index.html` in a browser or serve the folder locally:

```bash
npx serve ultima2
```

## Features

- Tile-based overworld rendered with monochrome-inspired colors per terrain type.
- NPC dialogue state machine with branching responses and personal backstories.
- Quest engine that tracks progress, completion, and rewards.
- Monsters roam the ruins, engage in simple combat, and drop lootable items.
- Inventory tracking for herbs, artifacts, and rewards with passive bonuses.

## Controls

- **Arrow keys / WASD** – Move across the map (turn-based).
- **T** or **Enter** – Talk to an adjacent NPC.
- **Space** – Wait a turn to let the world react.
- **Esc** – Close any active conversation.

## Development Notes

- Game state is contained in `script.js`. Entities and quests are declared as data objects to keep content authoring approachable.
- Dialogue states return transitions, enabling future expansions by adding more nodes to the same structure.
- Loot tables use simple arrays, but the drop logic can be expanded with weights or scripted events if needed.
