# Phase 7 — AutoBreak/Traps

Status: COMPLETE

---

## Summary

Phase 7 created the autobreak and traps target/aim modules for NozoNext.

- `src/traps.js` was already present from the prior commit (`02a97d1`); no changes were needed.
- `src/autobreak.js` added: `Nozo.autoBreak` API with scan, setAim, clearAim, getAim, requestBreak, getDebugState, getHistory; mirrors `Nozo.state.autoBreak`; no direct packet sends.
- `dist/autobreak.min.js` built and committed.
- `package.json` check script expanded to include `src/net-events.js`, `src/traps.js`, and `src/autobreak.js`.
- `project-nozo-next.user.js` updated: new `@require` for `autobreak.min.js`, `Nozo.traps` and `Nozo.autoBreak` added to `start()` externals check, phase label bumped to "Phase 7 - AutoBreak/Traps".
- `README.md` updated: added `traps.min.js` and `autobreak.min.js` to `@require` order and module table, documented both APIs, documented the `closeObjects` fallback behavior, and the no-direct-packet-send rule.
- All `@require` lines pinned to commit `d7abff5`.

`moomoo.js` — not touched.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/autobreak.js` | Created — `Nozo.autoBreak` API: `state`, `scan`, `setAim`, `clearAim`, `getAim`, `requestBreak`, `getDebugState`, `getHistory`; 4-tier priority; aim scoring with team-penalty; state mirrored to `Nozo.state.autoBreak` |
| `project-nozo-externals/dist/autobreak.min.js` | Created — obfuscated+minified build (19240b → 17421b) |
| `project-nozo-externals/dist/*.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/package.json` | Added `src/net-events.js`, `src/traps.js`, `src/autobreak.js` to `check` script |
| `project-nozo-externals/README.md` | Added `net-events.min.js`, `traps.min.js`, `autobreak.min.js` to `@require` order, module table, and globals list; added full `Nozo.traps` and `Nozo.autoBreak` API sections; documented `closeObjects` fallback and no-packet-send rule |
| `project-nozo-next.user.js` | Added `@require` for `autobreak.min.js`; added `Nozo.traps` and `Nozo.autoBreak` to `start()` externals check; updated phase label; bumped all commit hashes to `d7abff5` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `node --check src/traps.js` | PASS |
| `node --check src/autobreak.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — all 8 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — `autobreak.js → dist/autobreak.min.js` (19240b → 17421b) |
| `node --check dist/traps.min.js` | PASS |
| `node --check dist/autobreak.min.js` | PASS |
| `git -C project-nozo-externals status --short` | PASS — clean after final commit |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `c67d508` | Phase 7 - AutoBreak/Traps |
| `d7abff5` | docs: add traps and autobreak API docs to README |

Both commits pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## API Surface After Phase 7

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
| `Nozo.combat.*` | ✓ |
| `Nozo.netEvents.*` | ✓ |
| `Nozo.traps.state` | ✓ new — `{ inTrap, aim, target, lastScan, lastReason, debug }` |
| `Nozo.traps.scan(context)` | ✓ new |
| `Nozo.traps.setAim(angle, tag, expireTick)` | ✓ new |
| `Nozo.traps.clearAim(reason)` | ✓ new |
| `Nozo.traps.getAim(context)` | ✓ new |
| `Nozo.traps.getDebugState()` | ✓ new |
| `Nozo.traps.getHistory()` | ✓ new |
| `Nozo.state.traps` | ✓ new — live reference |
| `Nozo.autoBreak.state` | ✓ new — `{ active, aim, target, lastScan, lastReason, debug }` |
| `Nozo.autoBreak.scan(context)` | ✓ new |
| `Nozo.autoBreak.setAim(angle, tag, expireTick)` | ✓ new |
| `Nozo.autoBreak.clearAim(reason)` | ✓ new |
| `Nozo.autoBreak.getAim(context)` | ✓ new |
| `Nozo.autoBreak.requestBreak(target, context)` | ✓ new — scan/aim only unless `context.send === true` |
| `Nozo.autoBreak.getDebugState()` | ✓ new |
| `Nozo.autoBreak.getHistory()` | ✓ new |
| `Nozo.state.autoBreak` | ✓ new — live reference |
| `Nozo.start()` with phase + externals | ✓ updated to Phase 7 |

---

## CDN URLs (pinned to d7abff5)

| File | CDN URL |
|------|---------|
| `easystar.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/vendor/easystar.min.js` |
| `msgpack.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/vendor/msgpack.min.js` |
| `utils.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/utils.min.js` |
| `constants.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/constants.min.js` |
| `packet.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/packet.min.js` |
| `input.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/input.min.js` |
| `combat.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/combat.min.js` |
| `net-events.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/net-events.min.js` |
| `traps.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/traps.min.js` |
| `autobreak.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/autobreak.min.js` |

---

## @require order in project-nozo-next.user.js

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@d7abff5/dist/autobreak.min.js
```

---

## Design Decisions

- `scan()` on both modules never throws — it returns `{ ok: false, reason }` when data is missing.
- Both modules read from `context` first, then `Nozo.state`, never reaching into globals directly.
- `closeObjects` is treated as a `liztobj` fallback per Phase 7 design decision: in moomoo.js `liztobj` is aliased as `game.closeObjects` at line 14508, so both refer to the same server-provided close-objects list.
- `Nozo.autoBreak.requestBreak` defaults to scan/aim only. Packets are sent **only** when `context.send === true`, routing through `Nozo.combat.swingAt` which enforces the full reload gate and canSwing check.
- Aim scoring uses a π/2.6 half-angle sweep (matching the original `AutoBreaker.objectsHit`). Enemy dmg objects earn +70, traps +60, plain enemy objects +50. Team objects cost 10–50 depending on type; level 3 (break-all) inverts these penalties.
- `Nozo.combat.calculateAim` already reads `Nozo.state.traps.aim` (tier 3) and `Nozo.state.autoBreak.aim` (tier 4) — no combat.js changes needed.
- Both history ring buffers use `Nozo.constants.MAX_LOG` at module init, fallback to 64.

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Obfuscator non-determinism means `dist/` diffs on every rebuild | Low | Pin commit hash in `@require` to freeze CDN copy |
| CDN cache propagation for `@main` | Low | Use pinned hash URLs during testing |
| `scan()` builds priority tiers but does not filter by user config flags (spikeTick, breakTTB, breakAll) | Low | Phase 7 scope is aim/target only; config-gate integration belongs in Phase 9 (UI/menu) |
| `_isTeamObject` fallback uses `obj.owner.sid` and `obj.team` — objects without these fields are conservatively treated as enemy | Low | Matches original behavior; safe default |

---

## Next Recommended Phase

**Phase 8 — Movement/Pathfinding**

- Port the pathfinding system (JPS/GPT/naive variants, lines 26811–29766).
- Keep movement state separate from attack state.
- Wire movement target updates to `Nozo.state.path` / `Nozo.state.movement`.
