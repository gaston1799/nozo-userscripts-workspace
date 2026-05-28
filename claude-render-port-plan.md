# Render Port Plan — NozoNext Full Render Loop Takeover

**Status:** Analysis complete  
**Source:** moomoo.js (43 544 lines)  
**Target:** project-nozo-next.user.js + project-nozo-externals/src/render.js  
**Date:** 2026-05-20

---

## 1. Render Loop Architecture (Current State)

### 1.1 Entry-Point Chain

```
page loads → doUpdate() called once (line 44779)
              └─ doUpdate() (line 44597)
                  ├─ updateAnimationState(delta)   ← ALWAYS runs, render-gated or not
                  ├─ FPS accumulator gate check
                  ├─ updateGameNew()               ← runs only when shouldRender
                  └─ rAF(doUpdate)                 ← self-reschedules
```

`rAF` is assigned at line 44483:
```js
unsafeWindow.rAF = (function () {
    return unsafeWindow.requestAnimationFrame || /* vendor fallbacks */
        function (cb) { unsafeWindow.setTimeout(cb, 1000/60); };
})();
```

`unsafeWindow.requestAnimFrame` is **nullified** at line 44480 (returns `null`).

**No RAF ID is stored** — there is no native `cancelAnimationFrame` call for the main loop. Killing the loop requires making `rAF(doUpdate)` a no-op or intercepting `rAF` itself.

### 1.2 `doUpdate()` internals (line 44597)

```
doUpdate()
 1. Update DOM status elements (packetStatus, pingFps)
 2. Compute frameNow = performance.now(); track _rafIntervalMs (EWMA)
 3. delta = frameNow - lastUpdate; clamp to 100 ms
 4. updateAnimationState(delta)            ← simulation/interpolation always runs
 5. Accumulate _renderAccumulator += delta
 6. shouldRender = !shouldGate || accumulator >= minFrame
 7. Update fpsTimer
 8. renderAutoMoveDebugMenu()
 9. If !shouldRender → rAF(doUpdate); return   (skip render this frame)
10. updateGameNew()                             ← full render call
11. Bot-view image capture/display logic
12. rAF(doUpdate)                               ← self-reschedule
```

---

## 2. Render Responsibilities Map (`updateGameNew`, line 43099)

### 2A. `disableRender` fast path (line 43113)
When `window.disableRender` is truthy the function clears the canvas and draws only
a minimal tactical overlay before returning early:

| Order | Responsibility | Globals/deps |
|-------|---------------|--------------|
| 1 | `clearRect` full canvas | `mainContext` |
| 2 | Team/enemy spike circles (gameObjects) | `gameObjects`, `player` |
| 3 | Own traps (cyan) / enemy traps (orange) | `gameObjects`, `player.sid` |
| 4 | Hammer/insta spot ring + LOS line | `_things.instaSpot`, `_things._instaRender` |
| 5 | Self-dot (blue), teammate dots (green), enemy dots (red) | `players`, `player` |
| 6 | Push line + autopush guide + `RenderPush` | `my.pushLine`, `_things.autoPushChain`, `_things.pushVis_` |
| 7 | `renderMinimap(delta, { compute:true, draw:false })` — compute only | `mapDisplay`, `mapContext`, `config` |
| — | **return** | |

### 2B. Full render path (line 43427, `drawFull = true`)

| Order | Layer | Function(s) | Key Deps |
|-------|-------|-------------|----------|
| 1 | **Biome background fill** | `fillRect` × 1–3 | `config.snowBiomeTop`, `config.mapScale`, `style.biome` |
| 2 | **Neon grid / seam overlays** | `renderBiomeNeonLayers()` | `xOffset`, `yOffset`, `style` |
| 3 | **Water base** | `renderWaterBodies()` with `W.base.fill` | `config.riverPadding`, `waterMult` |
| 4 | **Water wave** | `renderWaterBodies()` with `W.wave.fill` | `waterMult` (animated by `updateAnimationState`) |
| 5 | **Background / night style** | `renderBackground()`, `renderStyleGrid()` | `style`, `isNight`, `useWasd` |
| 6 | **Death marker** | `fillText` at `lastDeath.{x,y}` | `player`, `lastDeath`, `style.markers` |
| 7 | **Dead players** | `renderDeadPlayers(xOffset, yOffset, {draw:drawFull})` | `players`, `outlineColor` |
| 8 | **Bottom game objects (layer −1)** | `renderGameObjects(-1, ...)` | `gameObjects`, `objSprites`, `itemSprites` |
| 9 | **Projectiles (layer 0)** | `renderProjectiles(0, ...)` | projectile list, `items` |
| 10 | **Players (layer 0)** — body behind weapons | `renderPlayers(xOffset, yOffset, 0, ...)` | `players`, skin/tail sprite caches |
| 11 | **AI entities** | `renderAI()` + translate/rotate | `ais`, `outlineColor` |
| 12 | **Game objects (layer 0)** | `renderGameObjects(0, ...)` | `gameObjects` |
| 13 | **Projectiles (layer 1)** | `renderProjectiles(1, ...)` | |
| 14 | **Game objects (layer 1)** | `renderGameObjects(1, ...)` | |
| 15 | **Players (layer 1)** — weapons in front | `renderPlayers(xOffset, yOffset, 1, ...)` | |
| 16 | **Game objects (layers 2 & 3)** | `renderGameObjects(2, ...)`, `renderGameObjects(3, ...)` | |
| 17 | **KBI animations** | `renderKbiAnimations()` | `_things.showKbiRender` |
| 18 | **Map boundary shadow** | `fillRect` ×4 (dark vignette at map edges) | `config.mapScale`, offsets |
| 19 | **Cluster / camp point / push geometry** | `renderClusterLogic`, `drawPushGuideWithArc`, `RenderPush` | `_things.calcR`, `_things.pushVis_`, `_things.autoPushChain` |
| 20 | **Player/AI UI (health bars, labels, reload)** | `renderPlayerStyled()` | `style`, `items`, `player` |
| 21 | **Enemy range ring, lead point, dodge geometry** | inline ctx calls | `_things.enemyRange`, `_things.dodgePlan` |
| 22 | **Insta HUD card, danger sims, cached paths** | `renderInstaHudCard`, inline | `_things.instaHUD`, `_things.sim`, `_things.cachedPath` |
| 23 | **Animated text** | `textManager.update(delta, ctx, ...)` | `textManager`, `delta` |
| 24 | **Chat bubbles** | inline per-player `fillText`/`roundRect` | `players`, chat timers |
| 25 | **Minimap** | `renderMinimap(delta, { compute:true, draw:true })` | `mapDisplay`, `mapContext`, `config` |

### 2C. `updateAnimationState(delta)` — simulation runs every frame

| Responsibility | State Written |
|---------------|---------------|
| Camera smooth interpolation | `camX`, `camY` |
| Player/AI position lerp | `tmpObj.x`, `tmpObj.y`, `tmpObj.dir` |
| Chat message expiry | `player.chatMessages` |
| Petal orbit/respawn | `petal.x/y/alpha/visScale/health/active` |
| Water wave animation | `waterMult` |
| `instaRingTime` increment | `instaRingTime` |
| AI `animate(delta)` calls | per-AI internal state |

> **Blocker**: `updateAnimationState` runs inside moomoo's `doUpdate` RAF loop. If that
> RAF is hard-blocked, interpolated positions stop updating — entities freeze in place.
> The Nozo tick loop (50 ms / 20 Hz) does NOT call `updateAnimationState`.

---

## 3. Global Dependency Inventory

| Global | Source | What uses it |
|--------|--------|-------------|
| `mainContext` | `gameCanvas.getContext("2d")` (line 14582) | All canvas draw calls in `updateGameNew` |
| `gameCanvas` | `getEl("gameCanvas")` (line 14581) | Width/height, `clearRect`, `toDataURL` |
| `camX`, `camY` | Written by `updateAnimationState` | Compute `xOffset`/`yOffset` |
| `xOffset`, `yOffset` | `= camX - maxScreenWidth/2` | World→screen coordinate shift |
| `maxScreenWidth/Height` | `config.maxScreenWidth/Height` (line 14604) | Clip rects, camera math |
| `player` | Server packet, lives in moomoo closure | Player-relative rendering |
| `players` | Server packet array | All visible players |
| `ais` | Server packet array | AI entities |
| `gameObjects` | Server packet array | Placed objects (traps, trees…) |
| `_things` | `unsafeWindow._things` (line 24044) | Nozo state bridge |
| `config` | Game config object (`window.config`) | Biome sizes, update rate |
| `style` / `getActiveStyle()` | Defined in moomoo.js closure | Visual theme |
| `delta`, `now` | Computed in `doUpdate` | Animation timing |
| `outlineColor`, `darkOutlineColor`, `outlineWidth` | Constants (line 14619) | Stroke style |
| `isNight` | Day/night flag | Background color, shadow |
| `waterMult` | `updateAnimationState` | Animated water edge |
| `items` | Item definitions | Sprite generation, HUD |
| `textManager` | moomoo.js closure | Floating damage/text |
| `tracker` | moomoo.js closure | Debug draw points |
| `gameObjectSprites` | Lazy offscreen canvas cache | Reduce re-render cost of static objects |
| `itemSprites` | Lazy offscreen canvas cache | Same |
| `fpsTimer` | `doUpdate` closure | FPS display |

---

## 4. What Must Be Ported First (Critical Path)

To produce a **visually correct full frame** from a Nozo-owned RAF, these pieces
must be in place before `updateGameNew` is replaced:

### Priority 0 — Pre-conditions (must exist before switching RAF)
1. **`Nozo.bridge.overrideRaf()`** already called (it is, in `Nozo.start()`).
2. **Mode is still `"passthrough"`** — moomoo's `doUpdate` is still running and writing
   `camX/camY`, interpolated positions, `waterMult`, etc.
3. **`Nozo.state.player`** populated via `net-events.js` (already wired).
4. **`unsafeWindow._things`** readable from Nozo (`Nozo.globals` proxies it).

### Priority 1 — Simulation decoupling (port `updateAnimationState` equivalents)
- Camera lerp must run every RAF tick from Nozo's scheduler.
- Entity position interpolation must continue or entities freeze.
- Water wave increment must run to keep animated water alive.

### Priority 2 — Canvas context hand-off
- Nozo must acquire `mainContext` and `gameCanvas` references.
  Safe grab: `document.getElementById("gameCanvas").getContext("2d")`.
- Must also acquire `maxScreenWidth`, `maxScreenHeight` from `window.config`.
- `xOffset/yOffset` are trivially derived once camX/camY are owned.

### Priority 3 — Render dispatch
- Port or proxy all render sub-functions that are currently moomoo.js closures.
  **Minimum viable set**: `renderBackground`, `renderGameObjects`, `renderPlayers`,
  `renderProjectiles`, `renderAI`, `renderMinimap`.
- Style/theme (`getActiveStyle()`) must be accessible — expose via `window._things`
  or a new `Nozo.style` hook.

---

## 5. Staged Migration Plan

### Stage 1 — Validate Nozo overlay without touching native RAF
**Goal:** Confirm Nozo's overlay canvas (`nozoRenderOverlay`) is drawing correctly
alongside the native game render. No RAF change.

- Ensure `Nozo.render.attach()` runs successfully after game starts.
- Confirm `Nozo.bridge.tick` at 50 ms calls `Nozo.render.draw()` each tick.
- Validate `state.scale` is correct (check `game.scale`/`camera.scale` or viewport).
- **Parity check**: overlay aim arrow should match the native game's direction indicator.

### Stage 2 — Inject Nozo render call into passthrough RAF path
**Goal:** Have Nozo draw its overlay as a piggyback on top of moomoo's own RAF
frame (before moomoo's self-reschedule).

Strategy: After `overrideRaf()` sets `_rafMode = "passthrough"`, wrap the RAF gate
so Nozo's overlay draw fires *after* each moomoo frame completes:

```js
// In project-nozo-next.user.js (after overrideRaf called):
const _origRaf = Nozo.bridge._nativeRaf;
Nozo.bridge._nativeRaf = function nozoInjectedRaf(cb) {
    return _origRaf.call(root, function injectedFrame(ts) {
        cb(ts);                        // moomoo's doUpdate runs
        if (Nozo.render && Nozo.render.draw) {
            try { Nozo.render.draw({}); } catch (e) {}
        }
    });
};
```

This keeps zero visual disruption while confirming frame-timing alignment.

### Stage 3 — Port simulation out of native RAF
**Goal:** Move `updateAnimationState`-equivalent logic into Nozo tick loop so
entities keep interpolating when moomoo's RAF is eventually blocked.

- Add `Nozo.bridge.updateAnimations(delta)` that replicates:
  - Camera lerp (needs `player.x/y`, `config.smoothCamera`)
  - Entity x/y/dir lerp (needs t1/t2/x1/x2 fields from net-events)
  - `waterMult` increment
  - AI `.animate(delta)` calls
- Drive it from a `requestAnimationFrame` loop owned by Nozo (separate from
  moomoo's `rAF(doUpdate)` chain).

### Stage 4 — Switch RAF mode to `"hard-block"`, run Nozo render loop
**Goal:** Kill moomoo's `doUpdate` self-reschedule; Nozo owns the full frame.

```js
// When ready to take over:
Nozo.bridge.setRafMode("hard-block");  // drops all rAF(doUpdate) calls
// Nozo's own RAF loop must already be running (from Stage 3)
```

After blocking, the only frames drawn are from Nozo's loop. That loop must call:
1. `Nozo.bridge.updateAnimations(delta)` — simulation step
2. `updateGameNew()` (via `window.updateGameNew` if exposed, or rebuilt equivalent)
3. `Nozo.render.draw(ctx)` — overlay on top

**Safest route**: expose `updateGameNew` on `unsafeWindow` before switching mode:
```js
// Add to moomoo.js or inject at runtime before hard-block:
unsafeWindow.updateGameNew = updateGameNew;
```
Then call `unsafeWindow.updateGameNew()` from Nozo's RAF.

### Stage 5 — Overlay stays separate; HUD/reload UI migrates to Nozo canvas
**Goal:** `nozoRenderOverlay` is never cleared by `mainContext.clearRect` (it's a
different element). The HUD text, aim arrow, reload ring, and debug info stay on
the overlay. The underlying `gameCanvas` is owned by moomoo's render sub-functions.

For the debug/reload overlay, keep calling `Nozo.render.draw()` after each game
frame — no change needed.

### Stage 6 — (Optional) Full canvas takeover — replace `updateGameNew`
**Goal:** Rewrite world/player/object render entirely in Nozo for full control.

This is the longest stage and requires porting ~500 lines of render sub-functions.
Port order: background → water → game objects → players → projectiles → AI → HUD.
Each sub-function can be ported and validated one at a time while the original
runs as a fallback.

---

## 6. Killing the Original RAF Safely

```js
// Safe two-step shutdown:

// Step 1 — Install Nozo simulation loop (Stage 3 prerequisite):
let _nozoRafId = null;
function nozoAnimLoop(ts) {
    const delta = /* track prev ts */;
    Nozo.bridge.updateAnimations(delta);
    Nozo.render.draw({});
    // call updateGameNew only if Stage 4 is active:
    if (Nozo.bridge._rafMode === "hard-block") {
        try { unsafeWindow.updateGameNew && unsafeWindow.updateGameNew(); } catch (e) {}
    }
    _nozoRafId = Nozo.bridge._nativeRaf.call(root, nozoAnimLoop);
}
_nozoRafId = Nozo.bridge._nativeRaf.call(root, nozoAnimLoop);

// Step 2 — Block moomoo's rAF chain:
Nozo.bridge.setRafMode("hard-block");
// moomoo.js's own rAF(doUpdate) at line 44697 now returns 0 / no-op
// doUpdate stops self-rescheduling → loop dies on next frame
```

**Why this is safe**: `Nozo.bridge._nativeRaf` is the captured pre-override
native RAF. Nozo's simulation loop uses it directly and never goes through the
gated `root.requestAnimationFrame` that moomoo uses, so the block does not
affect Nozo's own loop.

---

## 7. Overlay Separation Strategy

The `nozoRenderOverlay` canvas is inserted **before** `gameCanvas` in the DOM
(render.js line 67: `gameCanvas.parentNode.insertBefore(el, gameCanvas)`) with
`z-index: 10` and `pointer-events: none`.

Rules:
- **Never** call `clearRect` on `mainContext` from `Nozo.render.draw` — that
  would wipe the game world.
- `Nozo.render.draw()` clears only its own canvas (`state.context.clearRect`).
- All debug/reload/HUD overlays stay on `nozoRenderOverlay`.
- `mainContext` (`gameCanvas`) is exclusively used by `updateGameNew()` /
  moomoo's render sub-functions.
- In Stage 6 (full takeover), Nozo clears `mainContext` itself at frame start.

---

## 8. Parity and Performance Validation

### Visual parity checklist
- [ ] Player positions align: compare `player.x2/y2` vs rendered dot position.
- [ ] Camera lerp: entity motion smoothness same as native at identical FPS.
- [ ] Biome boundaries: snow/grass/desert transitions at same pixel columns.
- [ ] Spike/trap circles match native outlines (check `getScale()` usage).
- [ ] Reload arc timing: `combatState.lastSwingAt` elapsed vs native bar.
- [ ] Minimap: player/object positions ± 1 pixel of native.
- [ ] `textManager` floating text fades at same rate (depends on `delta` accuracy).

### Performance checkpoints
- `updateAnimationState` cost: ~0.5–2 ms/frame; safe to run every RAF tick.
- Sprite caches (`gameObjectSprites`, `itemSprites`): lazy-built, ~O(1) after warmup.
  Do not flush caches during takeover.
- `renderWaterBodies` is the heaviest background call; measure with `performance.mark`.
- `renderMinimap` reads many objects; flag `compute:false` if not shown to save CPU.
- Nozo tick at 50 ms (20 Hz) is separate from RAF (60 Hz). Ensure no double-execution
  of heavy logic (e.g., raycast in `renderPushOverlay`) in both loops simultaneously.

### Performance regression signals
- FPS drop > 5 after Stage 4 activation → likely double render or missing gate.
- `_renderAccumulator` not clearing → FPS cap logic was depending on moomoo's gate.
- AI entities jerky → `animate(delta)` called at wrong cadence.

---

## 9. Hard Blockers and Unknowns

### B1 — `updateAnimationState` is a closure (HARD BLOCKER for Stage 3)
`updateAnimationState` is defined inside moomoo.js's game callback closure and
captures `camX`, `camY`, `players`, `ais`, `waterMult`, `instaRingTime`, `petals`,
`config`, `delta`, and several DOM refs by closure. **It cannot be called from
outside without reflection or exposure.**

**Resolution options:**
1. Expose via `unsafeWindow.updateAnimationState = updateAnimationState` (add to
   moomoo.js or inject before its scope closes).
2. Re-implement the camera lerp and entity lerp in Nozo using only fields
   accessible through `_things.player`, `Nozo.state.players`, etc.
3. Keep moomoo's RAF alive (passthrough mode) for simulation; only block
   `updateGameNew` calls (not yet possible without modifying moomoo.js).

**Extra instrumentation needed:** Log `player.x vs player.x2` at each Nozo tick
to confirm Nozo state (`Nozo.state.player`) stays in sync with moomoo's interpolated
positions.

### B2 — `rAF` is set at line 44483 AFTER `updateGameNew` is defined
The line `unsafeWindow.rAF = ...` runs only when the game connection completes
(inside an async callback). If `overrideRaf()` is called before this point, the
override will be clobbered. **Current `Nozo.start()` calls `overrideRaf()` before
this line runs.**

**Resolution:** After moomoo assigns `unsafeWindow.rAF`, Nozo must re-intercept it,
or store the native before moomoo assigns it. Add a MutationObserver or property
descriptor trap on `unsafeWindow.rAF` to detect and re-wrap after assignment.

### B3 — No stored RAF ID means no `cancelAnimationFrame` path
The main loop (`doUpdate → rAF(doUpdate)`) never stores a handle. You cannot
cancel it via the standard API. The only kill mechanism is the gate:
`_rafMode = "hard-block"` causes `rAF(cb)` to return 0 without scheduling `cb`,
so `doUpdate` never fires again after its current frame ends.
This is the intended mechanism and is already implemented correctly.

### B4 — `style` / `getActiveStyle()` is a moomoo.js closure
The visual theme object is computed internally. If Nozo needs it for a full
rewrite (Stage 6), `getActiveStyle()` must be exposed on `unsafeWindow`.

### B5 — `renderMinimap` writes to `mapContext` (a separate canvas)
The minimap canvas (`mapDisplay`) is separate from `gameCanvas`. Nozo's overlay
does not interfere. However, if Nozo takes over `updateGameNew`, it must also
call `renderMinimap` or the minimap goes blank. This requires exposing the function.

### B6 — `_things.sim`, `_things.dodgePlan`, etc. are written from moomoo's game loop
These combat state fields are computed inside moomoo.js callbacks, not in
`updateGameNew`. They will be present as long as the WebSocket message handlers
continue to run (they are net-event driven, not RAF-driven). No action needed
for Stages 1–4.

### Unknown — `getActiveStyle()` caching interval
Style may cache internally. Unknown whether reading it from Nozo's RAF schedule
is safe without the style ticker running. Needs empirical test.

---

## 10. Recommended First Three Actions

1. **Expose `updateAnimationState` and `updateGameNew` on `unsafeWindow`** by
   injecting two assignments immediately before the `doUpdate()` first call at
   line 44779:
   ```js
   unsafeWindow.updateAnimationState = updateAnimationState;
   unsafeWindow.updateGameNew = updateGameNew;
   ```
   This unblocks Stage 3 and Stage 4 without any behavioral change.

2. **Re-intercept `unsafeWindow.rAF` after moomoo assigns it** (post line 44490)
   to ensure `setRafMode("hard-block")` controls both `requestAnimationFrame` and
   the `rAF` alias. Add a one-shot setter trap or poll-detect after connection.

3. **Instrument `doUpdate` frame budget** by measuring `updateAnimationState`
   and `updateGameNew` separately with `performance.mark/measure` for one session.
   This gives the baseline to detect regression after each migration stage.
