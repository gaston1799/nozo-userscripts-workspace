# Phase 23 — NozoSingle Legacy Global Burn-Down (Entity Context Refactor)

You are working in:
`C:\Users\Naquan\userscripts`

Primary target file:
`project-nozo-single.user.js`

Read first:
- `task.md`
- `unported-classes-plan.md`

## Goal
Move legacy module-scope mutable globals toward `PlayerRuntime` / `NozoSingle._things` context without changing runtime behavior.

Focus specifically on this legacy block and downstream usages:
- `player`, `items`, `nearObjs`, `enemy`, `near`, `objectManager`, `traps`, `configs`, `config`, `gameObjects`, `game`, `instaC`, `my`, `useWasd`, `_things`
- plus action refs already introduced (`buyEquip`, `selectWeapon`, `sendAutoGather`, `place`, `checkPlace`, `canplace`, etc.)

## Hard constraints
1. Do not edit `moomoo.js`.
2. Do not touch bot classes yet.
3. Keep behavior parity for current flows (do not introduce feature changes).
4. Keep strict-fail style: avoid silent swallow patterns.
5. Do not remove `NozoSingle._things` compatibility facade in this phase.

## Required implementation
1. Introduce a single context holder (ex: `this.legacyCtx`) on `PlayerRuntime` that is the internal source for these values.
2. Refactor `syncLegacyCombatRefs` so it writes to `this.legacyCtx` first, then mirrors to global aliases only where currently required by legacy-ported classes.
3. Replace direct reads in newly ported helpers/methods where easy and safe with reads from `this.legacyCtx` (small, low-risk slices).
4. Add clear TODO markers for remaining legacy-global consumers that still require aliasing.
5. Keep all existing class construction and packet flow intact.

## Validation
Run:
- `node --check project-nozo-single.user.js`

## Output contract (mandatory)
Create `phase23-progress.md` only after completion (or blocked).

If successful, include:
- `Status: COMPLETE`
- concise summary of refactor changes
- list of exact symbols still requiring global alias mirroring
- validation command output summary

If blocked, include:
- `Status: BLOCKED`
- blocker details
- files touched
- next concrete action
