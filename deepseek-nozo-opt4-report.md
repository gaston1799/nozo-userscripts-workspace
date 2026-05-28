# DeepSeek Watch Result

## Final Response

---

## Summary

### Changed block

**File:** `project-nozo-single.user.js`  
**Lines:** 5322–5340 (replaced 7-line block with 8-line block)

### What changed

**Before — two-pass, wasteful:**

```js
const _abNearSpikes = [];
// ... loop body ...
    if (dist <= 169) _abNearSpikes.push(e);     // dist computed here
// ...
_abNearSpikes.sort((a, b) => UTILS.getDist(a, p, 0, 2) - UTILS.getDist(b, p, 0, 2));  // dist recomputed ~n log n times
```

**After — one-pass, stored distance:**

```js
const _abNearSpikeEntries = [];
// ... loop body ...
    if (dist <= 169) _abNearSpikeEntries.push({ obj: e, dist });   // dist stored once
// ...
_abNearSpikeEntries.sort((a, b) => a.dist - b.dist);               // O(1) compare
const _abNearSpikes = _abNearSpikeEntries.map(entry => entry.obj); // unwrap
```

### Why it's cheaper

The sort comparator previously called `UTILS.getDist(a, p, 0, 2)` which performs **6 property accesses + 6 arithmetic ops + `Math.hypot`** per comparison — roughly **O(12 + hypot) per call**. With `n` near-spikes (typically 5–30), Timsort makes ~`n log n` comparisons, so **hundreds of redundant `getDist` calls** were made.

Now each spike's distance is computed **exactly once** in the build loop (already executed), then the sort comparator is a single `a.dist - b.dist` — a trivial number subtraction. The final `.map()` iterates `n` elements doing one property read each.

### Validation result

`node --check .\project-nozo-single.user.js` → **exit code 0** (no syntax errors).

### Behavior risk

**None.** The unwrapped `_abNearSpikes` array still holds the same game object references (`entry.obj`) ordered identically to before. All downstream code paths — `_abNearSpikes[0]`, `_abNearSpikes[1]`, `.forEach(spike => ...)` — receive plain game objects, not wrappers. No thresholds, priority logic, or variable scope changed.

## Files Touched

- project-nozo-single.user.js
