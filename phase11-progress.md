# Phase 11 — Stability/Cleanup

Status: COMPLETE

---

## Summary

Phase 11 hardened WebSocket lifecycle, tick/render lifecycle, and HTML lifecycle,
removed one dead stub (`sendAttackPacketUnsafe`), cleaned up one stale comment in
`combat.js`, and updated the README to document all lifecycle expectations and add
the missing `render.min.js`/`html.min.js` entries.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-next.user.js` | Added `_wsRef`/`_wsOnMessage` tracking on bridge; hardened `HookedWebSocket` (stale listener removal before reconnect, `close` handler that nulls WS state only if still active); removed `bindNetEventHandlers()` call from `bridge.tick()` (was a no-op on every tick; now called once in `start()`); added render canvas re-attach check in `bridge.tick()` (retries every 20 ticks while `render.state.attached` is false); added `stopTickLoop()`; bumped all `@require` hashes to `6af1bc5`; updated phase label to "Phase 11 - Stability/Cleanup" |
| `project-nozo-externals/src/render.js` | Added `_resizeListener` private var; `_createOverlay` stores the resize listener; `detach()` removes it — prevents listener leak across canvas replacements |
| `project-nozo-externals/src/html.js` | `mount()` now removes any stale `#nozoNextHtmlPanel` DOM element before inserting the new one, preventing orphaned panels after script re-injection |
| `project-nozo-externals/src/packet.js` | Removed `sendAttackPacketUnsafe` dead stub (was reserved in Phase 4, never called by any code path) |
| `project-nozo-externals/src/combat.js` | Updated stale comment that referenced the removed stub |
| `project-nozo-externals/dist/*.min.js` | Rebuilt (all 11 modules) |
| `project-nozo-externals/README.md` | Added `render.min.js` and `html.min.js` to `@require` order, module table, and globals list; added lifecycle section documenting WS, tick loop, render, and HTML panel expectations; pinned example `@require` URLs to `6af1bc5` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — all 11 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS |
| `git -C project-nozo-externals status --short` | PASS — clean after commits |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `6af1bc5` | Phase 11 - Stability/Cleanup |
| `8043d5c` | Phase 11 - docs: lifecycle expectations and render/html in require order |

Both commits pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## What Changed and Why

### WebSocket lifecycle

`HookedWebSocket` now tracks `Nozo.bridge._wsRef` (the current WS object) and
`Nozo.bridge._wsOnMessage` (its message handler). On each new connection the old
handler is removed before the new one is attached, preventing double-dispatch if a
reconnect races with in-flight messages. A `close` listener nulls `Nozo.state.WS`
and the packet socket when the connection closes — but only if this WS is still the
active one, so a reconnect that arrives first is not overwritten.

### Tick loop

`bindNetEventHandlers()` was called on every tick (every 50 ms) even though it
no-ops after the first invocation. Removed from `bridge.tick()` — it is called once
in `Nozo.start()` before `startTickLoop()`. Added `stopTickLoop()` for clean shutdown.

### Render re-attach

`bridge.tick()` checks `render.state.attached` every 20 ticks (~1 s). If the render
module is not attached (canvas not yet in DOM, or replaced), it re-calls
`Nozo.render.attach(gameCanvas || null)`. The resize listener added by `_createOverlay`
is now tracked in `_resizeListener` and removed by `detach()`.

### HTML panel

`html.mount()` checks for a stale `#nozoNextHtmlPanel` element in the DOM and removes
it before inserting the new panel. Handles script re-injection without leaving orphan
elements.

### Dead stub removal

`sendAttackPacketUnsafe` was a reserved no-op stub added in Phase 4 ("reserved for
Phase 6") that was never called by any code path. Removed. The `combat.js` comment
referencing it was updated.

---

## @require order in project-nozo-next.user.js (pinned to 6af1bc5)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@6af1bc5/dist/html.min.js
```
