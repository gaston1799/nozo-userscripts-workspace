# Phase 6 - Attack/Aim

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `progress.md`
- `phase2-progress.md`
- `phase3-progress.md`
- `phase4-progress.md`
- `phase5-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/README.md`
- `project-nozo-externals/src/constants.js`
- `project-nozo-externals/src/utils.js`
- `project-nozo-externals/src/packet.js`
- `project-nozo-externals/src/input.js`
- `project-nozo-externals/scripts/scripts.js`
- relevant `moomoo.js` combat/input sections only:
  - `sendAutoGather`
  - `getAttackDir`
  - `packet("D", ...)` call sites
  - `my.waitHit`
  - `traps.aim`
  - `autoBreak.aim`
  - `clicks.left` / `clicks.right`

## Completion Contract

Create `phase6-progress.md` only after all Phase 6 work, checks, and commits are complete.

Do not create `phase6-progress.md` at the beginning.

If blocked, still create `phase6-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 6 only: Attack/Aim pipeline foundation for the new script.

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
- Do not port full `AutoBreaker`, `Traps`, movement/pathfinding, render, or UI.
- Do not add direct `"F"` attack packet sending except as an opt-in disabled stub.
- Do not scatter packet sends across systems. All attack/aim sends must go through one combat module API.

## Required Work

Create a focused combat module for `NozoNext`, not a full behavior port yet.

Recommended file:

- `project-nozo-externals/src/combat.js`

Attach the module to `NozoNext.combat` and `Nozo.modules.combat`.

The module must provide these APIs or close equivalents:

- `state`: live combat state also reachable at `Nozo.state.combat`
- `setAimLock(angle, tag, ticksOrExpireTick)`
- `clearAimLock(tag)`
- `getActiveAim(context)`
- `calculateAim(context)`
- `canSwing(context)`
- `sendDirection(angle, tag, context)`
- `sendGather(tag, context)`
- `swingAt(angle, tag, context)`
- `manualSwing(reason, context)`
- `wireInput(inputModule)` to register `Nozo.input.onManualSwing(...)`
- `getHistory()`
- `getDebugState()`

Aim resolution requirements:

- One resolver only: `calculateAim(context)`.
- Priority order:
  1. active aim lock
  2. explicit `context.aim`
  3. `context.traps.aim` or `Nozo.state.traps.aim`
  4. `context.autoBreak.aim` or `Nozo.state.autoBreak.aim`
  5. enemy direction from player/enemy positions when enough data exists
  6. mouse/cursor fallback from `Nozo.input.getMouse()` when enough data exists
  7. blocked result with reason
- Return structured results like `{ ok, angle, source, reason, debug }`, not bare numbers.
- Never throw when data is missing.

Reload/swing requirements:

- Add a reload gate that can block swing sends and explain why.
- It must support the bugfix rule from legacy debugging: weapon reload is ready when reload is `<= pingTime` or `<= 0`; if reload is above the gate, block with reason `"reload"`.
- Pull values from `context` first, then `Nozo.state`, without assuming exact legacy object shapes.
- Include `weapon`, `reload`, `pingTime`, `source`, and current tick/time in debug output when available.
- Do not send if `context.macro === true`, unless explicitly passed `allowMacro: true`.

Packet requirements:

- `sendDirection` must be the only `"D"` sender in the new pipeline and must call `Nozo.packet.sendDirection(angle, tag)`.
- `sendGather` must be the only auto-gather swing sender and must call `Nozo.packet.sendGather()`.
- `swingAt` must do reload check, send direction, then send gather through the two helpers.
- Preserve debug history for every blocked/send attempt.
- If `Nozo.packet` is missing or the socket is not ready, return a blocked result instead of throwing.

Input integration:

- `wireInput(Nozo.input)` should register a callback so left/right manual swing events can enter `manualSwing`.
- Do not auto-attach to canvas yet.
- Do not make input listeners send packets directly.

Update `project-nozo-next.user.js`:

- add `@require` for `combat.min.js` after `input.min.js`
- update `Nozo.start()` external checks to include `Nozo.combat`
- update startup phase label to `Phase 6 - Attack/Aim`
- call `Nozo.combat.wireInput(Nozo.input)` if both modules exist
- keep pinned commit URLs after externals push

Update docs:

- add `combat.min.js` to README load order and module list
- document combat API and the centralized packet-sending rule
- note that direct `"F"` attack packets remain disabled/unsupported

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
node --check .\project-nozo-externals\src\combat.js
node --check .\project-nozo-externals\dist\combat.min.js
git -C .\project-nozo-externals status --short
```

Because the obfuscator is non-deterministic, avoid unnecessary repeated builds after committing. If you must rebuild for checks, commit the final generated `dist` output once.

If the externals repo changes, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 6: Add attack aim pipeline"
git -C .\project-nozo-externals push
```

Only commit if changes are valid and scoped.

## phase6-progress.md Format

Write a concise Markdown report with:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- checks run
- git commits/pushes, if any
- CDN URLs added/changed
- combat module API surface
- reload gate behavior
- packet send behavior
- remaining risks
- next recommended phase
