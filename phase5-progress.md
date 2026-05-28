# Phase 5 — Input

Status: COMPLETE

---

## Summary

Phase 5 created the input foundation module for NozoNext.

- `src/input.js` added to externals: `NozoNext.input` API with click/key/mouse/macro state, attach/detach lifecycle, and manual-swing callback hooks
- `dist/input.min.js` built and committed
- `package.json` `check` script expanded to cover `src/input.js`
- `project-nozo-next.user.js` updated: new `@require`, `Nozo.input` check in `start()`, phase label bumped to "Phase 5 - Input"
- `README.md` updated with new CDN URL, load-order table, globals list, and `Nozo.input` API reference
- All `@require` lines pinned to commit `a6b471b`

`moomoo.js` — not touched.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/input.js` | Created — `NozoNext.input` API: `state.clicks/keys/mouse/macro`, `attach`, `detach`, `setClick`, `setKey`, `setMouse`, `getClicks`, `getKeys`, `getMouse`, `getMacro`, `onManualSwing`, `emitManualSwing`, `getHistory`; input state mirrored to `Nozo.state.input` |
| `project-nozo-externals/dist/input.min.js` | Created — obfuscated+minified build of `src/input.js` (7512b → 6793b) |
| `project-nozo-externals/dist/constants.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/dist/packet.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/dist/utils.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/package.json` | Added `src/input.js` to `check` script |
| `project-nozo-externals/README.md` | Added `input.min.js` to `@require` order, project modules table, globals list, and new `Nozo.input` API section |
| `project-nozo-next.user.js` | Added `@require` for `input.min.js`; added `Nozo.input` to `start()` externals check; updated phase label; bumped all commit hashes to `a6b471b` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `node --check src/input.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — all 4 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — `input.js → dist/input.min.js` (7512b → 6793b) |
| `node --check dist/input.min.js` | PASS |
| `git -C project-nozo-externals status --short` | PASS — clean |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `f7ce0a0` | Phase 5 - Input foundation |
| `78a149c` | docs: add input.min.js to README load order and module list |
| `a6b471b` | build: refresh dist outputs after Phase 5 checks |

All three commits pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## API Surface After Phase 5

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
| `Nozo.packet.setSocket(ws)` | ✓ via packet.min.js |
| `Nozo.packet.sendDirection(angle, tag)` | ✓ via packet.min.js |
| `Nozo.packet.sendGather()` | ✓ via packet.min.js |
| `Nozo.input.state.clicks` | ✓ new — `{ left, middle, right }` |
| `Nozo.input.state.keys` | ✓ new — key code → boolean |
| `Nozo.input.state.mouse` | ✓ new — `{ x, y, clientX, clientY }` |
| `Nozo.input.state.macro` | ✓ new — placeholder; mirrors key strings for legacy compat |
| `Nozo.input.attach(target, opts)` | ✓ new — adds mouse/keyboard listeners; safe on bad target |
| `Nozo.input.detach()` | ✓ new — removes all listeners added by attach |
| `Nozo.input.setClick(name, value, source)` | ✓ new |
| `Nozo.input.setKey(code, value, source)` | ✓ new |
| `Nozo.input.setMouse(eventLike, source)` | ✓ new |
| `Nozo.input.getClicks()` | ✓ new — snapshot |
| `Nozo.input.getKeys()` | ✓ new — snapshot |
| `Nozo.input.getMouse()` | ✓ new — snapshot |
| `Nozo.input.getMacro()` | ✓ new — snapshot |
| `Nozo.input.onManualSwing(callback)` | ✓ new — register swing hook |
| `Nozo.input.emitManualSwing(reason)` | ✓ new — calls callbacks; no packets sent |
| `Nozo.input.getHistory()` | ✓ new — ring-buffer event history |
| `Nozo.state.input` | ✓ new — live reference to input state |
| `Nozo.start()` with phase + externals | ✓ updated to Phase 5 |

---

## CDN URLs (pinned to a6b471b)

| File | CDN URL |
|------|---------|
| `easystar.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/vendor/easystar.min.js` |
| `msgpack.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/vendor/msgpack.min.js` |
| `utils.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/utils.min.js` |
| `constants.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/constants.min.js` |
| `packet.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/packet.min.js` |
| `input.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/input.min.js` |

`@main` variants work too; use pinned hashes to bypass jsdelivr CDN cache during testing.

---

## @require order in project-nozo-next.user.js

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a6b471b/dist/input.min.js
```

---

## Design Decisions

- `clicks.left` and `clicks.right` are stored and set independently — the hat-changer needs this distinction in Phase 6.
- Context menu suppression is opt-in (`attach(..., { preventContextMenu: true })`) to avoid interfering with UI elements attached before the canvas is ready.
- Mouse-up listener is bound to `window` (not the canvas), so drag-release outside the canvas correctly clears click state.
- `emitManualSwing` calls callbacks with a snapshot but sends no packets — Phase 6 will wire combat from these callbacks.
- `state.macro` mirrors `e.key` strings (e.g. `"e"`, `"E"`) in addition to key codes, matching the `macro[event.key] = 1/0` pattern from moomoo.js line 25771/25814.
- `attach` returns `{ ok: false, reason: "..." }` on a bad target and logs the block — never throws.
- History ring buffer uses `Nozo.constants.MAX_LOG` at module init, falls back to 64.
- `Nozo.state.input` holds a live reference to the same state object as `Nozo.input.state`.

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Obfuscator non-determinism means `dist/` diffs on every rebuild | Low | Cosmetic; pin commit hash in `@require` to freeze the CDN copy |
| CDN cache propagation for `@main` | Low | Use pinned hash URLs during testing |
| `project-nozo-next.user.js` has no git history | Medium | File is outside any git repo; changes are untracked |
| `emitManualSwing` has no callers yet | Low | Intentional — Phase 6 will call it from the combat pipeline |

---

## Next Recommended Phase

**Phase 6 — Attack/Aim**

- Wire `emitManualSwing` from `mousedown` left/right events via `Nozo.input`.
- Implement `calculateAim(context)` — single aim resolver with priority tiers.
- Implement `DirectionDispatcher` — deduplicated D sender with reload gate.
- Implement `SwingSender` — single entry for all `sendAutoGather` callers.
- Key reference: `findings.md` §Combat Pipeline Problems.
