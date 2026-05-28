# Phase 4 — Packet/Socket

Status: COMPLETE

---

## Summary

Phase 4 created the packet/socket foundation module for NozoNext.

- `src/packet.js` added to externals: `NozoNext.packet` API exposing socket management, packet encoding, and common send helpers
- `dist/packet.min.js` built and committed
- `package.json` `check` script expanded to cover `src/packet.js`
- `project-nozo-next.user.js` updated: new `@require`, `Nozo.packet` check in `start()`, phase label bumped to "Phase 4 - Packet/Socket"
- `README.md` updated with new CDN URL, load-order table, and globals list
- All `@require` lines pinned to commit `9e53c20`

`moomoo.js` — not touched.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/packet.js` | Created — `NozoNext.packet` API: `setSocket`, `getSocket`, `encodePacket`, `sendPacket`, `sendDirection`, `sendMove`, `sendGather`, `sendAttackPacketUnsafe` stub, `getHistory`; ring-buffer debug history uses `Nozo.constants.MAX_LOG` |
| `project-nozo-externals/dist/packet.min.js` | Created — obfuscated+minified build of `src/packet.js` (2545b → ~3186b) |
| `project-nozo-externals/dist/constants.min.js` | Rebuilt (same source, refreshed obfuscator output) |
| `project-nozo-externals/dist/utils.min.js` | Rebuilt (same source, refreshed obfuscator output) |
| `project-nozo-externals/package.json` | Added `src/packet.js` to `check` script |
| `project-nozo-externals/README.md` | Added `packet.min.js` to `@require` order, project modules table, and globals list |
| `project-nozo-next.user.js` | Added `@require` for `packet.min.js`; added `Nozo.packet` to `start()` externals check; updated phase label; bumped all commit hashes to `9e53c20` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `node --check src/packet.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS |
| `npm --prefix project-nozo-externals run build` | PASS — `packet.js → dist/packet.min.js`, `constants.js → dist/constants.min.js`, `utils.js → dist/utils.min.js` |
| `node --check dist/packet.min.js` | PASS |
| `git -C project-nozo-externals status --short` | PASS — clean |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `8951124` | Phase 4 - Packet/Socket foundation |
| `8320f85` | docs: add packet.min.js to README load order and module list |
| `9e53c20` | build: refresh dist outputs after Phase 4 checks |

All three commits pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## API Surface After Phase 4

| API | Status |
|-----|--------|
| `Nozo.version` | ✓ |
| `Nozo.root` | ✓ |
| `Nozo.state` | ✓ |
| `Nozo.modules` | ✓ |
| `Nozo.debug` | ✓ |
| `Nozo.log(type, payload)` | ✓ |
| `Nozo.register(name, factory)` | ✓ |
| `Nozo.getState(key, fallback)` | ✓ |
| `Nozo.setState(key, value)` | ✓ |
| `Nozo.compat` (NozoNext / UTILS / createUtils) | ✓ |
| `Nozo.Utils` (class) | ✓ via utils.min.js |
| `Nozo.createUtils()` | ✓ via utils.min.js |
| `Nozo.constants` | ✓ via constants.min.js |
| `Nozo.packet.setSocket(ws)` | ✓ new — stores socket in `Nozo.state.WS` |
| `Nozo.packet.getSocket()` | ✓ new — returns `Nozo.state.WS` or null |
| `Nozo.packet.encodePacket(type, dataArray)` | ✓ new — `root.msgpack.encode([type, dataArray])` or null if missing |
| `Nozo.packet.sendPacket(type, ...args)` | ✓ new — encodes and sends if socket open; returns bool |
| `Nozo.packet.sendDirection(angle, tag)` | ✓ new — sends `D` packet with debug log + history |
| `Nozo.packet.sendMove(angle, extra)` | ✓ new — sends `9` packet with debug log + history |
| `Nozo.packet.sendGather()` | ✓ new — sends `K, 1, 1` with debug log + history |
| `Nozo.packet.sendAttackPacketUnsafe()` | ✓ new — reserved stub, always returns false, no callers |
| `Nozo.packet.getHistory()` | ✓ new — returns copy of last N packet records |
| `Nozo.start()` with phase + externals | ✓ updated to Phase 4 |

---

## CDN URLs (pinned to 9e53c20)

| File | CDN URL |
|------|---------|
| `easystar.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/vendor/easystar.min.js` |
| `msgpack.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/vendor/msgpack.min.js` |
| `utils.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/utils.min.js` |
| `constants.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/constants.min.js` |
| `packet.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/packet.min.js` |

`@main` variants work too; use pinned hashes to bypass jsdelivr CDN cache during testing.

---

## @require order in project-nozo-next.user.js

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@9e53c20/dist/packet.min.js
```

---

## Decisions / Scope Notes

- `NozoNext.packet` is used as the namespace (matches the `packet()` global name in moomoo.js).
- `sendPacket` uses `ws.readyState !== WebSocket.OPEN` guard; returns `false` (not throws) on missing socket or missing msgpack — blocked result is clear.
- `sendAttackPacketUnsafe()` is an explicitly named stub. It is not called by any code path. No `F` attack packet logic was added.
- History ring buffer size reads `Nozo.constants.MAX_LOG` at module init (constants.min.js loads before packet.min.js); falls back to 64 if unavailable.
- `sendDirection` validates `typeof angle !== "number"` and returns false early — matches the moomoo.js `typeof data[0] != typeof 1` guard.
- `sendGather()` does NOT replicate the `secPacket >= 90` throttle from `sendAutoGather()` — that throttle is gameplay state, deferred to Phase 6.
- Build pipeline (`scripts/scripts.js`) was not changed.
- Items, Store, and combat logic were not touched.

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Obfuscator non-determinism means `dist/` diffs on every rebuild | Low | Cosmetic; output is functionally equivalent; pin commit hash in `@require` to freeze the CDN copy |
| CDN cache propagation for `@main` | Low | Use pinned hash URLs during testing |
| `project-nozo-next.user.js` has no git history | Medium | File is outside any git repo; changes are untracked |
| `sendGather()` omits the `secPacket` throttle from moomoo.js `sendAutoGather` | Low | Intentional — throttle deferred to Phase 6; Phase 4 module is foundation only |

---

## Next Recommended Phase

**Phase 5 — Input**

- Port mouse/keyboard/macro handling from moomoo.js lines 25341–26810.
- Keep `clicks.left` and `clicks.right` distinct.
- Use one shared manual swing helper.
- Wire input state into `NozoNext.state`.
