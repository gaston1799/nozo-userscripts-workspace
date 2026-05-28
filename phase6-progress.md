# Phase 6 — Attack/Aim

Status: COMPLETE

---

## Summary

Phase 6 created the combat/aim foundation module for NozoNext.

- `src/combat.js` added to externals: `NozoNext.combat` API with aim lock manager, single aim resolver, reload gate, centralized D/K packet senders, manual swing entry point, and input wiring.
- `dist/combat.min.js` built and committed.
- `package.json` `check` script expanded to cover `src/combat.js`.
- `project-nozo-next.user.js` updated: new `@require`, `Nozo.combat` check in `start()`, `wireInput` call, phase label bumped to "Phase 6 - Attack/Aim".
- `README.md` updated with new CDN URL, load-order table, globals list, and full `Nozo.combat` API reference including the centralized packet-sending rule.
- All `@require` lines pinned to commit `0d38a03`.

`moomoo.js` — not touched.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/combat.js` | Created — `Nozo.combat` API: `state`, `setAimLock`, `clearAimLock`, `getActiveAim`, `calculateAim`, `canSwing`, `sendDirection`, `sendGather`, `swingAt`, `manualSwing`, `wireInput`, `getHistory`, `getDebugState`; state mirrored to `Nozo.state.combat` |
| `project-nozo-externals/dist/combat.min.js` | Created — obfuscated+minified build of `src/combat.js` (14623b → 16851b) |
| `project-nozo-externals/dist/constants.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/dist/input.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/dist/packet.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/dist/utils.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/package.json` | Added `src/combat.js` to `check` script |
| `project-nozo-externals/README.md` | Added `combat.min.js` to `@require` order, project modules table, globals list, and new `Nozo.combat` API section with centralized packet rule |
| `project-nozo-next.user.js` | Added `@require` for `combat.min.js`; added `Nozo.combat` to `start()` externals check; added `wireInput` call; updated phase label; bumped all commit hashes to `0d38a03` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `node --check src/combat.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — all 5 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — `combat.js → dist/combat.min.js` (14623b → 16851b) |
| `node --check dist/combat.min.js` | PASS |
| `git -C project-nozo-externals status --short` | PASS — clean after final commit |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `17d5a2a` | Phase 6 - Attack/Aim combat foundation |
| `0d38a03` | build: refresh dist outputs after Phase 6 checks |

Both commits pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## API Surface After Phase 6

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
| `Nozo.compat` | ✓ |
| `Nozo.Utils` / `Nozo.createUtils()` | ✓ |
| `Nozo.constants` | ✓ |
| `Nozo.packet.*` | ✓ |
| `Nozo.input.*` | ✓ |
| `Nozo.combat.state` | ✓ new — `{ lastDirAngle, lastDirTag, lastDirTick, lastDirTime, lastGatherTag, lastGatherTick, lastGatherTime, lastBlockReason }` |
| `Nozo.combat.setAimLock(angle, tag, ticksOrExpireTick)` | ✓ new |
| `Nozo.combat.clearAimLock(tag)` | ✓ new |
| `Nozo.combat.getActiveAim(context)` | ✓ new |
| `Nozo.combat.calculateAim(context)` | ✓ new — 7-tier resolver; never throws |
| `Nozo.combat.canSwing(context)` | ✓ new — macro/socket/weapon/reload gate |
| `Nozo.combat.sendDirection(angle, tag, context)` | ✓ new — only D sender |
| `Nozo.combat.sendGather(tag, context)` | ✓ new — only gather swing sender |
| `Nozo.combat.swingAt(angle, tag, context)` | ✓ new — canSwing → sendDirection → sendGather |
| `Nozo.combat.manualSwing(reason, context)` | ✓ new — calculateAim → swingAt |
| `Nozo.combat.wireInput(inputModule)` | ✓ new — registers `onManualSwing` callback |
| `Nozo.combat.getHistory()` | ✓ new — ring-buffer of send/block records |
| `Nozo.combat.getDebugState()` | ✓ new — aim lock + state snapshot |
| `Nozo.state.combat` | ✓ new — live reference to combat state |
| `Nozo.start()` with phase + externals | ✓ updated to Phase 6 |

---

## CDN URLs (pinned to 0d38a03)

| File | CDN URL |
|------|---------|
| `easystar.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/vendor/easystar.min.js` |
| `msgpack.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/vendor/msgpack.min.js` |
| `utils.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/utils.min.js` |
| `constants.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/constants.min.js` |
| `packet.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/packet.min.js` |
| `input.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/input.min.js` |
| `combat.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/combat.min.js` |

---

## @require order in project-nozo-next.user.js

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@0d38a03/dist/combat.min.js
```

---

## Design Decisions

- `calculateAim` resolves through 7 tiers and never throws when data is missing — returns `{ ok: false, reason }` instead.
- Reload gate: weapon reload is ready when `reload <= pingTime` or `reload <= 0` (matches the legacy `sendReloadCheckedHit` fix from moomoo.js line 18559). Debug output always includes `weapon`, `reload`, `pingTime`, and tick/time.
- `swingAt` is strictly ordered: `canSwing` → `sendDirection` → `sendGather`. Any failure short-circuits and records to history.
- `sendDirection` is the sole D-packet sender; `sendGather` is the sole K-packet sender. Callers must not call `Nozo.packet.sendDirection` / `Nozo.packet.sendGather` directly for combat purposes.
- Direct F attack packets are intentionally unsupported in this pipeline. `Nozo.packet.sendAttackPacketUnsafe` remains an opt-in stub that returns `false`.
- `wireInput` does not auto-attach to the canvas. It only registers a callback on the already-attached input module.
- `manualSwing` does not send packets directly — it goes through `calculateAim → swingAt` which enforces the reload gate and packet checks.
- History ring buffer uses `Nozo.constants.MAX_LOG` at module init, falls back to 64.
- `Nozo.state.combat` holds a live reference to the same state object as `Nozo.combat.state`.

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Obfuscator non-determinism means `dist/` diffs on every rebuild | Low | Pin commit hash in `@require` to freeze CDN copy |
| CDN cache propagation for `@main` | Low | Use pinned hash URLs during testing |
| `calculateAim` enemy-aim tier uses `enemy[0]` without filtering dead/retreating enemies | Low | Phase 7 (AutoBreak/Traps) will supply a pre-selected `context.enemy`; current fallback is reasonable |
| `canSwing` skips reload check when `reload === undefined` (no player/weapon data) | Low | Intentional — allows manual testing without a live game state; full gate engages once player data is available |
| `wireInput` fires `manualSwing` on every click callback, not just when left/right is pressed | Low | `snapshot.reason` from `input.emitManualSwing` will tag the source; Phase 7 can add a reason-filter |

---

## Next Recommended Phase

**Phase 7 — AutoBreak/Traps**

- Port `AutoBreaker` (moomoo.js lines 22530–23328) as a module.
- Port `Traps` / `Traps_` (lines 19539–21010) as a module.
- Both should supply `context.traps.aim` and `context.autoBreak.aim` to `Nozo.combat.calculateAim`.
- Neither should send packets directly — all sends must go through `Nozo.combat.swingAt`.
