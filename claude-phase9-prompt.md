# Phase 9 - Movement/Pathfinding

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `phase7-progress.md`
- `phase8-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/src/net-events.js`
- `project-nozo-externals/src/combat.js`
- relevant movement/path sections in `moomoo.js` only (JPS/GPT/naive path blocks and movement send callsites)

Important user constraint:
- Only port the active pathfinder currently used in runtime.
- Treat other pathfinder variants as dead code and do not port them.

## Completion Contract

Create `phase9-progress.md` only after all Phase 9 work, checks, and commits are complete.

Do not create `phase9-progress.md` at the beginning.

If blocked, still create `phase9-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 9 only: movement/pathfinding foundation as Nozo module(s).

Allowed files:

- `project-nozo-next.user.js`
- `project-nozo-externals/src/`
- `project-nozo-externals/dist/`
- `project-nozo-externals/package.json`
- `project-nozo-externals/README.md`
- task/progress files

Forbidden files:

- Do not edit `moomoo.js`.
- Do not add direct attack/aim logic in movement code.
- Do not send combat packets from movement modules.

## Required Work

1. Create movement foundation module:
   - Suggested file: `project-nozo-externals/src/movement.js`
   - Attach `Nozo.movement` and `Nozo.modules.movement`.
   - Mirror to `Nozo.state.movement`.

2. API surface (or close equivalent):
   - `setTarget(target)`
   - `clearTarget(reason)`
   - `setPath(path)`
   - `clearPath(reason)`
   - `step(context)` (single-tick movement step)
   - `canMove(context)`
   - `computeMoveDir(context)` (from target/path to angle)
   - `sendMove(angle, context)` (must route via `Nozo.packet.sendMove`)
   - `getDebugState()`
   - `getHistory()`

3. State separation:
   - Keep movement state separate from combat state.
   - Store things like `target`, `path`, `lastMoveDir`, `lastMoveTick`, `blockedReason`.
   - No writes to combat fields.

4. Pathfinding scope:
   - Identify the single active pathfinder from runtime callsites.
   - Port only that active one.
   - Do not port inactive/dead variants (JPS/GPT/naive alternatives that are not active).
   - If active pathfinder cannot be cleanly extracted in this phase, add a single adapter seam plus direct-target fallback, but still avoid bringing dead variants.

5. Integration with userscript:
   - Add `@require` for `movement.min.js`.
   - Add `Nozo.movement` externals check in `Nozo.start()`.
   - In bridge tick loop, call `Nozo.movement.step(ctx)` after net-state rebuild.
   - Ensure move sends only happen when socket ready and movement gate passes.

6. Gating/debug rules:
   - Movement should return structured blocked results with reason (`no-player`, `no-target`, `socket`, etc.).
   - Respect manual overrides if present in context/state.
   - Do not throw on missing data.

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
node --check .\project-nozo-externals\src\movement.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
node --check .\project-nozo-externals\dist\movement.min.js
git -C .\project-nozo-externals status --short
```

If externals changed, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 9: Add movement pathfinding foundation"
git -C .\project-nozo-externals push
```

## phase9-progress.md Format

Write concise report:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- movement API surface
- checks run
- commits/pushes
- CDN URLs changed
- remaining risks
- next recommended phase
