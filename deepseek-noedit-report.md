# DeepSeek Watch Result

## Final Response

I now have enough data from the full `project-nozo-single.user.js` read. Here's the analysis.

---

## NozoSingle Port Analysis Report

### 1. Which `gameObjects` scans are still in hot paths and should probably switch to `liztobj`?

**Confirmed hot-path `gameObjects` full scans (should use `liztobj`):**

| Location (line area) | Scan | Risk |
|---|---|---|
| `_ha` ~5180–5330 | `gameObjectsRef` loop building `nearObjsTmp`, break-range detection, turret count, trap/spike proximity | **High** — runs every tick for every enemy player in the tuple. Full `gameObjects` scan for each enemy processed. |
| `Traps.testCanPlace` ~1770 | `gameObjects.forEach` to snapshot blocker geometry | **High** — called per placement attempt (can be multiple per tick). Builds a temporary snapshot clone. |
| `Traps.autoPlace` ~2300 | `gameObjects.filter` for near-trap detection inside the legacy autoPlace fallback | **Medium** — only runs on autoPlace ticks (every Nth tick), but still a full scan. |
| `Traps_.autoReplace` ~2900 | `gameObjects.find` for near-trap detection | **Medium** — runs on autoReplace trigger events. |
| `calledTickCalc` ~4900 | Full `gameObjects` iteration for `liztobj` construction (the *current* impl of `liztobj`) | **High** — every tick, this is where `liztobj` itself is built. |
| `Instakill.oneTickType` ~3530 | `gameObjects.filter` for trap proximity search in one-tick insta | **Low** — only on insta activation. |
| `Instakill.tickMovement` ~3880 | Same pattern | **Low** — only on tick movement path. |
| `Traps_.checkSpikeTick` ~2560 | `gameObjects` loop scanning spikes/turrets for knockback prediction | **Medium** — runs when enemy is close (<175). |

**`liztobj` is already used for:**
- `Traps.autoPlace` radObjs filtering (line ~2140 `_ctx.nearObjs`)
- `_ha` AutoBreaker priority filtering (lines ~5330–5360, uses `liztobjRef`)
- `_ha` nearObjs computation uses `liztobjRef` as supplement after the main `gameObjectsRef` scan

### 2. Which scans must stay global because they need off-screen or far map objects?

- **Pathfinder grid building** (`_buildPathGridAndGoal` ~4750–4780): Must scan all active `gameObjects` for obstacle coverage. The grid spans the player's local area (~1400px), so `liztobj` (range ~1000px) is *almost* sufficient but misses edge cases. Could arguably use `liztobj` since pathfinding range ≈ liztobj range.
- **Build break-range detection** in `_ha` ~5220: `breakRange` default is 700, which is within liztobj range (~1000). **Could use liztobj.**
- **Turret count** in `_ha` ~5220: checks turrets within 680px range. **Within liztobj range.**
- **Resource cache sync** (`syncResourceCacheFromObjects` ~4590): Needs global scan because resources outside view still need tracking for farming. `liztobj` would miss off-screen resources. **Must stay global.**

**Verdict**: The vast majority of hot-path scans can switch to `liztobj`. Only `syncResourceCacheFromObjects` and possibly edge-case pathfinding really need the full list.

### 3. Is `liztobj` currently maintained in a way that matches the original `moomoo.js` behavior closely enough?

**Current `liztobj` implementation** (lines 4885–4908 in `calledTickCalc`):
```
const inRange = Number(defaultRange.range || 1000);
for (let i = 0; i < gameObjects.length; i++) {
    const d = Math.hypot(tx - px, ty - py);
    if (d <= inRange) {
        nextLiz.push(tmp);
        tmp.render = true;
    } else {
        tmp.render = false;
    }
}
root.liztobj = nextLiz;
```

This runs **once per tick** inside `calledTickCalc`, which is called from `_ha` (~5396). It iterates `gameObjects` (full scan) and filters by Euclidean distance from `player.x/player.y` (using position from the *local* player's tuple update, not interpolated).

**Known deviations from original moomoo.js:**
- The original `moomoo.js` builds `closeObjects` / `liztobj` from the game's render loop using *screen-space* culling, not raw distance. The port uses a flat 1000-unit radius. The original was viewport-based (object must be within the visible canvas + margin).
- The original writes `closeObjects` as a separate culled list. The port sets both `game.setState("liztobj", lizLive)` and `game.setState("closeObjects", lizLive)` (line ~4909) — i.e. they are identical, which may not match the original where `closeObjects` was a separately maintained subset (often only objects within render distance with additional filtering).
- The port toggles `tmp.render` (line 4901/4906), which likely matches the original intent but is only done in `calledTickCalc`, not in all object-hiding paths.
- The `liztobj` is only recomputed once per `_ha` call — if game state is applied mid-frame, `liztobj` may be stale. This matches original behavior since original also recomputed per render frame, not mid-packet.

**Uncertainty**: Without seeing the exact original `liztobj` construction in `moomoo.js` (11MB file), I can't verify viewport→distance equivalence. The distance-based approach could include/exclude different objects than viewport-based culling.

### 4. Is `traps.inTrap` likely to work from the current port, or are there logic gaps?

**Current trap detection logic** (lines 5323–5348 in `_ha`):
```
const nearTrap = localScans.nearTrap;  // scanned from gameObjects
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

This is gated on `liztobjRef.length > 0` and only runs when processing the local player (line ~5208: `if (p.sid == tmpObj.sid)`).

**Logic gaps identified:**

1. **`localScans.nearTrap` uses the enemy player's body as reference, not world geometry.** The condition `trapDist <= (tmpObj.scale + trapScale + 5)` checks if the trap overlaps the enemy's body. This correctly detects when an enemy is *standing in* a trap. **Works.**

2. **`traps.inTrap` can be stale.** When the local player is not the current `tmpObj` (i.e., processing other players in the tuple), the trap state is not updated. For `this.traps` (the local traps singleton), this could mean `inTrap` persists from a previous tick's check for another player. **Gap**: the `else` branch at line 5346 clears `inTrap` to `false` only when the local player's scan finds no trap — but if the local player is out of range, `inTrap` stays `true` from a prior tick. The `else` at 5371 (`this.traps.inTrap = false`) only fires if `liztobjRef` is empty, not if the local player simply has no nearby trap.

3. **The detection only runs for the *enemy* that is in the same tuple as the local player's update.** If the local player's SID range update doesn't include the enemy standing in a trap, the scan doesn't happen until the next tick. This matches original behavior (tick-based), so likely acceptable.

4. **`this.traps.protect(this.traps.aim)` is called every tick the trap is detected**, not just on entry. The original called protect on entry only. **Minor gap** — but `protect` is idempotent (it just tries to place anti-trap), so this is a no-op or an extra placement attempt.

5. **`this.traps.info` is set to the GameObject directly.** Original used a structured info object. The port's consuming code (`notFast`, `checkSpikeTick`, AutoBreaker) reads `info.health`, `info.sid`, etc., which exist on the GameObject. **Works.**

**Verdict**: `traps.inTrap` works for the common case but has a stale-state risk when the local player is not the current `tmpObj`. The rest of the trap-dependent code (AutoBreaker reward, protect, replace) will see stale values.

### 5. What is the next safest implementation step?

**Recommendation (most concrete, lowest-risk step):**

**Step 1: Move the `gameObjects` near-scan in `_ha` (~5180–5320) to iterate `root.liztobj` instead of `gameObjects`.**

- The `gameObjectsRef` loop at line ~5210 builds `nearObjsTmp`, detects break-range objects, counts turrets, and scans for traps/spikes.
- `breakRange` default is 700. `liztobj` range is ~1000. All objects within break range are inside `liztobj`.
- Turret range checked is 680. Within liztobj range.
- Trap/spike proximity is within enemy body scale. Within liztobj range.

**Specific changes needed** (read-only recommendations):
1. In `_ha` ~5210, change `/ for (let g = 0; g < gameObjectsRef.length; g++) /` to iterate `liztobjRef` instead.
2. Keep the second loop at ~5304 (which already iterates `liztobjRef` for break-object detection) as-is — it's already on liztobj.
3. Remove the `if (liztobjRef.length)` guard at ~5303 since the primary scan already works exclusively on liztobj.

**Step 2 (after Step 1 stabilizes):** Move `syncResourceCacheFromObjects` to use its own periodic full scan (every ~10 ticks) rather than every-tick, or keep it on gameObjects but deduplicate the iterating.

**Step 3 (after Step 1 & 2):** Move the `calledTickCalc` liztobj build into its own region — it currently re-scans gameObjects to build liztobj, but after Step 1, liztobj already has fewer or comparable items. The liztobj build itself could be driven from `calledTickCalc` using a lighter refresh (update distances, toggle render flags, don't rebuild the array from scratch).

**What NOT to do next:**
- Do not touch the `Traps.testCanPlace` blocker snapshot (line ~1770) yet — it uses `forEach` on `gameObjects` to clone blocker state, which is a small struct clone and not the bottleneck.
- Do not attempt to merge `Traps` and `Traps_` (two near-duplicate classes) — that's a larger refactor with high risk.
- Do not remove the `BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE` guard — the WS message handler still defers to the original mod for most packets.

---

### No-Edit Confirmation

No files were read, modified, created, or executed. This is a read-only analysis of `project-nozo-single.user.js` (7058 lines) with a brief header check of `moomoo.js`. All line references are from `project-nozo-single.user.js`. No files were changed.

## Files Touched

- None
