# Bardstale prototype context

Purpose
- Old-school Bard's Tale III-inspired RPG prototype with real 3D navigation.
- This folder hosts the game client/prototype. Canonical runtime contracts live under packages/core/src/contracts.

Key files
- src/systems/core.ts: Minimal systems for party, character/inventory, random encounters, and turn-based combat.
- Uses contracts from packages/core/src/contracts: Character.ts, Item.ts, Monster.ts, Encounter.ts.

Known risks
- Systems are minimal and deterministic only for demo. Balance and full class/race/spell systems are simplified.
- No save/load plumbed yet. Inventory/equipment only partially applies to derived stats.

Next steps
- Extend itemization (weapons, armor, instruments) and spells; expand classes to match BT3 more closely.
- Hook systems into the 3D UI/loop and present combat UIs.
- Add persistence and shops.

## Gameplay systems (added)
- Party with Warrior and Bard, per-character inventories and basic equipment.
- Random encounters trigger after several tile steps (depth-scaled).
- Round-based, auto-resolving combat with AC/to-hit and damage rolls.
- Simple loot (gold, occasional potion). HUD overlay shows party/status and a scrolling combat log.

Note: Canonical contracts live in packages/core/src/contracts (TypeScript); the prototype uses plain JS for the browser.

## Change log ()
- Added BT3-like systems into main.js and HUD overlay; wired movement to encounter hook.
