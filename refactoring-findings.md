# Shared Refactoring Opportunities

The earlier review highlighted several duplication hotspots in the arcade games. This document organizes those observations so each area can be addressed independently when planning shared abstractions.

## CRT / Scanline Initialization (implemented)

- **Where it appears**: `pacman`, `snake`, `defender`, `bubble-bobble`, `nemesis`, `boulderdash`, `qbert-crt`, and `lode-runner` now call the shared `initGameCrt` helper.
- **What changed**: `shared/ui/gameCrt.js` wraps the control panel, scanline syncing, and post-processor wiring. Games supply their storage key, settings bag, target context, and optional hooks (e.g., Q*bert's mask toggles) instead of duplicating the plumbing.
- **How to use it**:
  ```js
  const settings = createDefaultCrtSettings();
  const { post } = initGameCrt({
    storageKey: 'my_crt_settings',
    settings,
    targetContext: ctx,
    defaultSource,
  });
  ```
- **Why it matters**: The helper keeps persistence quirks and scanline CSS updates consistent across games, so tweaking the CRT experience now lands in one place.

## Input D-Pad Wiring

- **Where it appears**: `pacman`, `snake`, and `defender` wire `createDPad` with `preventDefault: true`, then map direction callbacks into local state booleans or vectors.
- **Common pattern**: Each setup configures pause/restart keys and defines a handful of bespoke handlers (e.g., boost, fire) on top of largely identical directional handling.
- **Why it matters**: While less repetitive than the CRT setup, the configuration logic mirrors one another closely enough to benefit from documentation or minor helpers.
- **Suggested extraction**: Consider extending `createDPad` with reusable callbacks or a lightweight wrapper that standardizes the directional-to-state translation, while still allowing custom action keys.

## Other Overlaps

- **Smaller helpers**: Utilities like one-line `clamp` functions or the `createPixelContext`/`resizeToGrid` sequence already live in `shared/` and do not require further action.
- **Game-specific logic**: Beyond CRT and input handling, most remaining code is purpose-built for each title. Additional abstraction here would add indirection without clear payoff.

---

By separating the findings into these buckets, future work can target the highest-value refactors (CRT handling first, input wiring second) without over-generalizing the mechanics that make each game unique.
