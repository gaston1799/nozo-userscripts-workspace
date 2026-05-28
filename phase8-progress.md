# Phase 8 — Net Events

Status: COMPLETE

---

## Summary

Phase 8 evolved `net-events.js` from a bare dispatcher skeleton into a full
websocket event router with auto-registered default handlers that write to
`Nozo.state.*` only.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/net-events.js` | Major revision — added `register`, `registerMany`; callable facade (`Nozo.netEvents(type,data)` + `.dispatch/.setHandlers/.register/.registerMany`); default handlers for C, a, H, Q, R, G, 7, N, O auto-registered at module init; internal helpers `_ensureArrays`, `_rebuildNearEnemy`, `_removeObjectBySid` |
| `project-nozo-externals/dist/net-events.min.js` | Rebuilt (11688b → 11656b) |
| `project-nozo-externals/dist/*.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/README.md` | Added full `Nozo.netEvents` API reference section including registration methods, dispatch contract, default handler table, player/gameObject field formats, and notes |
| `project-nozo-next.user.js` | Simplified `bridge.bindNetEventHandlers` to a no-op flag-setter (handlers now live in net-events module); removed stale `Nozo.netEvents = function(){…}` stub that was shadowing the module; updated phase label to "Phase 8 - Net Events"; bumped all `@require` commit hashes to `35e601d` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check src/net-events.js` | PASS |
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — all 8 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — net-events.js → dist/net-events.min.js (11688b → 11656b) |
| `node --check dist/net-events.min.js` | PASS |
| `git -C project-nozo-externals status --short` | PASS — clean after final commit |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `35e601d` | Phase 8 - Net Events dispatcher upgrade |
| `962dc64` | docs: add net-events API reference to README |

Both commits pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## API Surface After Phase 8

| API | Status |
|-----|--------|
| `Nozo.netEvents(type, data[, ctx])` | ✓ new — callable facade dispatches directly |
| `Nozo.netEvents.dispatch(type, data, ctx)` | ✓ preserved |
| `Nozo.netEvents.setHandlers(overrides)` | ✓ preserved — guarded, only overrides existing keys |
| `Nozo.netEvents.register(type, fn)` | ✓ new — unrestricted single-handler registration |
| `Nozo.netEvents.registerMany(map)` | ✓ new — unrestricted bulk registration; null unregisters |
| `Nozo.netEvents.handlers` | ✓ preserved — live reference to the global router map |
| `Nozo.state.socketID` | ✓ set by `io-init` (unchanged) |
| `Nozo.state.mySid` | ✓ new — set by C / setupGame default handler |
| `Nozo.state.playersRaw` | ✓ new — raw flat server array from `a` tick |
| `Nozo.state.players[]` | ✓ new — merged player snapshot objects (13-field stride) |
| `Nozo.state.player` | ✓ populated when `state.mySid` is set |
| `Nozo.state.near[]` | ✓ rebuilt each `a` tick |
| `Nozo.state.enemy[]` | ✓ rebuilt each `a` tick |
| `Nozo.state.gameObjects[]` | ✓ new — upserted by H, removed by Q/R |
| `Nozo.state.leaderboard` | ✓ new — updated by G |
| `Nozo.state.minimap` | ✓ new — updated by 7 |
| `Nozo.state.lastPlayerValueUpdateAt` | ✓ new — timestamp from N handler |
| `Nozo.state.lastHealthUpdateAt` | ✓ new — timestamp from O handler |

---

## @require order in project-nozo-next.user.js (pinned to 35e601d)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@35e601d/dist/autobreak.min.js
```

---

## Design Decisions

- **Callable facade**: `Nozo.netEvents` is now a function with `.dispatch/.setHandlers/.register/.registerMany/.handlers` as properties. Calling `Nozo.netEvents(type, data)` is equivalent to `Nozo.netEvents.dispatch(type, data)`. This preserves the user-local `Nozo.netEvents(...)` call pattern without breaking the WS hook's `Nozo.netEvents.dispatch(...)` check.
- **One global router**: The `handlers` map is created once at module init and reused for every message. No per-message table recreation.
- **`register`/`registerMany` are unrestricted** (any key); `setHandlers` is the legacy guarded API (only existing keys).
- **Merging player records** in `_handlerA`: existing player objects are updated in-place rather than replaced each tick so that health data written by the `O` handler survives across ticks.
- **`R` (killObjects) dual interpretation**: accepts either a numeric `ownerSid` (legacy: remove all objects owned by that player) or an array of individual object SIDs, handling both server representations safely.
- **`_handlerN` prototype guard**: rejects `__proto__`, `constructor`, `prototype` as index to prevent prototype poisoning.
- **`C` (setupGame) minimal handler**: not in the required list but included because `_handlerA` needs `state.mySid` to identify self-player; the handler writes only `state.mySid`.
- **bridge.bindNetEventHandlers** simplified to a one-liner flag-setter; the handler implementations are now owned by net-events.js.

---

## Limitations / Next Phase Notes

- `state.player` is not populated until the `C` (setupGame) packet fires and sets `state.mySid`. Until then, `state.near`/`state.enemy` are empty arrays.
- Players not seen in the current `a` tick are marked `visible: false` but not removed from `state.players` (removal is the job of the `E`/removePlayer handler, not yet implemented).
- Game objects in `state.gameObjects` are flat snapshots without the full `objectManager` capabilities (no `.trap`, `.getScale()`, `.isTeamObject()` methods). The traps/autoBreak modules compensate by checking `dataIndex` directly.

---

## Next Recommended Phase

**Phase 9 — Render/UI**

- Port render overlays.
- Port `Html` menu.
- Preserve `localStorage` and `GM_*` keys.
