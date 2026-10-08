# Bardstale prototype

Bardstale is a Bard's Tale III-inspired RPG with tile-based movement through a generated 3D dungeon, an 8×8 character-grid interface, and turn-based encounters. It runs directly in the browser as JavaScript modules.

## Runtime structure

- `index.html` loads `main.js`, which creates the dungeon, scene, HUD, minimap, and gameplay systems, then handles input and animation.
- `src/dungeon.js` owns dungeon generation, directions, and wall access.
- `src/render/scene.js` builds the Three.js scene and dungeon geometry, then switches between first-person exploration and an orthographic combat camera.
- `src/render/combatSprites.js` composes 24×24 pixel sprites from interchangeable 8×8 character tiles for party members and monsters.
- `sprite-workshop.html` previews the same character compositor with part and palette selectors, both facings, a tile grid, and native-size samples.
- `src/render/hud.js` renders the party, combat log, actions, and character portraits, and forwards viewport clicks to tactical selection.
- `src/render/tiles.js` draws the bitmap alphabet, woven red frame tiles, and gold corner tiles. Interface text uses these pixels rather than browser fonts.
- `src/render/minimap.js` renders the explored map and party position.
- `src/systems/core.js` owns class, spell, song, ability, item, and monster definitions, as well as party state, equipment, encounters, and combat.
- `src/systems/battlefield.js` owns combat positions, movement paths, occupancy, and wall-aware targeting on the exploration dungeon.
- `config/uiSettings.js` defines the 80×50 cell grid, colors, and viewport slot.
- `config/combatSettings.js` defines the three combat cells per side of each dungeon tile.

`initBt3Systems({ hud, combatView, dungeon })` receives the rendering services and the current dungeon directly. It returns `isCombatActive`, `onStepComplete(depth)`, `handleCombatKey(key)`, and `selectCombatCell(x, y)` for the input loop. Its combat state is private to the systems instance. Combat snapshots drive the scene and HUD; the renderer does not own gameplay rules.

## Current gameplay

The starting party contains Brynn the Warrior, Ser Ana the Paladin, Shade the Rogue, Lyre the Bard, and Quint the Chronomancer. Each character starts with equipment and an individual inventory.

Completed movement steps can trigger encounters according to dungeon depth. Each dungeon tile contains a 3×3 combat grid, with room for up to nine combatants. Encounters place the party and monsters on connected combat cells around the party's actual position. Each living hero can move up to four combat cells, then attack, cast a spell, sing, use an ability, retreat, or pass. Actions resolve immediately, followed by the next hero. Monsters then move up to three combat cells toward the party and act, with scrolling narration between turns. Equipment and temporary effects contribute to combat statistics. Victory awards gold and may add a healing potion.

Melee requires a neighboring combat cell across an open passage. Ranged magic requires line of sight through the dungeon walls and a range of six combat cells. Original dungeon walls block all three combat edges along their tile boundary; open passages and doors allow crossing. Living units cannot overlap or walk through each other. Combat movement leaves the exploration map and position unchanged. Combat ends by regrouping the party at the encounter position and restoring the first-person camera and ceiling.

The prototype keeps game state in memory. Save/load, shops, inventory management, and out-of-combat spell use are not implemented.

## Character interface

The interface uses a fixed 640×400 bitmap with 8×8 cells. The screen grows by whole integer multiples, with black space around it. Windows smaller than the native bitmap can scroll rather than compressing the glyphs or distorting the artwork.

Exploration fills the single left-hand frame in a square 256×256 slot backed by a 256×256 WebGL buffer. Its roster occupies the upper-right pane, with the selected character's portrait and statistics underneath. Combat switches to two full-height columns: a 360×384 battlefield on the left, with active-unit statistics, narration, and commands on the right. Its orthographic camera reuses the dungeon geometry, hides the roof, and renders walls taller than the authored 24×24 sprite billboards. Each original dungeon tile contains nine combat positions. Selected units, reachable movement cells, and targets have grid markers. Portraits and combat sprites use nearest-neighbor sampling. All frames, text, and click regions use cell coordinates. Control descriptions are available to assistive technology without taking space in the visual layout.

Outside combat, the lower pane shows narration or the current command menu. Combat keeps narration visible above its commands in the right column. Menus show up to eight numbered choices per page, with a separate Back command. Spell codes and SP costs appear before their names so the cost remains visible in the narrow column. Paging never removes a spell or target from the available choices. The map uses the same character grid and palette; large dungeons show a window around the party.

## Character appearance

The supplied references measure approximately 244 screen pixels per 24-pixel cell at a 10.16× enlargement, and 134–135 pixels per cell at about 5.6×. Their occupied silhouettes vary within that cell. The art uses small profile heads, bent arms, long legs, a wide stance, hard black contours, and a limited flat palette.

`createCombatSpriteCanvas({ kind, equipment, appearance, facing })` returns a 24×24 canvas. Each character occupies a 3×3 arrangement of 8×8 tiles. The appearance has `head`, `torso`, `arms`, `legs`, `weapon`, `shield`, and `palette` selections. `getCombatAppearance` resolves a preset and equipment into those selections; explicit appearance values override them. `COMBAT_APPEARANCE_OPTIONS` lists available choices, and `COMBAT_SPRITE_KINDS` lists presets. Facing accepts `left` or `right` and changes only the rendered appearance.

`src/render/combatSpriteTiles.js` holds the replaceable tile patches. Weapons can span a column, robes span the bottom row, and arm patches layer over the torso. The assembled pixels are mirrored together. Party equipment is included in battle snapshots; textures are refreshed when equipment or visual facing changes. Facing follows projected movement or a selected target without contributing to combat rules.

Open `sprite-workshop.html` on the same HTTP server to mix parts and compare their left/right silhouettes. Its 8× preview grid marks every eight source pixels, while the native-size samples show the exact 24×24 result. The workshop calls the game compositor directly and keeps its selections separate from gameplay state.

## Running and verification

Serve the VibeGames root over HTTP, for example with `python3 -m http.server 4173 --directory ..` from this folder, then open `http://localhost:4173/bardstale/`. Shared utility modules are loaded from the site and Three.js from its pinned CDN URL. Local art assets resolve relative to their owning modules. No external font service is needed.

Arrow keys move and turn while exploring; M opens the explored map, and M or Escape closes it. Click a roster row to inspect a character outside combat. Combat commands use the displayed 1–8 keys or canvas clicks; 0 selects Back. Choose Move, then walk with the arrow keys or click a reachable cell; Enter finishes movement. When targeting, click a highlighted creature or move the cursor with the arrow keys and press Enter. Page Up and Page Down turn command pages, and D turns character-detail pages. The URL accepts `seed`, `w`/`width`, and `h`/`height`; dungeon dimensions are limited to 8 through 128 cells.

Run `npm test` for dungeon generation, combat movement and actions, and modular sprite composition, and `npm run check` for module syntax. No package installation is needed. After interactive changes, exercise movement, map toggling, encounters, and command selection in the browser, then check the console and capture screenshots.
