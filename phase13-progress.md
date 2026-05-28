# Phase 13 — Render Takeover + Live Calibration

Status: COMPLETE

---

## Summary

Phase 13 delivered all five concrete anchors: RAF hard-block takeover,
render pipeline expansion (range ring, labeled targets, HUD text), render
toggle clean-on-disable, event calibration stubs for unimplemented handlers,
and state hygiene validation. All checks pass. Pushed to `main` as two
commits (`25e0859` + `df825b8`). `@require` hashes pinned to `df825b8`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-next.user.js` | RAF → hard-block no-op; phase label → Phase 13; @require hashes → df825b8 |
| `project-nozo-externals/src/render.js` | Add `_drawRangeRing` (weapon range ring), update `_drawTargetMarker` with label param, add `_drawHudText` (tick/aim/reload HUD), integrate all three into `draw()` |
| `project-nozo-externals/dist/render.min.js` | Rebuilt |
| `project-nozo-externals/src/net-events.js` | Add `_makeObserver` factory; register I/J/K/L/M/X/Y/5/6/8/9 observe stubs with per-type counters in `state.netEventCounters` |
| `project-nozo-externals/dist/net-events.min.js` | Rebuilt |
| `project-nozo-externals/dist/*.min.js` (all others) | Rebuilt (10 others, obfuscator re-seed) |

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
| `25e0859` | Phase 13 - Render Takeover + Live Calibration |
| `df825b8` | Phase 13 - rebuild dist (obfuscator re-seed) |

Pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## What Changed and Why

### 1. RAF hard-block

`bridge.overrideRaf()` previously used a named passthrough proxy (`nozoRafProxy`)
that forwarded callbacks to the native RAF. Changed to a named no-op (`nozoRafBlock`)
that discards all callbacks and returns 0. Nozo's render and tick cycle is driven
exclusively by `setInterval` in `startTickLoop`. No game logic in Nozo depends on RAF
frame timing; the hard-block eliminates any native-RAF-vs-overlay draw-order races.
Log signal changed from `bridge:raf-overridden` (mode: passthrough) to
`bridge:raf-blocked` (mode: hard-block).

Native RAF is preserved in `Nozo.bridge._nativeRaf` for future use if needed.

### 2. Render pipeline expansion

Three new drawing primitives added to `render.js`:

**`_drawRangeRing(ctx, cx, cy, radius)`**
Draws a dashed semi-transparent white ring around the player screen center.
Radius is resolved from `Nozo.state.combat.weaponRange * state.scale` if set,
falling back to `35 * state.scale` (typical moomoo.io melee range). Called every
frame inside `draw()` after the aim arrow.

**`_drawTargetMarker` updated with `label` parameter**
Now accepts an optional 6th argument `label`. When present, renders the label text
in the matching ring color at `+3px` past the ring edge, with `textBaseline: middle`
for vertical alignment. Trap target uses label `"trap"` (red); autoBreak target uses
`"break"` (blue). Existing call sites without a 6th arg still work.

**`_drawHudText(ctx, lines, cw, ch)`**
Renders a stacked list of monospace strings in the bottom-left of the overlay canvas.
Each line is drawn twice: shadow pass (`rgba(0,0,0,0.5)` at +1px offset) then
foreground (`rgba(160,255,160,0.9)`). Lines are: `tick:<n>`, `aim:<source>` (when
`combatState.aimSource` is set), `reload:<ms>` (when `combatState.reloadGate` is
set). Only present lines are drawn; if all are absent, nothing is rendered.

### 3. Render toggle defaults

No changes needed. `state.enabled = true` at module load; `draw()` returns early
when disabled; `setEnabled()` logs the change. HTML panel toggle wires to
`Nozo.render.setEnabled(val)` and applies the persisted value at mount time.
No listener detach on disable — correct behavior per Phase 13 spec.

### 4. Event calibration pass

`_makeObserver(type)` factory added above the `registerMany` block. Returns a handler
that:
- Initializes `Nozo.state.netEventCounters` on first call.
- Increments `netEventCounters[type]` each invocation.
- Calls `Nozo.log("net:observe:<type>", { count, argc, sample })` on count 1 and
  every 100th occurrence thereafter.

Observe stubs registered for: `I` (loadAI), `J` (animateAI), `K` (gatherAnimation),
`L` (wiggleGameObject), `M` (shootTurret), `X` (addProjectile), `Y` (remProjectile),
`5` (updateStoreItems), `6` (receiveChat), `8` (showText), `9` (pingMap).

These were previously unregistered (`null`), causing silent drops. Now they are
observed and counted without full implementation. Live testing can inspect
`Nozo.state.netEventCounters` and `Nozo.debug.logs` to determine which need
full handlers next.

### 5. State hygiene

No broad try/catch swallows added. The single `try/catch` in `render.draw()` was
pre-existing (wraps the full draw pass, logs to `render:draw:error` — acceptable
guard for canvas operations that can throw on detached elements).
`liztobj`/`gameObjects`/`players`/`player` state ownership unchanged.

---

## @require order in project-nozo-next.user.js (pinned to df825b8)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/player.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@df825b8/dist/html.min.js
```

---

## Remaining Parity Risks

| Risk | Severity | Notes |
|------|----------|-------|
| RAF hard-block vs game state updates | Medium | Native game RAF loop is now fully blocked. If moomoo.io game logic (positions, animations, game state) is updated inside RAF callbacks rather than server packets, those updates will stop. Phase 14 should verify with live testing; if game visuals freeze, switch back to passthrough. |
| `state.scale` is always 1 | Medium | `_worldToScreen` and `_drawRangeRing` both use `state.scale`. No code sets it dynamically yet. The range ring will always be 35px radius regardless of game zoom level. Phase 14 should detect and apply the actual render scale from the game canvas transform. |
| Observe stubs: arg layout unknown | Medium | I/J/K/L/M/X/Y/5/6/8/9 handlers capture `arguments` but the logged `sample` field is the only way to see the live layout. Phase 14 should upgrade the highest-frequency observed types (likely X/Y for projectiles, K for gather animation) to full handlers. |
| `combat.weaponRange` never set | Low | Phase 13 range ring falls back to 35px. Combat module does not currently track weapon range as a separate state field. Phase 14 should add weapon range lookup to `Nozo.combat` based on current held weapon. |
| HUD shows stale reload if combat inactive | Low | `combatState.reloadGate` is only set when combat sends a packet. Between swings it shows the last value, not a live countdown. Phase 14 should make reload gate a live computed value (timestamp diff). |
| Dead players not pruned | Low | `state.players` accumulates dead records (alive=false). `getAlivePlayers()` helper was deferred. Phase 14 should either add this helper or prune on a grace period to bound memory. |

---

## Recommended Phase 14 Scope

**Phase 14 — Live Verification + Scale + Handler Promotion**

1. **Live test RAF hard-block**: verify game state (player positions, object movement) still updates during gameplay. If broken, add a limited passthrough for known-safe game RAF IDs.
2. **Dynamic scale factor**: detect canvas `devicePixelRatio` and game zoom from the canvas transform matrix; apply to `state.scale` so range ring and world-to-screen calculations reflect actual display geometry.
3. **Promote X/Y handlers**: implement `addProjectile` (X) and `remProjectile` (Y) with a `state.projectiles` map; expose `Nozo.state.projectiles` for aim avoidance.
4. **Combat weaponRange**: add `weaponRange` field to `Nozo.state.combat` based on current held weapon index and items table; removes the 35px fallback from range ring.
5. **Reload gate live countdown**: track `lastSwingAt` timestamp in combat; HUD reload display becomes `Date.now() - lastSwingAt` vs threshold.
6. **Calibrate high-frequency observe events**: review live logs for I/J/K (AI and gather animation); implement or explicitly suppress the ones confirmed as non-critical.
7. **Promote K handler** (gatherAnimation): likely high-frequency; implement lightweight visual flash on gather rather than full logging.
