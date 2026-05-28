# Phase 5 - Input

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `progress.md`
- `phase2-progress.md`
- `phase3-progress.md`
- `phase4-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/README.md`
- `project-nozo-externals/src/constants.js`
- `project-nozo-externals/src/utils.js`
- `project-nozo-externals/src/packet.js`
- `project-nozo-externals/scripts/scripts.js`
- relevant `moomoo.js` input/mouse/keyboard/macro sections only

## Completion Contract

Create `phase5-progress.md` only after all Phase 5 work, checks, and commits are complete.

Do not create `phase5-progress.md` at the beginning.

If blocked, still create `phase5-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 5 only: Input foundation for the new script.

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
- Do not port combat, attack/aim, movement, render, `AutoBreaker`, or `Traps`.
- Do not wire actual game packet replacement yet.
- Do not send `"D"`, `"K"`, or direct attack packets from the input module.

## Required Work

Create a small input module for `NozoNext`, not a full game port yet.

Recommended file:

- `project-nozo-externals/src/input.js`

The module should attach to `NozoNext.input` and provide:

- `state.clicks = { left: false, middle: false, right: false }`
- `state.keys = {}`
- `state.mouse = { x: 0, y: 0, clientX: 0, clientY: 0 }`
- `state.macro = {}` as a minimal placeholder for later macro wiring
- `attach(target, options)` to add mouse/keyboard/contextmenu listeners
- `detach()` to remove every listener added by `attach`
- `setClick(buttonName, value, source)`
- `setKey(code, value, source)`
- `setMouse(eventLike, source)`
- `getClicks()`
- `getKeys()`
- `getMouse()`
- `getMacro()`
- `onManualSwing(callback)` or an equivalent callback registration hook for later combat integration
- `emitManualSwing(reason)` that calls registered callbacks with a snapshot, but does not send packets itself
- small debug/history support using `Nozo.log` and `Nozo.constants.MAX_LOG` if available

Behavior requirements:

- Keep `clicks.left` and `clicks.right` distinct.
- Left and right click can share implementation internally, but their state must remain separate because later hat changer logic needs the distinction.
- Prevent browser context menu only when configured by `attach(..., { preventContextMenu: true })`.
- Never throw on missing target/window; return a clear blocked result.
- Store snapshots in `Nozo.state.input` or make them reachable through `Nozo.input`.
- Do not assume the game canvas exists at script startup.

Update `project-nozo-next.user.js`:

- add `@require` for `input.min.js` after `packet.min.js`
- update `Nozo.start()` external checks to include `Nozo.input`
- update startup phase label to `Phase 5 - Input`
- keep pinned commit URLs after externals push

Update docs:

- add `input.min.js` to README load order and module list
- document the input API surface briefly

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
node --check .\project-nozo-externals\src\input.js
node --check .\project-nozo-externals\dist\input.min.js
git -C .\project-nozo-externals status --short
```

Because the obfuscator is non-deterministic, avoid unnecessary repeated builds after committing. If you must rebuild for checks, commit the final generated `dist` output once.

If the externals repo changes, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 5: Add input foundation"
git -C .\project-nozo-externals push
```

Only commit if changes are valid and scoped.

## phase5-progress.md Format

Write a concise Markdown report with:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- checks run
- git commits/pushes, if any
- CDN URLs added/changed
- input module API surface
- remaining risks
- next recommended phase
