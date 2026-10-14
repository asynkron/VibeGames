# Pool of Radiance reference

Reference target: SSI’s original 1988 Gold Box game, with DOS data as the numeric baseline. The goal is a recognizable voxel remake. The authored maps and interface interpret that campaign; original artwork and manual prose are not game assets here.

## Verified sources

| Source | What it supplies |
| --- | --- |
| [SSI Rule Book](https://dosdays.co.uk/media/games/pool/Pool%20of%20Radiance%20-%20Manual.pdf) | Character creation, four base classes, races, multi-classing, exploration, readied items, resting, tactical combat and magic. Printed pp.3–9 cover characters; pp.17–27 cover combat and spells. |
| [SSI Adventurer’s Journal](https://mocagh.org/ssi/pool-journal.pdf) | City/world reference maps, monster descriptions, equipment, spell lists, class progression, and class weapon restrictions. Tables are on printed pp.35–38. |
| [SSI Clue Book](https://dosdays.co.uk/media/games/pool/PoolOfRadiance-ClueBook.pdf) | Original local maps, New Phlan services, missions, encounter locations, travel progression and tactical spell parameters. New Phlan is on pp.3–4; the consolidated spell chart is on p.63. |
| [SSI C64/128 reference card](https://mocagh.org/ssi/pool-refcard.pdf) | Explicit errata: halfling minimum Constitution 10; charm lasts for a battle rather than adding a traveling companion; evil clerics turn undead. Port controls are distinct from shared rules. |
| [Gold Box Companion monster extraction](https://gbc.zorbus.net/mm/01_por.html) | Actual DOS record variants: HP, AC, THAC0, attacks, dice, movement, saves, XP, items, effects and encounter areas. The checked extraction has 169 records and 103 distinct labels. |
| [Gold Box Companion progression](https://gbc.zorbus.net/xp/xp_01_por.txt) | Per-class XP, levels, THAC0, hit dice, spell capacities, saves and thief progression. |
| [Gold Box Companion format archive](https://gbc.zorbus.net/formats.zip) | DOS character, item and effect documentation; item templates and variant catalogs. Useful for validating equipment facts and future imports. |
| [Gold Box Explorer](https://github.com/bsimser/Gold-Box-Explorer) | MIT-licensed DAX/GEO readers for extracting maps and other records from an original game installation. |
| [DOS v1.3 reconstructed constants](https://forgejo.brazencrows.com/talonius/pool-of-radiance/src/tag/v1.3/src/gdconsts.pas) | Original numeric spell constants and name IDs. Used as a factual cross-check. |

## Adaptation choices

New Phlan, the Slums, Sokal Keep, Kuto’s Well and the Moonsea wilderness have authored voxel layouts. Their topology follows the campaign’s city, ruins, keep and wilderness pattern. They are not cell-for-cell reconstructions. Council commissions and reduced encounter counts create a playable opening rather than recreating every original script.

The four base classes are Fighter, Cleric, Magic-user and Thief. Character creation includes eligible multi-class combinations. Combat keeps descending AC, THAC0, dice-based weapon damage, class restrictions, spell preparation and class-specific training. Creature templates retain factual data; the playable roster has modeled creatures and implemented effects. Unknown data flags do not invent mechanics.

The original spell catalog contains 55 first-to-third-level cleric/magic-user entries plus Restoration as a higher-level scroll effect. Descriptors identify class, spell level and eligible contexts. Effects are adapted to our combat geometry. Weapon and armor facts guide equipment, while additional body-part slots preserve customization. Magical item particles visualize enchantments.

Our game keeps flexible hero selection, four-direction tactical movement, modern gear presentation and free temple return after a wipe. The original full-party defeat required loading a saved game. These choices are intentional. Quest rewards, shop selections and encounter sizes serve this remake’s pacing.

The source books contain occasional contradictions and OCR errors. We compared table images and extracted DOS records where needed rather than treating every scan transcription as authoritative. There is no local original game installation available for executable comparison.
