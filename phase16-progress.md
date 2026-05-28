# Phase 16 — Healer Port (updatePlayers Flow)

Status: COMPLETE

---

## Summary

Phase 16 ported the core healer behavior from `moomoo.js` into a new
`project-nozo-externals/src/healer.js` module. The module tracks health
deltas, evaluates shame-gate conditions and ping-aware timing, and triggers
food placement via two new centralized packet helpers (`sendSelectItem`,
`sendPlace`). Health events are fed from the `O` net-event handler; the
shame-clear transition is detected inside the `a`-packet handler. A Healer
toggle was added to the html.js Combat section and wired to `Nozo.healer.setEnabled`.
All checks pass. Committed as `924e257` and pushed to `main`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/healer.js` | New — healer module: `_healthBased`, `_isInDanger`, `_doHeal`, `requestHeal`, `onHealthUpdate`, `onShameClear`, `setEnabled`, state, history |
| `project-nozo-externals/src/packet.js` | Added `sendSelectItem` (z packet) and `sendPlace` (F packet) |
| `project-nozo-externals/src/net-events.js` | Extended `_handlerO` to call `Nozo.healer.onHealthUpdate` on local player damage; added `_oldSkinIdx` + shame-clear detection in `_handlerA` |
| `project-nozo-externals/src/html.js` | Added `"healer.enabled": true` default, `_applyHealer` callback, Healer row in Combat section, `_applyHealer` called on mount |
| `project-nozo-externals/package.json` | Added `src/healer.js` to check script (now 14 files) |
| `project-nozo-externals/dist/healer.min.js` | New built artifact (11476b → 12214b) |
| `project-nozo-externals/dist/*.min.js` (all others) | Rebuilt (obfuscator re-seed) |
| `project-nozo-next.user.js` | Phase label → Phase 16; added `@require` for `healer.min.js`; pinned all hashes to `924e257`; added healer to tick loop and externals check |

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
| `924e257` | Phase 16 - Healer Port (updatePlayers Flow) |

Pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## What Changed and Why

### 1. healer.js — new module

The module exposes a stable API matching the Phase 16 spec:

| Export | Role |
|--------|------|
| `setEnabled(flag)` | Enable/disable; cancels pending timer on disable |
| `onTick(ctx)` | Bridge tick hook (reserved; no polling heal) |
| `onHealthUpdate(sid, newHealth, oldHealth)` | Called by net-events O handler; evaluates damage and routes to fast or deferred heal |
| `onShameClear()` | Called when self-player skin transitions from 45 → other; triggers immediate requestHeal |
| `requestHeal(reason, opts)` | Two-phase: first call schedules a ping-aware delay (`pingTime × 1.5 ms`); timer callback re-evaluates and calls `_doHeal` |
| `getHistory()` | Bounded event log (max 64 entries) |
| `getDebugState()` | Snapshot of live state |

**`_healthBased(player)`** — mirrors `healthBased()` in original: returns
`Math.ceil((100 - health) / healAmt)`, skips skin 45/56, reads live `initData`
heal amount when available, falls back to 20.

**`_isInDanger(player)`** — checks `traps.inTrap` and enemy distance ≤ 200 units.

**`_doHeal(count, angle, reason)`** — uses `Nozo.packet.sendSelectItem` +
`Nozo.packet.sendPlace`, then re-selects weapon. Skin 56 branch defers via
50 ms `setTimeout` (mirrors original `game.tickBase(..., 1)` delay).

**Shame gate** — if `shameCount >= 5` and not in danger, uses a timeout-only
slow path (`140 - pingTime` ms). Otherwise takes the immediate ping-delay path.

**State** persisted at `Nozo.state.healer`.

### 2. packet.js — sendSelectItem / sendPlace

`sendSelectItem(index, isPlace)` sends packet `"z"` — mirrors `selectToBuild` /
`selectWeapon` in original code.

`sendPlace(type, angle)` sends packet `"F"` — mirrors `sendAtck(1, rad)` in
original code.

Both methods record to the packet history and log via `Nozo.log`.

### 3. net-events.js — O handler + A handler

**`_handlerO`**: after updating `p.oldHealth` / `p.health`, checks if the
updated SID matches `s.mySid` and calls `Nozo.healer.onHealthUpdate`. Guard
ensures other players' health changes are ignored by the healer.

**`_handlerA`**: saves `_oldSkinIdx = p.skinIndex` before calling
`model.applyTupleUpdate`, then checks `_isSelf && _oldSkinIdx === 45 &&
p.skinIndex !== 45` after the update. When true, calls
`Nozo.healer.onShameClear()`. This mirrors the skin-transition healer call at
moomoo.js ~30418-30423.

### 4. html.js — Healer toggle

`"healer.enabled": true` default added. `_applyHealer(val)` wires to
`Nozo.healer.setEnabled`. Row added inside the Combat section. Persisted state
applied on mount alongside the other module toggles.

### 5. project-nozo-next.user.js

`Nozo.healer.onTick(ctx)` added to the bridge tick loop after autoBreak.scan
and before movement.step. `@require` entry added for `healer.min.js`.
Externals presence check now includes `"Nozo.healer"`.

---

## @require order in project-nozo-next.user.js (pinned to 924e257)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/player.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/healer.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@924e257/dist/html.min.js
```

---

## Remaining Healer Parity Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| initData not parsed → food heal amount defaults to 20 | Medium | `_getFoodHealAmount` reads `state.itemsData.list` if present but initData parser not yet wired. Phase 17 should parse A (setInitData) and populate `state.itemsData`. |
| `shameCount` not tracked by player model | Medium | Healer reads `player.shameCount` which is undefined until something writes it. Original tracks this via `addShameTimer()`. Phase 17 should wire shameCount management into net-events or a dedicated shame-tracking module. |
| `antiSyncHealing` not ported | Low | Original has a burst heal mode under `my.antiSync`. Not yet ported; Phase 17 can add if needed. |
| `predictHeal` not ported | Low | `predictHeal(N)` places N items speculatively. Not yet ported. |
| `healer1()` side-return not ported | Low | Original `healer1()` returns cookie count while placing. Not needed for the basic healer; relevant for advanced use cases. |
| `skinIndex === 56` tick-base delay | Low | Nozo uses a 50 ms `setTimeout` as a proxy for `game.tickBase(..., 1)`. Exact timing depends on live tick rate; verify at runtime. |
| No `healingBeta` mode | Medium | Full `healingBeta` conditional (hit-back, per-weapon rules, dontAutoHeal list) is not ported — only the core shame-gate path is. Phase 17 can add beta logic once itemsData parsing lands. |
| Weapon re-select uses `weaponCode` which may be absent | Low | `weaponCode` is not yet tracked in the Nozo player model. Fallback uses `weapons[0]`. Phase 17 should add `weaponCode` to playerModel. |

---

## Recommended Phase 17 Scope

**Phase 17 — initData Parsing + Shame Tracking + Healer Beta**

1. **Parse A (setInitData)**: decode `state.initData` args to populate
   `state.itemsData` (weapons catalog, items list with `.healing`, ages table).
   This unlocks real food heal amounts and weapon reload times.
2. **Shame counter**: add `shameCount` tracking to net-events (N handler for
   shame-related fields) so healer's shame gate is accurate.
3. **`weaponCode` on playerModel**: track the actively held weapon code so
   `_reSelectWeapon` re-equips the correct item after food placement.
4. **Healer beta flags**: add `healingBeta` mode gate with per-weapon heal
   routing (dontAutoHeal list, hit-back trigger, shield anti paths) once
   itemsData is available.
5. **combat.setEnabled()**: add enabled gate to combat.js so the menu Combat
   section can expose an auto-aim master switch (carried over from Phase 15 gaps).
