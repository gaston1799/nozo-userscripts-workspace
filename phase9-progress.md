# Phase 9 — Movement/Pathfinding

Status: COMPLETE

---

## Summary

Phase 9 created `Nozo.movement` — a movement/pathfinding foundation module for NozoNext.

- `src/movement.js` added: full API with `setTarget`, `clearTarget`, `setPath`, `clearPath`,
  `step`, `canMove`, `computeMoveDir`, `sendMove`, `setStrategy`, `getDebugState`, `getHistory`.
- Movement state (`target`, `path`, `lastMoveDir`, `lastMoveTick`, `lastMoveTime`,
  `blockedReason`, `strategy`, `active`) kept entirely separate from combat/traps/autoBreak state.
- All movement sends routed through `Nozo.packet.sendMove`; no combat packets (`D`/`K`) emitted.
- Active pathfinder from `moomoo.js` (`Pathfinder`, line 26711, EasyStar-based) cannot be
  cleanly extracted due to deep coupling to legacy globals. Direct-target fallback strategy
  (`"direct"`) provided; `setStrategy` adapter seam left for future EasyStar wiring.
- Dead pathfinder variants (`PathfinderJPS`, `PathfinderGPT`, `Pathfinder_`, `PathfinderBroke`)
  not ported per scope constraint.
- `dist/movement.min.js` built and committed.
- `package.json` `check` script already included `src/movement.js` from prior setup.
- `project-nozo-next.user.js` already had `@require` for `movement.min.js`, `Nozo.movement`
  in `start()` externals check, and `Nozo.movement.step(ctx)` in bridge tick loop — no changes needed.
- `README.md` updated: added `movement.min.js` to `@require` order, module table, and globals list;
  added full `Nozo.movement` API section including state fields, all methods, strategy seam,
  no-direct-packet-send rule, and EasyStar adapter note.
- All `@require` lines pinned to commit `03156e9`.

`moomoo.js` — not touched.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/movement.js` | Created (committed in `933c42e`) — `Nozo.movement` API: `state`, `setTarget`, `clearTarget`, `setPath`, `clearPath`, `step`, `canMove`, `computeMoveDir`, `sendMove`, `setStrategy`, `computePath`, `getDebugState`, `getHistory`; built-in `"direct"` strategy; state mirrored to `Nozo.state.movement` |
| `project-nozo-externals/dist/movement.min.js` | Created — obfuscated+minified build (8909b → 9058b) |
| `project-nozo-externals/dist/*.min.js` | Rebuilt (non-deterministic obfuscator refresh) |
| `project-nozo-externals/README.md` | Added `movement.min.js` to `@require` order, module table, and globals list; added full `Nozo.movement` API reference; documented strategy seam and EasyStar note |
| `project-nozo-next.user.js` | Bumped all `@require` commit hashes to `03156e9` (all other Phase 9 wiring was already in place) |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `node --check src/movement.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — all 9 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — `movement.js → dist/movement.min.js` (8909b → 9058b) |
| `node --check dist/movement.min.js` | PASS |
| `git -C project-nozo-externals status --short` | PASS — clean after final commit |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `933c42e` | Phase 9 - Movement/Pathfinding |
| `03156e9` | Phase 9 - Movement/Pathfinding docs and rebuild |

Both commits pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## API Surface After Phase 9

| API | Status |
|-----|--------|
| `Nozo.movement.state` | ✓ new — `{ target, path, lastMoveDir, lastMoveTick, lastMoveTime, blockedReason, strategy, active }` |
| `Nozo.movement.setTarget(target)` | ✓ new |
| `Nozo.movement.clearTarget(reason)` | ✓ new |
| `Nozo.movement.setPath(path)` | ✓ new |
| `Nozo.movement.clearPath(reason)` | ✓ new |
| `Nozo.movement.step(context)` | ✓ new — called by bridge tick after net-state rebuild |
| `Nozo.movement.canMove(context)` | ✓ new — structured blocked result with reason |
| `Nozo.movement.computeMoveDir(context)` | ✓ new — path waypoint → strategy fallback |
| `Nozo.movement.sendMove(angle, context)` | ✓ new — routes via `Nozo.packet.sendMove` |
| `Nozo.movement.setStrategy(name, fn)` | ✓ new — adapter seam for EasyStar/future pathfinders |
| `Nozo.movement.computePath(context)` | ✓ new |
| `Nozo.movement.getDebugState()` | ✓ new |
| `Nozo.movement.getHistory()` | ✓ new |
| `Nozo.state.movement` | ✓ new — live reference |
| `Nozo.start()` with phase + externals | ✓ updated to Phase 9 - Movement/Pathfinding |

---

## CDN URLs (pinned to 03156e9)

| File | CDN URL |
|------|---------|
| `easystar.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/vendor/easystar.min.js` |
| `msgpack.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/vendor/msgpack.min.js` |
| `utils.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/utils.min.js` |
| `constants.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/constants.min.js` |
| `packet.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/packet.min.js` |
| `input.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/input.min.js` |
| `combat.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/combat.min.js` |
| `net-events.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/net-events.min.js` |
| `traps.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/traps.min.js` |
| `autobreak.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/autobreak.min.js` |
| `movement.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/movement.min.js` |

---

## @require order in project-nozo-next.user.js (pinned to 03156e9)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@03156e9/dist/movement.min.js
```

---

## Design Decisions

- `step()` calls `canMove` → `computeMoveDir` → `sendMove` on each tick; returns structured
  `{ ok, reason, debug }` at every gate so callers can trace exactly why movement was blocked.
- `canMove` checks: player present, target/path set, packet module present, socket open,
  `context.manualOverride` flag. Never throws; never writes to `Nozo.state.combat`.
- `computeMoveDir` prefers the leading path waypoint when a path exists; falls through to the
  active strategy otherwise. Returns `null` if direction cannot be determined.
- `sendMove` routes exclusively through `Nozo.packet.sendMove` (packet type `"9"`); does not
  call `Nozo.combat.sendDirection` or `Nozo.combat.sendGather` to preserve state separation.
- `setStrategy` / `computePath` provide an open seam for EasyStar integration without touching
  the module source — bridge code or a future Phase 10 adapter can register `"easystar"` strategy
  using the live EasyStar instance and `Nozo.state.gameObjects` for obstacle grid building.
- History ring buffer uses `Nozo.constants.MAX_LOG` at module init, fallback to 64.

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Active EasyStar pathfinder not extracted | Low | Direct-target fallback covers movement; EasyStar seam present via `setStrategy` |
| Obfuscator non-determinism means `dist/` diffs on every rebuild | Low | Pin commit hash in `@require` to freeze CDN copy |
| CDN cache propagation for `@main` | Low | Use pinned hash URLs during testing |
| `step()` is called every 50 ms tick; `sendMove` sends every call | Low | Upstream callers should gate on `state.active` or only call `setTarget` when movement is needed |

---

## Next Recommended Phase

**Phase 10 — Render/UI**

- Port render overlays.
- Port `Html` menu.
- Preserve `localStorage` and `GM_*` keys.
