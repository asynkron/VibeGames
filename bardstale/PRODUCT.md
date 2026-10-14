# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players exploring connected fantasy areas with a party of up to six characters, using a keyboard and pointer to manage characters, equipment, and turn-based combat.

## Product Purpose

Bardstale is a Pool of Radiance-inspired browser fantasy crawler with first-person exploration and tactical combat in the same 3D world. Players explore, fight monsters, and build party members from equipped items and reusable voxel body parts. Equipment must have the same identity in the inventory, character preview, combat statistics, and battlefield model.

## Operating Context

A party begins at the harbor in New Phlan. Its known city map locates shops, three temples, four class trainers, an inn, tavern, council, and dueling hall. Connected authored areas include the Slums, Sokal Keep, Kuto’s Well, and the Moonsea wilderness. Council commissions reward completed expeditions; securing Sokal Keep opens wider travel. These maps interpret the original campaign in voxels. Travel preserves characters, equipment, prepared spells, experience, gold, and discoveries. A total party defeat revives everyone inside the Temple of Tyr.

Players inspect characters through their live voxel portraits and manage equipped gear and carried items in inventory. Combat uses the same environment, characters, objects, and equipment as exploration.

## Capabilities and Constraints

- Character creation supports six races, the four original classes and permitted multi-class combinations, six ability scores, and alignment. The starting roster can be replaced with a custom party of one to six characters.
- Combat uses descending armor class, THAC0, weapon damage dice, class restrictions, saving throws, and memorized spells. Prepare a spell plan, then rest at the inn to replenish it.
- Each character owns a backpack and a purse with copper, silver, electrum, gold, and platinum coins. Battle and council treasure stays in a temporary pile until a selected character takes items or a specified coin amount. SHARE divides money only; POOL moves the party’s purses into that pile. EXIT warns before uncollected treasure is abandoned.
- City shops sell into the selected character’s inventory and charge that character’s purse. An explicit POOL creates a temporary service fund for purchases, training, or lodging; remaining coins must be collected or deliberately abandoned before leaving. TRADE moves carried items or coins between characters; DROP destroys them. Equipment and coins count toward strength-based carrying limits and can slow combat movement. Class trainers use earned experience and money; temples revive companions, restore health and prepared spells, and remove afflictions.
- The training ground offers safe practice combat that restores pre-practice vitals and conditions afterward and grants no gold, experience, or loot. The safe city has no roaming encounters; beginner areas limit fights to tier-one or tier-two foes.
- Characters assemble from reusable head, torso, arms, legs, main-hand, off-hand, and back parts. Parts can have the sizes their models need; complete custom creatures can use a single torso model.
- Armor, weapons, shields, jewelry, and carried-back items contribute to character equipment. Combat gear affects statistics and visible voxel parts; extra clothing slots customize appearance; enchanted items can have graphical effects.
- Each room tile contains a 3×3 set of combat cells. Objects and creatures occupy combat-cell footprints, including larger monsters.
- Green overlays show available movement. Red overlays show enemies reachable with the hero’s remaining movement and weapon range; selecting one moves into a legal attack position and strikes in one command.
- Exploration, combat, and character previews use full RGB voxel graphics rendered at display resolution with antialiasing. The bitmap HUD and minimap supply the interface’s pixel styling; their state colors do not restrict model or environment colors.
- Environments include voxel surface relief and objects. Torches, lamps, and item effects provide local light; combat adds enough ambient fill to keep figures visible.
- The browser game uses keyboard and pointer controls. Its base interface has a 640px minimum width; smaller viewports do not currently receive a separate mobile game layout.

## Brand Commitments

Retro, direct, adventurous fantasy gameplay. Preserve the playable bitmap game interface, including its bitmap lettering, black panels, patterned borders, and clear state colors.

Marketing sections, dashboard metrics, decorative cards, and technical model-editing terminology do not belong in player equipment flows.

## Product Principles

- Make the selected character and available actions clear.
- Show the consequence of equipping an item on the character itself.
- Keep carried items distinct from equipped items.
- Preserve readable controls and the existing fantasy game identity.
- Use the same equipment definitions for rules and rendering.

## Accessibility & Inclusion

Maintain keyboard and pointer operation, explicit text labels, visible focus, and accessible counterparts to canvas controls. Do not rely on color alone for equipped, selected, or unavailable states. Keep controls usable at the supported viewport sizes.
