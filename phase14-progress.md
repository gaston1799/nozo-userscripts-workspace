# Phase 14 — Live Verification + Scale + Handler Promotion

Status: COMPLETE

---

## Summary

Phase 14 delivered all six concrete tasks: RAF controlled fallback mode gate,
dynamic render scale from game globals / viewport heuristic, promoted X/Y
projectile handlers with bounded `state.projectiles` map, promoted K handler
with bounded gather history, weaponRange + live reload gate HUD accuracy in
combat, and dead player pruning with `getAlivePlayers()` helper.
All checks pass. Pushed to `main` as two commits (`4356855` + `a55d3fb`).
`@require` hashes pinned to `a55d3fb`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-next.user.js` | RAF → mode gate (hard-block/passthrough); `_rafMode`, `setRafMode()`; `updateWeaponRange` call in tick; phase label → Phase 14; @require hashes → a55d3fb |
| `project-nozo-externals/src/combat.js` | `_weaponRanges` table; `getWeaponRange()`; `updateWeaponRange()`; state fields `weaponRange/aimAngle/aimSource/reloadGate/lastSwingAt`; `aimAngle+aimSource` set in `sendDirection`; `lastSwingAt+reloadGate` reset in `swingAt` success path |
| `project-nozo-externals/src/net-events.js` | `_handlerX` addProjectile (bounded map, max 200); `_handlerY` remProjectile; `_handlerK` gatherAnimation (bounded history 20, `state.lastGatherAnim`); `_rebuildNearEnemy` skips `alive===false`; `_pruneDeadPlayers` removes dead after 30s grace, called from `_handlerA`; `getAlivePlayers()` exported on facade |
| `project-nozo-externals/src/render.js` | `_updateScale()` checks game global / viewport every 3s; `draw()` calls `_updateScale()` at entry; HUD reload line uses `lastSwingAt + RELOAD_TICK` as live countdown instead of stale `reloadGate` |
| `project-nozo-externals/dist/combat.min.js` | Rebuilt |
| `project-nozo-externals/dist/net-events.min.js` | Rebuilt |
| `project-nozo-externals/dist/render.min.js` | Rebuilt |
| `project-nozo-externals/dist/*.min.js` (all others) | Rebuilt (obfuscator re-seed) |

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
| `4356855` | Phase 14 - Live Verification + Scale + Handler Promotion |
| `a55d3fb` | Phase 14 - rebuild dist (obfuscator re-seed) |

Pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## What Changed and Why

### 1. RAF live-safety gate

`overrideRaf()` now installs `nozoRafGate` instead of the previous
`nozoRafBlock`. The gate reads `Nozo.bridge._rafMode` each call:
- `"hard-block"` (default): drops callback, returns 0 — identical behavior
  to Phase 13.
- `"passthrough"`: forwards callback to `_nativeRaf` and returns the native
  handle — enables game RAF loop during live testing if hard-block breaks
  game state updates.

`Nozo.bridge.setRafMode(mode)` switches the mode at runtime and logs the
change. The startup log `bridge:raf-blocked` now includes `mode` field
reflecting the active setting. No behavior change from Phase 13 default;
the fallback is opt-in only.

### 2. Dynamic render scale

`_updateScale()` added to `render.js`. Called at the start of every `draw()`
with a 3-second debounce (caches `_lastScaleCheck`). Resolution order:

1. `root.game.scale` — direct game camera scale if the game exposes it.
2. `root.camera.scale` — alternate camera global.
3. Viewport heuristic: `(Math.min(innerWidth, innerHeight) / 1800) * devicePixelRatio`.
   Rationale: moomoo.io shows approximately 1800 world units along the short
   axis at default zoom.

Scale is clamped to `[0.1, 8]` (game path) or `[0.25, 4]` (heuristic).
Only updates `state.scale` when the delta exceeds 0.01 to avoid noise.
Logs `render:scale:updated` with `source` field on change.

### 3. X/Y projectile handlers

`_handlerX` replaces the X observer. Reads positional arguments flexibly
(`id, ownerSid, type, x, y, dir`) since live packet shape was unknown.
Writes to `Nozo.state.projectiles[id]` with `{id, ownerSid, type, x, y, dir, t}`.
Prunes to 200 entries by oldest `t` to bound memory. Counter maintained in
`netEventCounters.X`.

`_handlerY` replaces the Y observer. Deletes `state.projectiles[id]`.
Counter maintained in `netEventCounters.Y`.

Both are now registered in `registerMany` replacing `_makeObserver("X/Y")`.

### 4. K handler (gatherAnimation)

`_handlerK` replaces the K observer. Maintains `_gatherHistory` (module-level,
bounded to 20 entries). Each entry: `{tick, time, argc, source}` where `source`
is the first argument (likely owner SID). The most recent entry is mirrored to
`Nozo.state.lastGatherAnim` for quick access from other modules.

Counter maintained in `netEventCounters.K`. Logs `net:gatherAnim:K` on first
hit and every 100th. No animation engine — purely state tracking.

### 5. Combat range + reload HUD accuracy

**weaponRange**: `_weaponRanges` table in `combat.js` maps `weaponIndex → world-unit range`
for common moomoo.io weapons (indices 0–14). `getWeaponRange(wi)` returns the
table value or 35 fallback. `updateWeaponRange({player})` sets `state.weaponRange`
from `player.weaponIndex`. Called every tick from `Nozo.bridge.tick`.
`render.js` range ring was already reading `combatState.weaponRange` — now
gets a real value instead of always falling back to 35.

**aimAngle / aimSource**: Written in `sendDirection()` so render HUD shows the
last successful aim direction and its tag (source).

**Live reload gate**: `state.lastSwingAt` is set to `Date.now()` on every successful
`swingAt()`. `render.js` HUD now computes `remaining = RELOAD_TICK - elapsed`
from `lastSwingAt` and shows it as `reload:<ms>ms` while > 0. Falls back to the
old `reloadGate` display if `lastSwingAt` is null (first run before any swing).

### 6. Dead player pruning

`_pruneDeadPlayers()`: scans `state.players`, removes entries where
`alive === false && lastSeenAt < (now - 30000)`. Called at the end of
`_handlerA` (updatePlayers) so pruning runs every server tick when players
are active.

`getAlivePlayers()`: returns `state.players` filtered to `alive !== false`.
Exported on `netEventsCallable.getAlivePlayers`.

`_rebuildNearEnemy()`: now skips `p.alive === false` players before
adding to `near`/`enemy` arrays, so combat targeting never receives
dead player entries.

---

## @require order in project-nozo-next.user.js (pinned to a55d3fb)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/player.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@a55d3fb/dist/html.min.js
```

---

## Remaining Parity Risks

| Risk | Severity | Notes |
|------|----------|-------|
| RAF hard-block vs game state | Medium | `setRafMode("passthrough")` is now available for emergency live testing. If game positions freeze, switch mode without a script reload. Phase 15 should confirm with live session data whether hard-block is safe. |
| `_weaponRanges` table approximate | Medium | Weapon indices 0–14 are mapped with guessed ranges. Actual moomoo.io weapon ranges vary by variant. Phase 15 should read range from `state.initData` (set by A handler) once the initData format is parsed. |
| X/Y projectile arg layout unverified | Medium | `_handlerX` reads args positionally (`id, ownerSid, type, x, y, dir`). Live packet shape may differ. `netEventCounters.X/Y` and `state.projectiles` will show immediately if data is landing; log format needs verification. |
| Scale heuristic only, no real camera value | Low | `root.game.scale` may not exist in moomoo.io's global scope. Until confirmed, the viewport heuristic (`viewport / 1800 * DPR`) is used. Phase 15 should grep the game bundle for the actual camera scale global name. |
| `RELOAD_TICK` is base reload only | Low | Live reload HUD uses 400ms base for all weapons. Actual reload varies by weapon (bows are slower; daggers faster). Phase 15 should parse weapon reload from `state.initData`. |
| I/J (loadAI/animateAI) still observers | Low | These fire for NPC/AI events. Frequency and arg layout unknown until live data. Phase 15 can inspect `netEventCounters.I/J` to decide if full handlers are needed. |
| L/M (wiggle/turret) still observers | Low | L (wiggleGameObject) and M (shootTurret) are likely low-value for combat; keep as observers until Phase 15 confirms. |

---

## Recommended Phase 15 Scope

**Phase 15 — initData Parsing + Weapon Catalog + Live Verification**

1. **Parse A (setInitData)**: decode `state.initData` to extract weapons table,
   ages table, and game constants. Store as `Nozo.state.itemsData` for use by
   combat and render.
2. **Real weapon ranges**: replace `_weaponRanges` static table in combat.js with
   live lookup from `itemsData.weapons[weaponIndex].range`.
3. **Real reload times**: derive per-weapon reload from itemsData; fix HUD reload
   countdown to use actual weapon reload instead of `RELOAD_TICK`.
4. **Camera scale verification**: inspect live `root.game` or `root.camera` globals;
   confirm or update the scale source name so `_updateScale()` uses the real value.
5. **X/Y arg layout**: verify projectile packet shape from live `netEventCounters`
   and `state.projectiles` entries; update `_handlerX` field mapping if needed.
6. **Turret handler (M)**: implement if `netEventCounters.M` shows frequent hits;
   add turret projectiles to `state.projectiles` or a separate `state.turrets` map.
7. **AI handlers (I/J)**: promote if `netEventCounters.I/J` confirms they fire;
   useful for identifying NPC-owned objects in gameObjects.
