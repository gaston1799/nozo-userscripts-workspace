# Phase 17 — initData Parsing + Shame Tracking + Healer Beta Base

Status: COMPLETE

---

## Summary

Phase 17 upgraded the `A` (setInitData) handler to parse the server's items and ages
catalogs into structured state keys (`state.itemsData`, `state.agesData`), enabling live
food-heal amounts and catalog-backed weapon ranges. Shame tracking was wired into the
player model and healer: every successful food-placement now increments `player.shameCount`
and schedules a 14 s auto-decrement via `_addShameTimer`. `weaponCode` was added to the
player base model and synced from every `a`-packet update so `_reSelectWeapon` reliably
re-equips the correct item after healing. The combat module's `getWeaponRange` now consults
the parsed catalog before falling back to the static table. A read-only debug info panel
(initData readiness, healer state, shame count) with 2 s auto-refresh was added to the
html menu's Debug section. All checks pass. Committed as `b51b1b2` and pushed to `main`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/net-events.js` | Added `_parseInitDataItems` helper; upgraded `_handlerInitData` to populate `state.itemsData` (parsed items list) and `state.agesData` (raw ages list) while preserving `state.initData` raw payload; sets `state.initDataParsed` flag |
| `project-nozo-externals/src/player.js` | Added `weaponCode: null` and `shameCount: 0` to `createPlayerBase`; added `player.weaponCode = tuple[i+5]` sync in `applyTupleUpdate` |
| `project-nozo-externals/src/healer.js` | Added `_SHAME_DECAY_MS = 14000` constant; added `_addShameTimer(count)` function; called `_addShameTimer(count)` inside `_placeAll` so every heal run increments and later decrements the player's shameCount |
| `project-nozo-externals/src/combat.js` | Updated `getWeaponRange` to consult `state.itemsData.list[weaponIndex].range` before static fallback table |
| `project-nozo-externals/src/html.js` | Added `_debugInfoEl` and `_debugInterval` to state; added `_refreshDebugInfo()` function; added `<pre>` debug panel in Debug section; start/stop 2 s interval in `mount`/`unmount` |
| `project-nozo-externals/dist/*.min.js` (all 13) | Rebuilt (obfuscator re-seed) |
| `project-nozo-next.user.js` | Phase label → Phase 17; pinned all `@require` hashes to `b51b1b2` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — 14 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — 13 modules built |
| `git -C project-nozo-externals status --short` | PASS — clean after commit |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `b51b1b2` | Phase 17 - initData Parsing + Shame Tracking + Healer Beta Base |

Pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## What Changed and Why

### 1. net-events.js — _handlerInitData upgrade + _parseInitDataItems

`_parseInitDataItems(raw)` iterates the items array from `args[0]` and normalizes each
entry into `{ id, name, type, healing, range, reload, damage }`. Items that are not plain
objects are stored as `{ id }` placeholders (silent fallback for packed-array formats).

`_handlerInitData` now:
- Saves raw args to `state.initData` (backward compat)
- Calls `_parseInitDataItems(args[0])` → stores result at `state.itemsData = { raw, list, readyAt }`
- Stores `args[1]` at `state.agesData = { raw, list, readyAt }` when present
- Sets `state.initDataParsed = true` once at least one catalog is populated
- Logs `itemsCount` and `agesCount` for runtime verification

**Downstream effect**: `healer._getFoodHealAmount` now finds real heal values when
`state.itemsData.list[foodId].healing` is populated, eliminating the `_DEFAULT_FOOD_HEAL = 20` fallback in live sessions.

### 2. player.js — weaponCode + shameCount

`weaponCode: null` — the weapon slot index for `sendSelectItem` re-select after food
placement. Synced from the `a`-packet's weaponIndex field in `applyTupleUpdate`, so it
stays current without extra event wiring.

`shameCount: 0` — client-side consecutive heal counter for the healer shame gate. Starts
at 0 and is managed by `healer._addShameTimer`. Having it in the player base ensures the
field exists at player creation, preventing `undefined` reads in the healer.

### 3. healer.js — shame tracking

`_addShameTimer(count)` captures the player reference at call time (safe across respawns),
increments `player.shameCount` by `count`, then schedules a `setTimeout(_SHAME_DECAY_MS)`
that decrements by the same amount. This mirrors the original `addShameTimer()` behavior
from moomoo.js without importing the game's tick system.

`_placeAll` (inside `_doHeal`) calls `_addShameTimer(count)` after placing food and
re-selecting the weapon — covers both the immediate and skin-56-deferred heal paths since
`_placeAll` is the single exit point for actual packet sends.

### 4. combat.js — catalog-backed weapon range

`getWeaponRange(weaponIndex)` now checks `state.itemsData.list[weaponIndex].range` first.
If the catalog has a positive numeric range for the weapon index, it is used. Otherwise
the existing static `_weaponRanges` table is consulted, with a 35-unit default as final
fallback. This is a non-breaking upgrade: behavior is identical when initData has not yet
arrived or does not carry range fields.

### 5. html.js — debug info panel

`_refreshDebugInfo()` reads `Nozo.state` and `Nozo.healer.state` to build a 3-line
snapshot:
```
initData: ready | items:48 ages:8
healer: on | heals:3 shame:2
lastHeal: 5.2s ago
```
The `<pre>` element is created in `mount()`, inserted into the Debug section, and
updated immediately on mount then every 2 s via `setInterval`. The interval handle is
stored at `state._debugInterval` and cleared in `unmount()` to prevent leaks. This gives
immediate runtime verification that initData parsing and shame tracking are working
without needing the browser console.

---

## @require order in project-nozo-next.user.js (pinned to b51b1b2)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/player.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/healer.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@b51b1b2/dist/html.min.js
```

---

## Remaining Parity Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| initData item structure is protocol-dependent | Medium | Parser handles plain-object items (with `healing`/`range`/etc. properties). If the actual server sends packed arrays instead of objects, `_parseInitDataItems` stores `{ id }` placeholders and the healer/combat fallbacks remain active. Verify `state.itemsData.list[0].healing` at runtime. |
| `healingBeta` mode not ported | Medium | The full conditional heal path (per-weapon `dontAutoHeal` list, hit-back trigger, shield anti paths) is still absent. Now that itemsData parsing is in place, `healingBeta` can be added in Phase 18. |
| `antiSyncHealing` not ported | Low | Burst heal mode under `my.antiSync` not yet ported. |
| `predictHeal(N)` not ported | Low | Speculative multi-item placement. Not required for basic healer. |
| `healingBeta` weapon-aware skip list | Medium | `dontAutoHeal` list filtering requires initData weapon types — now feasible. |
| Combat reload times from catalog | Medium | `getWeaponRange` uses catalog range; reload times are still taken from `player.reloads` (server-pushed) and not cross-checked against catalog `reload` field. Could be added in Phase 18. |
| No combat `setEnabled()` master switch | Low | Menu has no master Auto-Aim toggle. Carried from Phase 15 gap list. |

---

## Recommended Phase 18 Scope

**Phase 18 — Healer Beta + Combat Reload Catalog + Parity Audit**

1. **`healingBeta` mode**: add `dontAutoHeal` weapon list gate, hit-back trigger
   (`my.inHitBack`), and shield anti path using the now-available itemsData catalogs.
2. **Combat reload catalog**: cross-check `player.reloads[weaponIndex]` against
   `state.itemsData.list[weaponIndex].reload` — use whichever is more conservative.
3. **`combat.setEnabled()`**: add enabled gate + menu master switch for auto-aim.
4. **`antiSyncHealing`**: add burst-heal mode under a new `healingAntiSync` menu toggle.
5. **Runtime initData verification**: add a net-events test helper
   `Nozo.netEvents.inspectInitData()` that prints a compact catalog summary to console.
