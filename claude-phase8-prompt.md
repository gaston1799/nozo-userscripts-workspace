# Phase 8 - Net Events Port

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `phase6-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/src/net-events.js`
- `project-nozo-externals/src/combat.js`
- `project-nozo-externals/src/input.js`
- `project-nozo-externals/src/packet.js`
- relevant `moomoo.js` message-handler sections only (`getMessage`, `events` map handlers and immediate dependencies)

## Completion Contract

Create `phase8-progress.md` only after all Phase 8 work, checks, and commits are complete.

Do not create `phase8-progress.md` at the beginning.

If blocked, still create `phase8-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 8 only: port websocket event routing/handlers into Nozo modules and adapt to Nozo state.

Allowed files:

- `project-nozo-next.user.js`
- `project-nozo-externals/src/`
- `project-nozo-externals/dist/`
- `project-nozo-externals/package.json`
- `project-nozo-externals/README.md`
- task/progress files

Forbidden files:

- Do not edit `moomoo.js`.
- Do not rewrite movement/pathfinding/render/UI.
- Do not add direct packet sends from net-event handlers.

## Required Work

1. Evolve `src/net-events.js` into a stable dispatcher module:
   - Keep one global router object (no per-message map recreation).
   - Preserve `dispatch(type, data, ctx)`.
   - Preserve `setHandlers(overrides)`.
   - Add `register(type, fn)` and `registerMany(map)` helpers.
   - Keep `"io-init"` handling in module and set `state.socketID`.

2. Port and adapt a practical first set of handlers from legacy `events` map to Nozo state, minimally:
   - `a` (`updatePlayers`) -> update `Nozo.state` structures needed by combat/traps (player, near/enemy snapshots).
   - `H` (`loadGameObject`) -> update `Nozo.state.gameObjects`.
   - `Q`/`R` (`killObject`/`killObjects`) -> remove from state object lists.
   - `G` (`updateLeaderboard`) -> store in `Nozo.state.leaderboard`.
   - `7` (`updateMinimap`) -> store in `Nozo.state.minimap`.
   - `N`/`O` (`updatePlayerValue`/`updateHealth`) -> update player fields safely.

3. Adapt shape to Nozo conventions:
   - Write to `Nozo.state.*` only.
   - No legacy globals.
   - No broad try/catch wrappers.
   - Use explicit guard checks and blocked reason returns/logs.

4. Wire registrations:
   - Register default handlers in `net-events.js` or a sibling module loaded by it.
   - Ensure `project-nozo-next.user.js` WS hook uses the upgraded dispatcher without recreating handler tables.

5. Respect user-local change:
   - User mentioned `Nozo.netEvents = function () { ... }` pattern locally.
   - If needed, keep backward compat by exposing callable facade plus object API, e.g. callable function with `.dispatch/.setHandlers/.register`.
   - Do not break current WS hook contract.

6. Update docs and requires:
   - Ensure userscript includes `net-events.min.js` `@require` pinned to new commit hash.
   - README module list + load order includes net-events.

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
node --check .\project-nozo-externals\src\net-events.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
node --check .\project-nozo-externals\dist\net-events.min.js
git -C .\project-nozo-externals status --short
```

If externals repo changed, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 8: Port net event handlers to Nozo state"
git -C .\project-nozo-externals push
```

## phase8-progress.md Format

Write concise report:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- handlers ported
- state fields updated
- checks run
- commits/pushes
- CDN URLs changed
- risks + next phase
