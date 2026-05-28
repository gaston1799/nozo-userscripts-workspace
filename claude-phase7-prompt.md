# Phase 7 - AutoBreak/Traps

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `progress.md`
- `phase2-progress.md`
- `phase3-progress.md`
- `phase4-progress.md`
- `phase5-progress.md`
- `phase6-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/README.md`
- `project-nozo-externals/src/constants.js`
- `project-nozo-externals/src/utils.js`
- `project-nozo-externals/src/packet.js`
- `project-nozo-externals/src/input.js`
- `project-nozo-externals/src/combat.js`
- `project-nozo-externals/scripts/scripts.js`
- relevant `moomoo.js` trap/autobreak sections only:
  - `Traps` around lines 19539-20392
  - `Traps_` around lines 20393-21010
  - `AutoBreaker` around lines 22530-23328
  - any direct `traps.aim` / `autoBreak.aim` writers/readers
  - any relevant object target filtering around `gameObjects`, `liztobj`, `closeObjects`

## Completion Contract

Create `phase7-progress.md` only after all Phase 7 work, checks, and commits are complete.

Do not create `phase7-progress.md` at the beginning.

If blocked, still create `phase7-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 7 only: AutoBreak/Traps target and aim modules for the new script.

Allowed files:

- `project-nozo-next.user.js`
- `project-nozo-externals/src/`
- `project-nozo-externals/dist/`
- `project-nozo-externals/scripts/scripts.js`
- `project-nozo-externals/package.json`
- `project-nozo-externals/README.md`
- task/progress files

Forbidden files:

- Do not edit `moomoo.js`.
- Do not port movement/pathfinding, render, UI/menu, or full placement logic.
- Do not send packets directly from traps/autobreak modules.
- Do not call `Nozo.packet.*` directly from traps/autobreak modules.
- Do not reintroduce competing `"D"` send sites.

## Required Work

Create focused target/aim modules, not full gameplay automation yet.

Recommended files:

- `project-nozo-externals/src/traps.js`
- `project-nozo-externals/src/autobreak.js`

Attach modules to:

- `Nozo.traps`
- `Nozo.autoBreak`
- `Nozo.modules.traps`
- `Nozo.modules.autoBreak`
- live state mirrors at `Nozo.state.traps` and `Nozo.state.autoBreak`

### Traps Requirements

Provide an API like:

- `state`: includes `inTrap`, `aim`, `target`, `lastScan`, `lastReason`, `debug`
- `scan(context)`
- `setAim(angle, tag, expireTick)`
- `clearAim(reason)`
- `getAim(context)`
- `getDebugState()`
- `getHistory()`

Behavior:

- Read object/player data from `context` first, then `Nozo.state`.
- Support `context.gameObjects`, `context.liztobj`, and `context.closeObjects`.
- Treat `closeObjects` as `liztobj` fallback when needed, matching the earlier debugging decision.
- Detect likely trap/spike target candidates using safe, defensive checks only.
- Return structured results: `{ ok, aim, target, reason, debug }`.
- Never throw on missing object fields.
- No packet sends.

### AutoBreak Requirements

Provide an API like:

- `state`: includes `active`, `aim`, `target`, `lastScan`, `lastReason`, `debug`
- `scan(context)`
- `setAim(angle, tag, expireTick)`
- `clearAim(reason)`
- `getAim(context)`
- `requestBreak(target, context)`
- `getDebugState()`
- `getHistory()`

Behavior:

- Read objects/player/enemy from `context` first, then `Nozo.state`.
- Use `Nozo.Utils` / `Nozo.createUtils()` distance/direction helpers when available; otherwise fallback to local math.
- Pick a nearest valid object target conservatively.
- Store `state.aim` for `Nozo.combat.calculateAim`.
- `requestBreak` may call `Nozo.combat.swingAt(angle, "autoBreak", context)` only if explicitly requested via `context.send === true`; default must be scan/aim only.
- No direct packet sends.

### Combat Integration

Update or verify `Nozo.combat.calculateAim` can read:

- `Nozo.state.traps.aim`
- `Nozo.state.autoBreak.aim`

If needed, make a tiny compatibility patch to `src/combat.js`, but keep it scoped.

Update `project-nozo-next.user.js`:

- add `@require` for `traps.min.js` and `autobreak.min.js` after `combat.min.js`
- update `Nozo.start()` external checks to include `Nozo.traps` and `Nozo.autoBreak`
- update startup phase label to `Phase 7 - AutoBreak/Traps`
- keep pinned commit URLs after externals push

Update docs:

- add `traps.min.js` and `autobreak.min.js` to README load order and module list
- document that trap/autobreak modules produce aim/target state and must not send packets directly
- document the `closeObjects` fallback behavior

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
node --check .\project-nozo-externals\src\traps.js
node --check .\project-nozo-externals\src\autobreak.js
node --check .\project-nozo-externals\dist\traps.min.js
node --check .\project-nozo-externals\dist\autobreak.min.js
git -C .\project-nozo-externals status --short
```

Because the obfuscator is non-deterministic, avoid unnecessary repeated builds after committing. If you must rebuild for checks, commit the final generated `dist` output once.

If the externals repo changes, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 7: Add traps autobreak foundations"
git -C .\project-nozo-externals push
```

Only commit if changes are valid and scoped.

## phase7-progress.md Format

Write a concise Markdown report with:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- checks run
- git commits/pushes, if any
- CDN URLs added/changed
- traps API surface
- autobreak API surface
- combat integration notes
- remaining risks
- next recommended phase
