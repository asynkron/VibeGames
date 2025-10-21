# Battle AI

Battle AI is a lightweight auto-battler sandbox where two colour-coded squads fight for map control. Units steer towards their rally point until hostiles are detected, then engage using simple behaviours that favour positioning and range control.

## Controls

- **Deploy Blue Squad / Deploy Red Squad** – spawn a new unit for the chosen faction at its staging area.
- **Auto Deploy** – toggle periodic reinforcements for both factions. You can also press the <kbd>Space</kbd> bar.
- **Reset Arena** – wipe the battlefield and reset the score. The keyboard shortcut is <kbd>R</kbd>.
- **Left click** – set a new rally location for the last selected team, letting you guide flanks and choke points.

## Tips

- The arena enforces a population cap per faction. If the staging area is full, reposition existing squads before requesting more.
- Unit templates spawn with a mix of roles (scouts, vanguards, artillery, assassins) so the fights stay varied.
- The game honours `prefers-reduced-motion` by lowering the population cap and disabling auto deployment by default.
