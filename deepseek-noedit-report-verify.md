# DeepSeek Watch Result

## Final Response

Here is my analysis report.

---

# NozoSingle Port State Report

## Findings

### 1. Where `gameObjects` Scans Still Hit Hot Paths

The main hot path is `PlayerRuntime._ha(p, data)` (packet `a` / `updatePlayers`). Inside the loop over `tupleList` (each player update), lines **~5170–5340** do a **full `gameObjects` scan per tick** for:

| Scan | Line area | Purpose | Could switch to `liztobj`? |
|---|---|---|---|
| Turret range check + break-obj logic | ~5189–5220 | `gameObjects` loop checking `tmpDist <= tmp.scale + weaponRange`, turret count, break distance | **Yes** – this is the on-screen near-target scan |
| `nearObjsTmp` build (dist <= 500) | ~5218 | Builds `root.nearObjs` sorted by distance | **Yes** – strictly nearby |
| Trap/spike proximity scan | ~5224–5240 | Checks `.trap` and spike name on `gameObjects` | **Yes** – all within player range |
| Second `liztobjRef` loop | ~5247–5297 | Redundant re-check of break-obj / onNear / trap state on `liztobjRef` | **Partial** – duplicates work done in the first loop |

**Outside `_ha`:**

- `Traps.testCanPlace()` (~1784): Iterates `_ctx.gameObjects.forEach` to build a placement collision array. This runs in a nested scan loop inside `_ha()`. **Should use `liztobj`** – off-screen objects cannot block spike placement near the player.
- `Traps.checkSpikeTick()` (~1865): `_ctx.gameObjects.find(...)` for spike/dmg objects.
- `Traps.autoReplace()` (~2297): `_ctx.gameObjects.find` for near-trap detection.
- `Instakill.hammerInsta()` (~2997) and `hammerInsta2()` (~3056): `gameObjects.filter(e => e.trap...)` for trap finding.
- `Instakill.oneTickType()` (~3570) and `tickMovement()` (~3795): Same pattern.
- `Traps_.autoReplace()` (~2818): `_ctx.gameObjects.find`.

### 2. Scans That Must Stay Global

A few scans genuinely need the full `gameObjects` array:

- **Resource cache sync** (`syncResourceCacheFromObjects` at ~4571) — needs to see all objects to update `resourceCache` maps (trees, bushes, stones, etc.). Off-screen resources should be kept cached regardless of render state.
- **Pathfinder grid building** (`_buildPathGridAndGoal` at ~4766) — iterates `this.gameObjects` to mark collision cells. This runs on-demand (user pathfinding), not per-tick, so performance is not critical.
- **AI scanning for `perfCheck`** (~3885) — checks `gameObjects.filter(tmp => tmp.active)` for line-of-sight collision. This is called by instakill logic and may need objects outside `liztobj` range.

### 3. `liztobj` Maintenance vs Original `moomoo.js`

In `moomoo.js`, `liztobj` is maintained by the game's render culling system — it is a side effect of the rendering pipeline.

In the port, `liztobj` is rebuilt in **`calledTickCalc()`** (lines ~4765–4791) with a simple distance check:

```js
const inRange = Number(defaultRange.range || 1000);
// ...
if (d <= inRange) { nextLiz.push(tmp); tmp.render = true; }
else { tmp.render = false; }
```

**Concerns:**
- The range (`1000`) is a hardcoded default — `moomoo.js` may use screen-space culling (camera bounds + padding), not a fixed pixel radius. This could miss far objects that the original render code would still include, or include objects off-screen.
- The original `liztobj` assignment in `moomoo.js` is more tightly coupled to the render loop (`checkObjectsPOV`). This port's `liztobj` update only happens inside `calledTickCalc`, which is invoked from `_ha`. If `calledTickCalc` is not called on every render frame, `liztobj` becomes stale.
- `closeObjects` is set to the same array as `liztobj` (line ~4790), which may not match original behavior where `closeObjects` was a smaller subset for interactable objects within interaction range.

### 4. `traps.inTrap` — Likely Functional but Has Gaps

The `inTrap` flag is set inside `_ha()` at lines **~5266–5290**:

```js
if (nearTrap) {
    this.traps.dist = nearTrapDist;
    this.traps.aim = UTILS.getDirect(nearTrap, tmpObj, 0, 2);
    if (!this.traps.inTrap) this.traps.protect(this.traps.aim);
    this.traps.inTrap = true;
    this.traps.info = nearTrap;
} else {
    this.traps.inTrap = false;
    this.traps.info = {};
}
```

**Logic gaps:**
- The scan checks `liztobjRef` (line ~5247), which depends on `calledTickCalc` having run already. But `calledTickCalc` is called *after* this trap detection section ends (line ~5368). On first tick, `liztobj` may be empty or stale.
- `traps.inTrap` is reset to `false` if `liztobjRef` is empty (the `else` at line ~5297), but this is nested inside the `if (liztobjRef.length)` branch. If `liztobjRef` is empty, `traps.inTrap` is never updated at all — it keeps whatever value it had from the previous tick.
- The `protect()` call (line ~5273) triggers on first detection of a trap. This matches original behavior at a high level.

**Conclusion**: `traps.inTrap` *will mostly work* during active gameplay when `liztobj` is populated, but the first-tick ordering issue means the initial trap detection may lag by one tick. It is **safe enough to proceed**, but the ordering dependency merits a fix.

### 5. Risky Hot Paths (Ranked)

| Risk | Location | Reason |
|---|---|---|
| **HIGH** | `_ha()` full `gameObjects` scan (~5170–5220) | Runs on every packet `a` (multiple times/sec), iterates *all* objects even when only nearby ones matter |
| **HIGH** | `_ha()` double scan (gameObjects + liztobj) ~5247 | Scans both arrays with near-identical logic; liztobj scan is redundant |
| **MEDIUM** | `Traps.testCanPlace()` ~1784 | Called from within `_ha()` via `autoPlace` — scans full `gameObjects` for collision |
| **MEDIUM** | `Instakill.*` trap filters | Multiple instakill methods scan `gameObjects` for traps instead of `liztobj` |
| **LOW** | `calledTickCalc` liztobj rebuild | Iterates `gameObjects` but only once per tick — reasonable |
| **LOW** | Pathfinder grid build | On-demand only |

---

## Next Step Recommendation

### Safest next step: **Migrate the `_ha()` inner `gameObjects` scan to `liztobj`**

**Concrete plan:**

1. **Replace the main `gameObjects` loop in `_ha()`** (lines ~5170–5220) with an equivalent loop over `liztobjRef`. The objects that matter here are all near the local player:
   - Turret range check (`UTILS.getDist(p, tmp, 2, 0) < 680`)
   - Break-obj distance check
   - `nearObjsTmp` (dist <= 500)
   - Trap/spike proximity

   The only exception is the turret count scan (`turretsCanHit`) — if the turret is far away but another player activates it, you still want to count it. But realistic gameplay puts turrets near their owners, so `liztobj` coverage is sufficient.

2. **Eliminate the redundant `liztobjRef` second loop** (lines ~5247–5297). Move trap/spike/breaker logic into the first loop, keyed from the unified near-object pass.

3. **Fix the `liztobj`/`calledTickCalc` ordering in `_ha()`**: Move `this.calledTickCalc(p)` to execute **before** the trap/breaker scan section, so `liztobj` is fresh.

4. **Outside `_ha()` — quick wins:**
   - `Traps.testCanPlace()`: Receive a `nearObjs` or `liztobj` reference instead of scanning `gameObjects`.
   - `Instakill.hammerInsta/hammerInsta2`: Replace `gameObjects.filter(e => e.trap...)` with lookup via a pre-built trap-scan result (which `_ha()` already does and stores in `localScans.nearTrap`).

### Implementation order (safest first):

1. Reorder `calledTickCalc` before the trap scan in `_ha()`
2. Replace main `gameObjects` scan with `liztobjRef` scan in `_ha()`
3. Merge the redundant second `liztobjRef` loop into the first
4. Push `liztobj` reference into `Traps`/`Traps_` methods that currently scan `gameObjects`
5. Push trap-scan results into `Instakill` to avoid repeated `gameObjects.filter`

### What to defer:

- **Pathfinder grid** — fine as-is, not a hot path.
- **Resource cache sync** — keep on full `gameObjects`, runs once per tick and is not CPU-bound.
- **`liztobj` range tuning** — the default 1000px may need adjustment, but that's a tuning step after migration.

---

## No-Edit Confirmation

This is a **read-only analysis**. No files were created, modified, or deleted. All observations are based on reading `project-nozo-single.user.js` (7,058 lines) with reference to `moomoo.js` structure.

## Files Touched

- None
