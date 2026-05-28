# Phase 24 Progress

Status: COMPLETE

## Summary of Refactor Changes

### 1. `AutoBreaker` constructor receives `ctx`
Added `ctx` parameter to the `AutoBreaker` constructor; stored as `this.ctx = ctx || null`.
No module-scope globals are captured by any `AutoBreaker` method.

### 2. All `AutoBreaker` methods ported to `this.ctx`
Each method now reads context from `this.ctx` (or a local destructure of it) instead of
closing over module-scope variables:

| Method | Old globals closed over | New source |
|---|---|---|
| `objectsHit` | `nearObjs`, `player`, `items` | `ctx.nearObjs`, `ctx.player`, `ctx.items` |
| `getFilteredPriority` | `items`, `player` | `ctx.items`, `ctx.player` |
| `getPriorityTarget` | `player` | `this.ctx.player` (destructured) |
| `calculateAim` | `enemy`, `near` | `this.ctx.enemy`, `this.ctx.near` (destructured) |
| `processTargets` | `player`, `traps`, `objectManager` | `this.ctx.{player,traps,objectManager}` (destructured) |
| `useHammer` | `player`, `items`, `_things.nearSpikeInfo` | `this.ctx.{player,items}`, `this.ctx.nearSpikeInfo` |

### 3. `PlayerRuntime` constructor reordered
`this.autoBreaker = new AutoBreaker()` was removed from its original position (before
`legacyCtx` initialization) and replaced by `this.autoBreaker = new AutoBreaker(this.legacyCtx)`
placed immediately after the `legacyCtx` object literal closes (line ~4319).
`legacyCtx` is the same object mutated in-place each tick by `syncLegacyCombatRefs`, so
`autoBreaker.ctx` automatically receives live values without any per-tick update call.

### 4. `syncLegacyCombatRefs` TODO updated
The AutoBreaker-specific TODO comment was replaced with an accurate statement of the classes
that still require the module-scope mirrors:

```
// TODO: Traps/Traps_ bodies close over player, items, nearObjs, enemy, near, traps, objectManager,
//       config, configs, canplace, place, gameObjects from module scope.
```

---

## Exact AutoBreaker Global Aliases Removed

AutoBreaker no longer closes over any of these:
- `player`
- `items`
- `nearObjs`
- `enemy`
- `near`
- `traps`
- `objectManager`
- `_things` (was `_things.nearSpikeInfo`; now `this.ctx.nearSpikeInfo`)

---

## Global Aliases Still Required by Traps / Traps_ / Instakill

The following module-scope mirrors in `syncLegacyCombatRefs` must remain:

| Symbol | Required by |
|---|---|
| `player` | `Traps` (all methods), `Traps_` (all methods), `Instakill` (many methods) |
| `items` | `Traps` (notFast, shouldSpikeTickPlace, testCanPlace), `Traps_`, `Instakill.getBaseDamages` |
| `nearObjs` | `Traps` (radObjs filter, line ~1909, 1942), `Traps_` (radObjs filter, lines ~2512, 2596, 2692, 2726) |
| `enemy` | `Traps` (autoPlace guard, lines ~1762, 1895, 1970, 2105), `Traps_` (lines ~2316, 2365, 2497, 2677, 2754) |
| `near` | `Traps` (shouldSpikeTickPlace, getKbiSpikePlan), `Instakill.changeType` |
| `traps` | `Traps` (trappedNow check, line ~2053), `Traps_` (lines ~2318, 2325) |
| `_things` | `Instakill` (entire class body) |
| `config` | `Traps.radCalc` (mapScale/riverWidth), `Instakill.getBaseDamages` |
| `configs` | `Traps` (shouldSpikeTickPlace, getKbiSpikePlan), `Traps_` internals |
| `gameObjects` | `Traps.testCanPlace`, `Instakill.hammerInsta`, `Instakill.hammerInsta2` |
| `game` | `Instakill` (tickBase calls throughout) |
| `instaC` | `Traps` (autoPlace guards), `Instakill.changeType1` |
| `my` | `Instakill` (autoAim flag throughout) |
| `buyEquip` | `Instakill` (direct calls) |
| `selectWeapon` | `Instakill` (direct calls) |
| `sendAutoGather` | `Instakill` (direct calls) |
| `place` | `Traps.doPlace`, Instakill helpers |
| `checkPlace` | `Instakill.hammerInsta` |
| `canplace` | `Traps.getKbiSpikePlan`, `Instakill.hammerInsta2` |
| `chat` | `Instakill` helpers |
| `stop` | `Instakill.changeType1` |
| `_random` | `Instakill.changeType` |
| `pingTime` | `Instakill.changeType1`, `Instakill.hammerInsta` |
| `io` | `Instakill.spikeTickType` |
| `importantDirs` | `Instakill.changeType1` |
| `tmpObj` | `Instakill.spikeTickType` |
| `findObjectBySid` | `CachedMapResource` bridge |
| `useWasd` | Instakill/movement helpers |

---

## Validation Command Output

```
node --check project-nozo-single.user.js
(no output — exit code 0)
```

Syntax check: PASS.
