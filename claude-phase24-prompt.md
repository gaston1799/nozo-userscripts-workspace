# Phase 24 — Legacy Alias Removal Wave 1 (AutoBreaker)

You are working in:
`C:\Users\Naquan\userscripts`

Target file:
`project-nozo-single.user.js`

Read first:
- `task.md`
- `phase23-progress.md`

## Goal
Remove module-scope alias dependence for **AutoBreaker only** by making it consume `PlayerRuntime.legacyCtx` directly, while preserving behavior.

## Scope constraints
1. Edit only `project-nozo-single.user.js` and phase progress/task docs if needed.
2. Do not edit `moomoo.js`.
3. Do not refactor `Traps`, `Traps_`, or `Instakill` in this phase.
4. Keep `_things` facade and `legacyCtx` model intact.
5. Strict behavior parity, no feature additions.

## Required changes
1. Refactor `AutoBreaker` so it no longer closes over module globals like:
   - `player`, `items`, `nearObjs`, `enemy`, `near`, `traps`, `objectManager`, `_things`
2. Provide context to `AutoBreaker` via constructor/setter (prefer constructor) and use that source internally.
3. Update `PlayerRuntime` construction/wiring accordingly.
4. In `syncLegacyCombatRefs`, stop mirroring globals that are now no longer needed by AutoBreaker.
5. Keep clear TODO notes for remaining globals still needed by `Traps`/`Instakill`.

## Validation
Run:
- `node --check project-nozo-single.user.js`

## Output contract
Create `phase24-progress.md` only after complete (or blocked).

If complete include:
- `Status: COMPLETE`
- exact removed AutoBreaker global aliases
- exact global aliases still required by Traps/Instakill
- short verification summary

If blocked include:
- `Status: BLOCKED`
- blocker and next action
