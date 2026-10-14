# Bardstale: Phlan voxel RPG

The game interprets the original 1988 Pool of Radiance as a browser voxel adventure. Its authored city and connected areas, four classes, multi-class creation, AD&D combat, and spell preparation sit inside the established bitmap interface. Source references and deliberate adaptations are recorded in `docs/pool-of-radiance-reference.md`.

## World and services

A party begins at New Phlan’s harbor. The safe city contains temples of Tyr, Sune and Tempus, four class trainers, shops, an inn, tavern, council, and dueling hall. The Slums connect to Kuto’s Well; the harbor reaches Sokal Keep and the Moonsea wilderness. Council commissions track expedition victories and pay a single reward. Completing Sokal Keep unlocks both wilderness routes. A total defeat restores the party inside Tyr’s temple, preserving equipment, inventory, gold, experience, and area discoveries. Practice combat restores pre-practice vitals and grants no rewards.

`src/worldAreas.js` owns authored topology, buildings, objects, services, encounter policies, harbor terrain, and exits. `src/worldTravel.js` creates journey-owned map state and resolves arrivals and temple return. `src/dungeon.js` owns directions and reciprocal wall access; `src/environments.js` owns rendering biomes. Maps are our voxel interpretations of the original locations.

## Characters, equipment and magic

`src/rules/classes.js` defines class progression and ability modifiers; `characters.js` owns race eligibility, rolling, validation, multi-class options and creation outfits. `dice.js` owns dice rolls, descending AC attacks, and saving throws. `spells.js` describes the original spell catalog. `src/data/poolMonsters.js` stores factual DOS monster records with provenance; encounters select a curated roster with corresponding voxel models.

`createGameSystems({hud, combatView, dungeon, onPartyDefeated, characters, onDungeonChanged})` owns private party and combat state. Its public API supplies inventory snapshots and atomic mutations, services, preparation and camp commands, quest/travel checks, movement completion and combat selection. `characters` supplies an optional custom roster; `onPartyDefeated` awaits the world’s temple transition while input stays locked. `onDungeonChanged` rebuilds geometry after exploration magic changes the area.

Fighters, Clerics, Magic-users and Thieves use six ability scores. Multi-class characters split experience and train their classes separately. Attacks use THAC0 and d20 rolls; weapons use damage dice, including a separate large-target expression. Armor controls descending AC and movement; equipment eligibility follows class. Spellcasters choose a preparation plan and consume memorized charges when casting. Safe rest restores those charges. The inn and camp provide preparation and adventure spell controls.

`src/items.js` defines equipment, thirteen wearable slots, ammunition, healing potions and voxel part selections. `src/systems/inventory.js` owns class restrictions, hand capacity, encumbrance, strongest-ring protection, ammo, healing and combat stats. Extra clothing customizes visible parts; body armor supplies its protection. Equipped gear and its effects appear identically in inventory, portraits and battle. `src/render/characterCreationPanel.js` edits a draft party of one to six characters; starting an adventure stores that roster for subsequent fresh runs in the browser session. Cancel preserves the current adventure. Progress itself is held in memory; there is no adventure save/load.

## Exploration and combat

Each room tile contains three combat cells per side. Furniture, walls and living figures constrain movement and line of sight. Larger bodies reserve their complete footprints, including 2×2 dragons, ogres and trolls. Combat stays on the exploration map; it changes camera and visible layers rather than rebuilding another world.

Heroes can act in any order. Green overlays show reachable cells; red overlays show enemies reachable with the selected hero’s remaining movement and weapon range. Clicking an enemy walks a legal path into range before striking. Spells use target indicators and wait for their visual effect before resolving. Input stays locked during movement and action effects; camera controls remain available. Defeat frees occupied cells. Leaving combat clears tactical effects and restores exploration.

## Rendering and interface

`scene.js` owns Three.js lifecycle, camera, lighting and combat cutaway. `voxelWorld.js` batches terrain and buildings; `voxelEnvironment.js` batches objects. Landscape, masonry and building catalogs provide real thickness and relief; harbor cells render water, wooden piers and low quay walls. `voxelGeometryCache.js` shares prepared surface buffers and releases GPU resources after the last owner leaves. Sparse surface merging preserves RGB paint and material boundaries.

`voxelParts.js` defines unrestricted assets and anatomical recipes. The humanoid body is sculpted coherently and split into torso, arms and legs. Character, equipment and creature catalogs supply geometry; `combatVoxelCatalog.js` resolves equipped models. Shoulder and hip rigs keep held items and effects attached during rigid walking and strikes. Custom monsters use normal voxel density with larger authored bodies. `voxelFigure.js` renders the merged parts; `combatVoxelActors.js` places, animates and disposes them.

Equipment flames, crystal orbits, mist and glow follow their actual item geometry. Scene effects animate spell impacts, healing, protective auras, blood and projectiles. Shared material shaders provide surface response without limiting RGB colors. Game views render at display resolution with antialiasing. Exploration uses dim ambient fill and local lights; combat adds sufficient fill to keep figures visible.

`hud.js`, `tiles.js` and `minimap.js` supply bitmap text, patterned borders, accessible commands, party inspection and city service legends. The inventory and creation panels use the same live voxel preview as the HUD. No separate HTML travel panel is placed above the game. The base HUD requires 640px width; the creation and inventory overlays adapt to available space.

## Running and verification

Serve the VibeGames root, for example `python3 -m http.server 4188 --directory ..`, and open `/bardstale/`. The optional `area` parameter selects `new-phlan`, `slums`, `sokal-keep`, `kutos-well` or `moonsea-wilderness`. Reloading starts a fresh journey, using the last custom roster created in the current browser session when present.

Arrow keys move and turn; Enter uses a service or travel exit. M opens the map. I opens inventory, R opens camp, N creates a new party. Escape closes a panel or service. The HUD displays numbered commands with Page Up/Down paging and D for character detail pages. Combat uses pointer selection, draggable pan, right/Shift drag rotation, wheel zoom, Q/E rotation, plus/minus zoom and Home reset.

Run `npm test`, `npm run check` and `git diff --check`. Verify character creation, service transactions, preparation, travel, combat and temple return in the browser, check console errors, and capture screenshots after interactive changes.
