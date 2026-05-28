# Phase 18 — Tick Scheduler + Healer Timeout Migration

Status: COMPLETE

---

## Summary

Phase 18 added a tick-based deferred-callback scheduler module (`tick-scheduler.js`) and
migrated all active ms-timeout-driven deferred actions in the healer module to use it.
The scheduler is wired into `Nozo.bridge.tick` so it fires before every other module,
giving callbacks predictable, tick-aligned delivery. Three healer timeout paths were
replaced: the shame-decay decrement (280 ticks / 14 s), the ping-aware heal-schedule
delay, and the skin-56 one-tick placement defer. Each path retains a `setTimeout` fallback
for contexts where the tick counter is not yet available. The html debug panel gained a
fourth line showing queue depth, total executed callbacks, and the last-executed tag.
All checks pass. Committed as `b869b58` and pushed to `main`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/tick-scheduler.js` | **New** — `scheduleInTicks`, `scheduleNextTick`, `cancel`, `runTick`; bounded queue (128) and history (64); structured logs for scheduled/executed/canceled events; debug state at `Nozo.tickScheduler.state` |
| `project-nozo-externals/src/healer.js` | Added `_SHAME_DECAY_TICKS = 280`; added `pendingScheduledId: null` to state; `_cancelPending` now also cancels tick-scheduled entries; `_scheduleHeal` prefers `scheduleInTicks` with `Math.max(1, ceil(delayMs/50))` ticks; `_addShameTimer` prefers `scheduleInTicks(_SHAME_DECAY_TICKS, ...)` tag `shameDecay`; skin-56 branch prefers `scheduleNextTick` tag `skin56Heal`; all paths fall back to `setTimeout` when tick context unavailable |
| `project-nozo-externals/src/html.js` | `_refreshDebugInfo` extended with scheduler line: `sched: q=N run=N last=<tag>` |
| `project-nozo-externals/package.json` | Added `node --check src/tick-scheduler.js` to `check` script (now 15 src files + scripts.js) |
| `project-nozo-externals/dist/tick-scheduler.min.js` | **New** — built from `tick-scheduler.js` |
| `project-nozo-externals/dist/*.min.js` (all 15 others) | Rebuilt (obfuscator re-seed) |
| `project-nozo-next.user.js` | Phase label → Phase 18; added `tick-scheduler.min.js` `@require` after `net-events.min.js`; `bridge.tick` calls `Nozo.tickScheduler.runTick(Nozo.state.tick)` before normalizeObjectLists; `Nozo.start` externals check includes `Nozo.tickScheduler`; all `@require` hashes pinned to `b869b58` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — 15 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — 16 modules built |
| `git -C project-nozo-externals status --short` | PASS — only pre-existing unstaged work (`src/net-events.js`, `src/object-manager.js`, `src/object-model.js`) outside Phase 18 scope |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `b869b58` | Phase 18 - Tick Scheduler + Healer Timeout Migration |

Pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## @require order in project-nozo-next.user.js (pinned to b869b58)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/player.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/tick-scheduler.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/healer.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b869b58/dist/html.min.js
```

---

## What Changed and Why

### 1. tick-scheduler.js — new module

`scheduleInTicks(delayTicks, fn, meta)` computes `fireTick = currentTick + ceil(delayTicks)`,
assigns a monotonic id, and inserts the entry into a bounded queue (max 128; oldest dropped
on overflow). Returns the id for later cancellation.

`scheduleNextTick(fn, meta)` is a convenience alias for `scheduleInTicks(1, ...)`.

`cancel(id)` splices the entry out of the queue and increments `totalCanceled`.

`runTick(currentTick)` iterates the queue and fires every entry whose `fireTick <= currentTick`.
Uses a splice-in-place loop so entries added by callbacks during the same tick are not
double-fired. Exceptions inside callbacks are caught and logged without halting the loop.
Called at the top of `Nozo.bridge.tick`, before any module reads deferred state.

State fields exposed: `pendingCount`, `lastExecutedTag`, `lastExecutedTick`,
`totalScheduled`, `totalExecuted`, `totalCanceled`.

### 2. healer.js — timeout migration

**shameDecay path** (`_addShameTimer`): was `setTimeout(fn, 14000)`. Now uses
`scheduleInTicks(280, fn, { tag: "shameDecay" })`. 280 ticks × 50 ms/tick = 14 000 ms —
exact parity with the original cooldown. Falls back to `setTimeout(fn, 14000)` when
`Nozo.tickScheduler` or `Nozo.state.tick` is absent.

**healSchedule path** (`_scheduleHeal`): was `setTimeout(fn, max(0, delayMs))`. Now uses
`scheduleInTicks(max(1, ceil(delayMs/50)), fn, { tag: "healSchedule:<reason>" })`. The
`ceil` ensures at least one tick of delay even for sub-50 ms ping values, preserving the
original ping-aware defer intent. Cancel is now two-path: clears both `pendingTimer` and
`pendingScheduledId` in `_cancelPending`.

**skin56 path** (`_doHeal`): was `setTimeout(_placeAll, 50)`. Now uses
`scheduleNextTick(_placeAll, { tag: "skin56Heal" })` — semantically identical (1 tick).

### 3. html.js — debug panel line

Added `sched: q=<pendingCount> run=<totalExecuted> last=<lastExecutedTag>` to the 2 s
auto-refresh debug panel. Gives immediate runtime confirmation that the scheduler is
wired and firing without needing the browser console.

---

## Remaining Tick-Scheduler Parity Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| `src/net-events.js` has uncommitted object-decoration work | Medium | `_itemMetaByDataIndex` + `_decorateObject` + related handler upgrades were added after Phase 17 commit but not staged. These should be reviewed and committed in Phase 19 (they also add `src/object-manager.js` and `src/object-model.js`). |
| Shame decay parity: `_SHAME_DECAY_TICKS = 280` is a fixed constant | Low | Original `addShameTimer` used `14000 ms`. At 50 ms/tick the tick equivalent is exact. If the tick interval ever changes from 50 ms the constant would drift. A dynamic `Math.round(_SHAME_DECAY_MS / 50)` alternative could be added. |
| `healingBeta` mode not ported | Medium | The full conditional heal path (`dontAutoHeal` weapon list, hit-back trigger `my.inHitBack`, shield anti path) is still absent. initData catalogs are now available for the weapon-type gate. |
| `antiSyncHealing` not ported | Low | Burst-heal mode under `my.antiSync` not yet ported. |
| `predictHeal(N)` not ported | Low | Speculative multi-item placement. Not required for basic healer. |
| Combat reload from catalog | Medium | `getWeaponRange` uses catalog range; reload times are still from `player.reloads` (server-pushed) and not cross-checked against catalog `reload` field. |
| No combat `setEnabled()` master switch | Low | Menu has no master Auto-Aim toggle. Carried from Phase 15. |
| object-manager / object-model untracked | Medium | Two new source files and their built outputs are unstaged in the externals repo from a prior session. They should be reviewed and scoped into a Phase 19 commit. |

---

## Recommended Phase 19 Scope

**Phase 19 — Object Model Commit + healingBeta + Net-Events Object Decoration**

1. **Commit pre-existing work**: review and commit `src/net-events.js` decoration changes,
   `src/object-manager.js`, and `src/object-model.js` (plus their dist files) that are
   currently unstaged from a prior session.
2. **`healingBeta` mode**: add `dontAutoHeal` weapon-list gate (using `state.itemsData`),
   hit-back trigger (`my.inHitBack` equiv), shield anti path.
3. **`antiSyncHealing`**: add burst-heal mode under a new `healingAntiSync` menu toggle.
4. **Combat reload catalog cross-check**: compare `player.reloads[wi]` against
   `state.itemsData.list[wi].reload` in `canSwing`; use the more conservative value.
5. **`combat.setEnabled()`**: add enabled gate + menu master switch for auto-aim.
