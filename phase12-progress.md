# Phase 12 — Parity Port + Cleanup

Status: COMPLETE

---

## Summary

Phase 12 addressed all six concrete parity anchors: RAF lifecycle, object list bridging,
WS dispatch hardening, net event parity, movement sanity, and startup/token stability.
A new `player.js` module (already staged before Phase 12) was committed together with the
Phase 12 net-event handler additions. All `@require` hashes bumped to `fadb5f6`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-next.user.js` | RAF → passthrough proxy; object list continuous sync; WS string/drop logging; token poll 50 ms; findServer res.ok guard; playerModel in externals check; phase label; @require hashes → fadb5f6 |
| `project-nozo-externals/src/player.js` | New module — Nozo.playerModel (ensurePlayer, markDead, applyTupleUpdate, createPlayerBase) |
| `project-nozo-externals/dist/player.min.js` | Built output for player.js |
| `project-nozo-externals/src/net-events.js` | Add handlers A/P/S/T/U/V; C/D/a upgraded to use Nozo.playerModel; E upgraded to use markDead; registerMany updated |
| `project-nozo-externals/dist/net-events.min.js` | Rebuilt |
| `project-nozo-externals/dist/*.min.js` (all others) | Rebuilt (11 total) |
| `project-nozo-externals/package.json` | Added player.js to check script |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — 12 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — 12 modules built |
| `git -C project-nozo-externals status --short` | PASS — clean after commit |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `fadb5f6` | Phase 12 - Parity Port + Cleanup |

Pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## What Changed and Why

### 1. RAF override → passthrough

`bridge.overrideRaf()` previously replaced RAF with a no-op `() => 0` that blocked all
native game RAF callbacks. Changed to a named proxy (`nozoRafProxy`) that forwards calls to
the captured native RAF. This allows the game's own RAF-based logic (game state updates,
animations) to continue running while Nozo's render cycle is still driven independently by
`setInterval` in `startTickLoop`. Result: no native game flow breakage, Nozo render stays
active.

### 2. Object list continuous sync

`bridge.normalizeObjectLists()` previously used a one-way migration: it assigned
`liztobj = closeObjects` only once, on the first tick where `liztobj` was absent. If the
game later replaced `closeObjects` with a new array reference, `liztobj` would point to a
stale array. Changed to sync `liztobj` from `closeObjects` on every tick whenever
`closeObjects` is an array. `liztobj` remains canonical for all downstream consumers
(traps, autoBreak, movement).

### 3. WS dispatch — string handling + drop logging

`onMessage` previously silently returned for any non-binary message type. Added:
- String path: `"io-init"` dispatches to `netEvents.dispatch("io-init", [])`;
  other strings are logged as `ws:msg:string-drop` with a preview.
- Unhandled binary type: logged as `ws:msg:unhandled-type`.
- Malformed parsed packet (not array or length < 2): logged as `ws:msg:malformed`.
No more silent drops for aim/combat-relevant events.

### 4. Net event parity — new handlers

Previously registered: C, a, H, Q, R, G, 7, N, O (9 handlers).
Now registered: A, C, D, E, a, G, H, N, O, P, Q, R, S, T, U, V, 7 (17 handlers).

New handlers:
- **A** (`_handlerInitData`): Stores initial game config in `state.initData`.
- **D** (`_handlerD`): Upserts player by id/sid with full data tuple; routes through
  `Nozo.playerModel.ensurePlayer` when available.
- **E** (`_handlerE`): Marks player dead via `Nozo.playerModel.markDead` or field flags;
  rebuilds near/enemy.
- **P** (`_handlerP`): Victim marked dead on kill event; rebuilds near/enemy so aim
  resolver doesn't target dead players.
- **S** (`_handlerS`): Raw item count args captured as `state.itemCounts` and forwarded
  to `player.itemCounts`.
- **T** (`_handlerT`): Age index and optional XP/maxXp forwarded to player and state.
- **U** (`_handlerU`): Upgrade options captured as `state.upgradeOptions` and forwarded to
  player.
- **V** (`_handlerV`): Held item IDs captured as `state.heldItems` and forwarded to player.

Upgraded C/a to initialize players/near/enemy arrays and use `playerModel.applyTupleUpdate`
for the 13-field tuple update.

### 5. player.js module

New `Nozo.playerModel` module provides:
- `createPlayerBase(sid)` — default player record with all known fields zeroed.
- `ensurePlayer(state, sid)` — upsert; returns existing record or creates a new one.
- `markDead(state, sid)` — sets `alive/active/visible = false`.
- `applyTupleUpdate(player, tuple, offset)` — applies the 13-field `a`-packet layout.

This module must load before `net-events.min.js` in the `@require` order (it already does).

### 6. Startup / token / server context

- `getToken()` spin loop changed from `setTimeout(0)` (effectively 4 ms browser minimum)
  to `setTimeout(50)` to reduce CPU waste during altcha verification wait.
- `findServer()` now checks `res.ok` before calling `.json()`. Non-OK responses are logged
  as `bootstrap:findServer:error` and return `null` cleanly instead of throwing.

### 7. Movement parity

No changes needed. The `step()` function, `canMove()` gating, and bridge tick integration
all align with the current design. The `direct` strategy is the only active pathfinder;
dead path modes remain excluded as required.

---

## @require order in project-nozo-next.user.js (pinned to fadb5f6)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/player.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@fadb5f6/dist/html.min.js
```

---

## Remaining Risks and Next Recommended Phase

### Open parity risks

| Risk | Severity | Notes |
|------|----------|-------|
| T/U/V/S handler arg layout | Medium | Exact moomoo.io packet layout not verified against live traffic; handlers use `arguments` capture so they store whatever arrives, but field interpretation (e.g. `player.age = ageIndex`) may be off if the server sends a different layout than assumed |
| RAF passthrough + game render | Low | Native game RAF loop now runs; if the game draws to the same canvas Nozo overlays, draw-order conflicts could appear (Nozo overlay is on top, so usually fine) |
| playerModel.markDead vs splice | Low | Dead players remain in `state.players` (marked dead, not removed). Combat aim resolver filters via `visible/active`, but any consumer that assumes all entries in `players` are alive needs updating |
| `_handlerD` expects array data | Low | `_handlerD(data, isYou)` assumes `data` is an array of at least 2 elements. If the server encodes D as a flat spread (not wrapped array), the `Array.isArray(data)` guard drops the event silently |
| No projectile/AI tracking | Low | X/Y (addProjectile/remProjectile), I/J (loadAI/animateAI) still unhandled; not combat-critical for current scope |

### Next recommended phase

**Phase 13 — Live verification + handler calibration**

Goals:
1. Capture live packet traffic in-game (via `Nozo.debug.logs`) and verify T/U/V/S/D arg
   layout against actual server output.
2. Adjust handler signatures if the real data layout differs from current assumptions.
3. Add X/Y projectile tracking if aim resolver needs projectile avoidance.
4. Consider removing dead players from `state.players` after a grace period (or provide a
   `getAlivePlayers()` helper) to prevent stale near/enemy data accumulation.
5. Pin a verified working hash once live testing confirms stability.
