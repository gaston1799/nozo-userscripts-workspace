# Phase 20 — Player/Object/Net-Events Parity Closure

Status: COMPLETE

---

## Summary

Phase 20 closed the principal parity gaps left from Phase 19:

**Player behavior parity** (`src/player.js`): Added three focused helpers used by active
modules — `isTeam` (team-field-only check, complements `isSameTeam`), `setReload`
(canonical setter for one weapon-slot reload value), and `addDamageThreat` (stamps
`lastDamageThreatAt` and increments `damageThreatCount` for healer/combat damage-rate
detection). All three exported in `playerModel`.

**Object model parity** (`src/object-model.js`): Added `getThresholdRadius(obj,
playerScale, buffer)` — centralises the `playerScale + objScale + buffer` expression
used by every scan loop in traps and autobreak. Added `isDecoratedItem(obj)` — canonical
test for whether `decorateObject` has run on an object (checks `obj.isItem === true`).
Both exported in `objectModel`.

**Net-events hot-path optimization** (`src/net-events.js`): In `_handlerA`
(updatePlayers), hoisted `_canEnsure` and `_canApply` boolean flags outside the
per-player loop so `typeof model.ensurePlayer === "function"` and
`typeof model.applyTupleUpdate === "function"` are evaluated once per packet instead of
once per player (up to 40 players at ~50 ms cadence). BRIDGE fallbacks remain; the
hoisting only removes redundant capability re-checks on each iteration.

**Autobreak tier 2 flag upgrade** (`src/autobreak.js`): Replaced inline name-string
comparisons (`nm === "turret" || nm === "teleporter" || nm === "blocker"`) with
objectModel flag reads (`e.turret || e.teleport || e.blocker`). These flags are
set by `decorateObject` (via `classifyFlags`) and are the canonical classification
source; the string comparison was a redundant local re-classifier that could diverge
from the objectModel definition.

**`_getObjScale` primary path** (`src/traps.js`, `src/autobreak.js`): Both modules
now prefer `objectModel.getScale(obj)` when `Nozo.objectModel` is available, with the
existing try-catch instance method and raw `.scale` fallback retained beneath it.
No BRIDGE annotation added — this is a preference ordering, not a BRIDGE pattern.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/player.js` | Added `isTeam`, `setReload`, `addDamageThreat`; all exported in `playerModel` |
| `project-nozo-externals/src/object-model.js` | Added `getThresholdRadius`, `isDecoratedItem`; both exported in `objectModel` |
| `project-nozo-externals/src/net-events.js` | Hoisted `_canEnsure`/`_canApply` in `_handlerA`; BRIDGE comment on hoisting block |
| `project-nozo-externals/src/autobreak.js` | Tier 2: replaced name-string comparisons with flag checks; `_getObjScale` prefers `objectModel.getScale` |
| `project-nozo-externals/src/traps.js` | `_getObjScale` prefers `objectModel.getScale` |
| `project-nozo-externals/dist/*.min.js` (all 16) | Rebuilt (obfuscator re-seed) |

**Not changed**: `src/object-manager.js`, `src/combat.js`, `src/healer.js`,
`src/movement.js`, `src/render.js`, `src/html.js`, `src/tick-scheduler.js`,
`project-nozo-next.user.js` — no Phase 20 parity gaps in these files.

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — 17 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — 16 modules built |
| `git -C project-nozo-externals status --short` | Modified: `src/autobreak.js`, `src/net-events.js`, `src/player.js`, `src/traps.js`, `package.json`, all 16 dist files. Untracked: `src/object-manager.js`, `src/object-model.js`, `dist/object-manager.min.js`, `dist/object-model.min.js`. (untracked files are Phase 19 carry-over — not staged in Phase 20) |

---

## All `// BRIDGE:` Locations

| # | File | Location | Reason | Remove condition |
|---|------|----------|--------|-----------------|
| 1 | `src/net-events.js` | `_handlerA` — `_canEnsure`/`_canApply` hoisting block | Hoisted capability flags; both false when playerModel absent, activating inline fallbacks | playerModel always loads before net-events |
| 2 | `src/net-events.js` | `_handlerA` — player-lookup inline loop | Fallback player find/create when playerModel absent | playerModel always loads before net-events |
| 3 | `src/net-events.js` | `_handlerA` — inline tuple-apply `else` body | Inline field assignment when playerModel absent | playerModel always loads before net-events |
| 4 | `src/net-events.js` | `_decorateObject` body | Local classifier duplicates `objectModel.decorateObject` | objectModel always loads before net-events |
| 5 | `src/net-events.js` | `_removeObjectBySid` body | Local loops duplicate `objectManager.remove` | objectManager always loads before net-events |
| 6 | `src/net-events.js` | `_handlerH` inline upsert | Push loop replaced by `objectManager.decorateAndUpsert` | objectManager always loads before net-events |
| 7 | `src/net-events.js` | `_handlerR` scalar branch | Owner loops replaced by `objectManager.removeByOwner` | objectManager always loads before net-events |
| 8 | `src/net-events.js` | `_handlerO` health assignment | Inline assignment replaced by `playerModel.applyHealthUpdate` | playerModel always loads before net-events |
| 9 | `src/net-events.js` | `_handlerD` player-create | Inline find/create fallback when playerModel absent | playerModel always loads before net-events |
| 10 | `src/net-events.js` | `_handlerE` mark-dead `else` | Inline alive-flag clear when playerModel absent | playerModel always loads before net-events |
| 11 | `src/traps.js` | `_isTeamObject` owner/team lines | Raw field fallback when obj not decorated by objectModel | All H-packet objects pass through `decorateObject` |
| 12 | `src/autobreak.js` | `_isTeamObject` owner/team lines | Raw field fallback when obj not decorated by objectModel | All H-packet objects pass through `decorateObject` |

Total: **12 `// BRIDGE:` annotations** across 3 files.

Phase 20 added 1 new annotation (#1, hoisting block). The per-loop inline annotations
for `_handlerA` (#2, #3) were already present from Phase 19; they were NOT removed
because the `@require` URLs still point to `b869b58` which lacks object-model and
object-manager, so BRIDGE fallbacks are the live path until Phase 19 commits are pushed.

---

## `@require` Hash Note

All `@require` entries in `project-nozo-next.user.js` still point to `b869b58`
(Phase 18 commit). The Phase 19 additions (`object-model.min.js`, `object-manager.min.js`)
and all Phase 20 dist rebuilds will 404 in Tampermonkey until Phase 19+20 changes are
committed and hashes are updated.

BRIDGE fallbacks in `net-events.js` ensure no crash — the script degrades to
pre-Phase-19 behaviour when CDN files are absent.

---

## Remaining Parity Gaps and Recommended Phase 21 Scope

| Gap | Severity | Notes |
|-----|----------|-------|
| All Phase 19 + 20 changes uncommitted | High | `src/object-model.js`, `src/object-manager.js`, all `src/` edits, and all 16 dist files unstaged. Phase 21 must commit and update `@require` hashes. |
| `@require` hashes point to `b869b58` | High | Will 404 for object-model/manager until commit+push; BRIDGE fallbacks are live path. |
| `playerModel.addDamageThreat` not wired in healer | Medium | Helper added to player model but `_handlerO` / healer `onHealthUpdate` do not call it yet. Wiring it removes the parallel damage-delta calculation in healer. |
| `playerModel.setReload` not wired in `_handlerN` | Medium | `_handlerN` still does raw `player[index] = value`. When index targets a specific reload slot, `setReload` should be used to ensure the `reloads` map is always an object. |
| `healingBeta` mode not ported | Medium | `dontAutoHeal` weapon-list gate, hit-back trigger (`my.inHitBack`), shield anti path. `state.itemsData` is available for the weapon-type gate. |
| `combat.setEnabled()` master switch missing | Low | No menu master toggle for auto-aim. Menu shows sub-toggles only. Carried from Phase 15. |
| `antiSyncHealing` not ported | Low | Burst-heal mode under `my.antiSync`. |
| `predictHeal(N)` not ported | Low | Speculative multi-item placement. Not required for basic healer. |
| Combat reload catalog cross-check | Low | `canSwing` uses `player.reloads[wi]`; not cross-checked against `itemsData.list[wi].reload`. `playerModel.isReloadReady` is ready for this comparison. |
| `getThresholdRadius` not yet called by scan loops | Low | Added to objectModel but traps/autobreak scans still compute threshold inline. Safe to adopt in a cleanup phase. |

### Recommended Phase 21 Scope

**Phase 21 — Commit + Hash Update + addDamageThreat/setReload Wiring**

1. **Commit Phase 19+20**: stage all modified and untracked files in
   `project-nozo-externals`; push to `main`.
2. **Update `@require` hashes**: replace all `@b869b58` references in
   `project-nozo-next.user.js` with the new commit hash.
3. **Wire `addDamageThreat`**: call `playerModel.addDamageThreat(p, damaged)` in
   healer `onHealthUpdate` (after the damage-delta check); remove the parallel
   `damageThreatAt` logic if any.
4. **Wire `setReload`**: in `_handlerN`, detect when `index` targets a reload slot and
   route through `playerModel.setReload`; keep raw assignment as general fallback.
5. **`healingBeta` mode**: add `dontAutoHeal` weapon-list gate using `state.itemsData`,
   hit-back trigger, shield anti path.

---

## No Commit/Push

No git commits or pushes were performed in this phase per Phase 20 rules.
All changes remain in the working tree pending the Phase 21 commit step.
