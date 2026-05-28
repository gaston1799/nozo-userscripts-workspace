# Phase 19 — Player/Object/ObjectManager Class Parity

Status: COMPLETE

---

## Summary

Phase 19 completed Player/Object/ObjectManager class parity for active modules
(combat, traps, autobreak, healer, movement) and introduced explicit `// BRIDGE:`
annotations on every compatibility fallback path.

**Player helpers added** (`src/player.js`): `isAlive`, `isSameTeam`,
`isReloadReady`, `applyHealthUpdate` — centralising the alive gate, team checks,
reload comparison, and oldHealth bookkeeping that were previously duplicated inline
across net-events, combat, and healer.

**Object manager extended** (`src/object-manager.js`): `decorateAndUpsert(sid,
rawFields)` — the single canonical path for creating, decorating, and upserting
an H-packet object. Delegates to `Nozo.objectModel.decorateObject` so all
sub-flags (`trap`, `dmg`, `spike`, `turret`, `poison`, `blocker`, `teleport`) are
set consistently.

**Net-events wired to model/manager APIs** (`src/net-events.js`):
- `_decorateObject` now delegates to `objectModel.decorateObject` first; the local
  body is retained as an explicit BRIDGE fallback.
- `_removeObjectBySid` now delegates to `objectManager.remove` first; local loops
  are the BRIDGE fallback.
- `_handlerH` prefers `objectManager.decorateAndUpsert`; inline push loop is BRIDGE.
- `_handlerR` (scalar path) prefers `objectManager.removeByOwner`; inline loops are BRIDGE.
- `_handlerO` prefers `playerModel.applyHealthUpdate`; inline assignment is BRIDGE.
- Existing model-guarded paths in `_handlerD`, `_handlerA`, `_handlerE` annotated
  with `// BRIDGE:` comments (these patterns already existed but were unmarked).

**BRIDGE annotations added to active scan modules**:
- `traps.js` `_isTeamObject`: inline owner/team checks marked as BRIDGE fallback
  for objects that bypassed `objectModel.decorateObject`.
- `autobreak.js` `_isTeamObject`: same.

**Package and userscript updated**:
- `package.json` check script now includes `object-model.js` and
  `object-manager.js` (17 src files + scripts.js).
- `project-nozo-next.user.js`: two new `@require` entries for `object-model.min.js`
  and `object-manager.min.js` inserted between `player.min.js` and `net-events.min.js`
  (matching the intended load order); phase label updated to Phase 19; externals
  check extended with `Nozo.objectModel` and `Nozo.objectManager`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/player.js` | Added `isAlive`, `isSameTeam`, `isReloadReady`, `applyHealthUpdate` helpers; all exported in `playerModel` |
| `project-nozo-externals/src/object-manager.js` | Added `decorateAndUpsert(sid, rawFields)`; exported in `objectManager` |
| `project-nozo-externals/src/net-events.js` | `_decorateObject` delegates to objectModel; `_removeObjectBySid` delegates to objectManager; `_handlerH`/`R`/`O`/`D`/`A`/`E` wired with BRIDGE annotations |
| `project-nozo-externals/src/traps.js` | BRIDGE comment on `_isTeamObject` inline fallback |
| `project-nozo-externals/src/autobreak.js` | BRIDGE comment on `_isTeamObject` inline fallback |
| `project-nozo-externals/package.json` | Added `object-model.js` and `object-manager.js` to check script (now 17 src files) |
| `project-nozo-externals/dist/*.min.js` (all 16) | Rebuilt (obfuscator re-seed) |
| `project-nozo-next.user.js` | Phase label → Phase 19; added `@require` for `object-model.min.js` and `object-manager.min.js` between player and net-events; externals check extended with `Nozo.objectModel`/`Nozo.objectManager` |

**Not changed** (no parity gaps in scope):
- `src/object-model.js` — already canonical; `classifyFlags` sets all sub-flags;
  `decorateObject` and `getScale` semantics were already consistent.
- `src/combat.js`, `src/healer.js`, `src/movement.js`, `src/render.js`,
  `src/html.js`, `src/tick-scheduler.js` — out of Phase 19 scope.

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — 17 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — 16 modules built |
| `git -C project-nozo-externals status --short` | Modified: `src/autobreak.js`, `src/net-events.js`, `src/player.js`, `src/traps.js`, `package.json`, all 16 dist files. Untracked: `src/object-manager.js`, `src/object-model.js`, `dist/object-manager.min.js`, `dist/object-model.min.js`. |

---

## BRIDGE Comments Added

| File | Location | Reason | Remove condition |
|------|----------|--------|-----------------|
| `src/net-events.js` | `_decorateObject` body | Local classifier duplicates objectModel.decorateObject | objectModel always loads before net-events |
| `src/net-events.js` | `_removeObjectBySid` body | Local loops duplicate objectManager.remove | objectManager always loads before net-events |
| `src/net-events.js` | `_handlerH` inline upsert | Push loop replaced by objectManager.decorateAndUpsert | objectManager always loads before net-events |
| `src/net-events.js` | `_handlerR` scalar branch | Owner loops replaced by objectManager.removeByOwner | objectManager always loads before net-events |
| `src/net-events.js` | `_handlerO` health assignment | Inline assignment replaced by playerModel.applyHealthUpdate | playerModel always loads before net-events |
| `src/net-events.js` | `_handlerD` player create | Inline create fallback when model absent | playerModel always loads before net-events |
| `src/net-events.js` | `_handlerA` player lookup | Inline lookup fallback when model absent (×2) | playerModel always loads before net-events |
| `src/net-events.js` | `_handlerA` applyTupleUpdate | Inline tuple-apply fallback when model absent | playerModel always loads before net-events |
| `src/net-events.js` | `_handlerE` mark-dead else | Inline alive-flag clear fallback when model absent | playerModel always loads before net-events |
| `src/traps.js` | `_isTeamObject` owner/team lines | Raw field fallback when obj not decorated by objectModel | All H-packet objects pass through decorateObject |
| `src/autobreak.js` | `_isTeamObject` owner/team lines | Raw field fallback when obj not decorated by objectModel | All H-packet objects pass through decorateObject |

Total: **11 `// BRIDGE:` annotations** across 3 files.

---

## Globals Policy

No new globals were introduced. All model/manager access goes through
`Nozo.objectModel`, `Nozo.objectManager`, and `Nozo.playerModel` on the shared
`NozoNext` namespace. No `unsafeWindow` writes added.

---

## CDN @require Note

The two new `@require` entries in `project-nozo-next.user.js` point to the `b869b58`
hash (Phase 18 commit), which does **not** contain `object-model.min.js` or
`object-manager.min.js`. At runtime these `@require` URLs will 404 in Tampermonkey
until Phase 19 is committed and the hashes are updated. The BRIDGE fallback paths in
`net-events.js` are the live path until then — no crash, degraded to pre-Phase-19
behaviour when the CDN files are absent.

**Action required in Phase 20**: commit all Phase 19 changes, then update every
`@b869b58` → new commit hash in `project-nozo-next.user.js`.

---

## Remaining Parity Gaps and Recommended Phase 20 Scope

| Gap | Severity | Notes |
|-----|----------|-------|
| object-model / object-manager / net-events / player / traps / autobreak uncommitted | High | All Phase 19 changes are unstaged. Phase 20 must commit and update @require hashes so CDN URLs resolve. |
| `@require` hashes for object-model/manager point to b869b58 | High | Will 404 until committed; BRIDGE fallbacks keep code functional meanwhile. |
| `healingBeta` mode not ported | Medium | dontAutoHeal weapon-list gate, hit-back trigger (my.inHitBack), shield anti path — all need itemsData (now available). |
| `combat.setEnabled()` master switch missing | Low | No menu master toggle for auto-aim; menu shows sub-toggles only. Carried from Phase 15. |
| `antiSyncHealing` not ported | Low | Burst-heal mode under my.antiSync not yet ported. |
| `predictHeal(N)` not ported | Low | Speculative multi-item placement; not required for basic healer. |
| Combat reload catalog cross-check | Low | canSwing uses player.reloads[wi]; not yet cross-checked against itemsData catalog reload field. playerModel.isReloadReady now exists as a helper for this future path. |
| autobreak/traps name-string comparisons | Low | Level-2 tier in autobreak checks `obj.name === "turret"` etc. by string; after full objectModel adoption, `obj.turret`/`obj.blocker`/`obj.teleport` flags can replace these directly. |

### Recommended Phase 20 Scope

**Phase 20 — Phase 19 Commit + healingBeta + @require Hash Update**

1. **Commit Phase 19**: stage and commit all modified and untracked files
   (`src/object-model.js`, `src/object-manager.js`, `src/net-events.js`,
   `src/player.js`, `src/traps.js`, `src/autobreak.js`, `package.json`, all dist
   files); push to `main`.
2. **Update @require hashes**: replace all `b869b58` references in
   `project-nozo-next.user.js` with the new Phase 19 commit hash.
3. **`healingBeta` mode**: add `dontAutoHeal` weapon-list gate using
   `state.itemsData`, hit-back trigger, shield anti path.
4. **`combat.setEnabled()`**: add enabled gate + menu master toggle.
5. **autobreak/traps flag-check upgrade**: replace name-string comparisons
   in tier-2 scan with `obj.turret`/`obj.blocker`/`obj.teleport` flag reads
   (valid once all objects pass through `decorateObject`).

---

## No Commit/Push

No git commits or pushes were performed in this phase per Phase 19 rules.
All changes remain in the working tree pending the Phase 20 commit step.
