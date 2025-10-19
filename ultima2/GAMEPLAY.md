# Ultima II Tribute – Quest & Progression Guide

This guide walks through the intended story beats of the Moon Isle scenario and confirms that each step is supported by the in-game map and scripting. Coordinates reference the overworld grid used by the engine (origin at the top-left corner).

## Orientation and controls

- You begin at the castle on Moon Isle (Avatar spawn `(35, 31)`) with Captain Mirna directly east in the harbor courtyard. 【F:ultima2/script.js†L150-L182】【F:ultima2/script.js†L352-L432】
- Press **M** to open the world map overlay for a bird's-eye view of the island, key NPCs, moongates, and tracked items. 【F:ultima2/script.js†L108-L132】【F:ultima2/script.js†L688-L815】
- Movement uses the arrow keys / WASD, `T` or `Enter` initiates a conversation, `Space` waits a turn, and `Esc` closes dialogues or the map overlay. 【F:ultima2/index.html†L65-L70】【F:ultima2/script.js†L1160-L1216】

## Quest 1 – Recover the Star Chart

1. Speak with **Captain Mirna** at `(36, 31)` inside the castle port to accept the "Recover the Star Chart" quest. The dialogue tree transitions from `intro` to `progress` and flags the quest as in progress. 【F:ultima2/script.js†L352-L432】
2. Head east toward the ruins; the overworld layout provides a land bridge of plains tiles leading from the castle courtyard to the pirate's patrol route near the eastern shoreline. 【F:ultima2/script.js†L32-L90】
3. Defeat the **Moon Pirate** stationed at `(53, 31)`. Combat is triggered when you step onto the pirate's tile. 【F:ultima2/script.js†L305-L349】【F:ultima2/script.js†L531-L580】
4. Loot the pirate to obtain the **Astral Chart**. The drop logic forces the chart to appear if you have not yet completed the quest, ensuring the objective is achievable. 【F:ultima2/script.js†L591-L604】
5. Return to Captain Mirna and choose "Hand over the chart". She completes the quest, increases your maximum HP, and the chronicle log records the reward. 【F:ultima2/script.js†L403-L432】

## Quest 2 – Replant the Herb Garden

1. Use the **Harbor moongate** at `(55, 31)` (due south of the pirate encounter) to reach `Moonrise Glade`, then follow the moongate network until you arrive at the sanctum in the northeast. The teleport links are defined in the network table. 【F:ultima2/script.js†L100-L105】【F:ultima2/script.js†L287-L303】
2. Meet **Elowen the Verdant** at `(74, 16)` to start "Replant the Herb Garden". Accepting the quest sets the status to in progress and tracks how many herbs you have collected. 【F:ultima2/script.js†L434-L517】
3. Gather **three Moon Herbs**. Two are in the sanctum grounds and the remaining patches sit in the western ruins and dunes `(73,16)`, `(75,19)`, `(24,35)`, `(21,42)`, `(18,43)`—all on passable forest or plain tiles per the overworld string. 【F:ultima2/script.js†L32-L90】【F:ultima2/script.js†L1232-L1236】
4. Deliver the herbs back to Elowen. The script removes three herbs from your inventory, marks the quest complete, refills your HP, and grants the Druidic Charm (with a +1 attack bonus). 【F:ultima2/script.js†L473-L505】【F:ultima2/script.js†L200-L217】

## Additional progression notes

- The **world map overlay** highlights moongates, NPCs, notable monsters, and tracked items, making it easy to verify objectives before trekking across the island. 【F:ultima2/script.js†L688-L801】
- The chronicle log records every key action (quest states, loot, combat) to help you confirm progress. 【F:ultima2/script.js†L247-L284】【F:ultima2/script.js†L1117-L1120】
- Should you fall in battle, you respawn inside the castle infirmary with half HP, so quests remain accessible without a game over loop. 【F:ultima2/script.js†L583-L589】

By following the steps above—and leaning on the new map overlay for navigation—you can reliably complete both primary quests and explore Moon Isle without getting lost.
