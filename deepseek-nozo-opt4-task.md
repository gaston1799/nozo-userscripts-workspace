# DeepSeek Edit Task: Avoid Recomputing Spike Sort Distances

## Mode
Bounded edit task. Edit only `project-nozo-single.user.js`.

## Target
In `PlayerRuntime._ha(...)`, inside the AutoBreaker priority section, `_abNearSpikes` is built in a loop and then sorted with:

```js
_abNearSpikes.sort((a, b) => UTILS.getDist(a, p, 0, 2) - UTILS.getDist(b, p, 0, 2));
```

The loop already calculates `dist` for spike candidates:

```js
const dist = UTILS.getDist(e, p, 0, 2);
if (dist <= 169) _abNearSpikes.push(e);
```

## Goal
Store the distance alongside each spike candidate while building the list, sort by the stored distance, then convert back to object list before existing priority usage.

## Requirements
- Edit only this `_abNearSpikes` build/sort section.
- Preserve downstream behavior: `_abNearSpikes[0]`, `_abNearSpikes[1]`, and `.forEach(spike => ...)` must still receive game object instances, not wrapper objects.
- Avoid broad refactors.
- Avoid console logs.
- Do not change thresholds or priority behavior.

## Validation
Run:

```powershell
node --check .\project-nozo-single.user.js
```

## Output
Summarize:
- exact block changed
- why it is cheaper
- validation result
- behavior risk
