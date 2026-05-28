# Phase 4 - Packet/Socket

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `progress.md`
- `phase2-progress.md`
- `phase3-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/README.md`
- `project-nozo-externals/src/constants.js`
- `project-nozo-externals/src/utils.js`
- `project-nozo-externals/scripts/scripts.js`
- relevant `moomoo.js` packet/socket sections only

## Completion Contract

Create `phase4-progress.md` only after all Phase 4 work, checks, and commits are complete.

Do not create `phase4-progress.md` at the beginning.

If blocked, still create `phase4-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 4 only: Packet/Socket foundation for the new script.

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
- Do not port input, combat, attack/aim, movement, render, `AutoBreaker`, or `Traps`.
- Do not replace legacy packet behavior in `moomoo.js`.

## Required Work

Create a small packet/socket module for `NozoNext`, not a full game port yet.

Recommended file:

- `project-nozo-externals/src/packet.js`

The module should attach to `NozoNext.packet` or `NozoNext.net` and provide:

- `setSocket(ws)` stores the active socket in `Nozo.state.WS`
- `getSocket()` returns the active socket
- `encodePacket(type, dataArray)` uses `root.msgpack.encode([type, dataArray])`
- `sendPacket(type, ...args)` encodes and sends if socket is open
- `sendDirection(angle, tag)` sends packet `"D"` with debug metadata
- `sendMove(angle, extra)` sends packet `"9"` with debug metadata
- `sendGather()` sends packet `"K", 1, 1` with debug metadata
- debug history for last N packets, using `Nozo.constants.MAX_LOG` if available
- clear blocked result if missing socket/msgpack instead of throwing

Do not add direct `"F"` attack packet helpers yet except an explicitly named opt-in stub like `sendAttackPacketUnsafe()` if you need to reserve the API. It must not be used by anything.

Update `project-nozo-next.user.js`:

- add `@require` for `packet.min.js` after `constants.min.js`
- update `Nozo.start()` external checks to include the new packet module
- keep pinned commit URLs after externals push

Update docs:

- add `packet.min.js` to README load order and module list

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
node --check .\project-nozo-externals\src\packet.js
node --check .\project-nozo-externals\dist\packet.min.js
git -C .\project-nozo-externals status --short
```

Because the obfuscator is non-deterministic, avoid unnecessary repeated builds after committing. If you must rebuild for checks, commit the final generated `dist` output once.

If the externals repo changes, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 4: Add packet socket foundation"
git -C .\project-nozo-externals push
```

Only commit if changes are valid and scoped.

## phase4-progress.md Format

Write a concise Markdown report with:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- checks run
- git commits/pushes, if any
- CDN URLs added/changed
- packet module API surface
- remaining risks
- next recommended phase
