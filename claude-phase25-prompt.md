# Phase 25 — Legacy Alias Removal Wave 2 (Traps + Traps_)

Workspace:
`C:\Users\Naquan\userscripts`

Target:
`project-nozo-single.user.js`

Read first:
- `task.md`
- `phase24-progress.md`

## Goal
Refactor `Traps` and `Traps_` to consume `PlayerRuntime.legacyCtx` (or injected context) directly, removing their dependence on module-scope aliases as much as possible, with no behavior change.

## Constraints
1. Do not edit `moomoo.js`.
2. Do not refactor `Instakill` in this phase.
3. Preserve `_things` compatibility facade.
4. Keep strict-fail behavior (no silent swallowing).
5. Keep packet/update behavior parity.

## Required changes
1. Update `Traps` and `Traps_` constructors to accept/store context (`ctx`) and move internal references from module globals to `this.ctx`.
2. Wire `PlayerRuntime` construction to pass `this.legacyCtx` into both classes.
3. Update `syncLegacyCombatRefs` mirrors: remove globals no longer required after Traps/Traps_ migration.
4. Leave explicit TODO markers for remaining globals still required by `Instakill`.

## Validation
Run:
- `node --check project-nozo-single.user.js`

## Output contract
Create `phase25-progress.md` only after completion (or blocked).

If complete:
- `Status: COMPLETE`
- list of removed Traps/Traps_ global aliases
- list of remaining aliases (Instakill only)
- validation summary

If blocked:
- `Status: BLOCKED`
- blocker and next action
