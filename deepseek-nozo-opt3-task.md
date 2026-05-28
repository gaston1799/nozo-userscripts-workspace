# DeepSeek Edit Task: Optimize calledTickCalc Distance Check

## Mode
Bounded edit task. Edit only `project-nozo-single.user.js`.

## Target
In `PlayerRuntime.calledTickCalc(p)`, the `liztobj` / render-culling section builds `nextLiz` by looping all `gameObjects` and doing:

```js
const d = Math.hypot(tx - px, ty - py);
if (d <= inRange) { ... }
```

## Goal
Avoid `Math.hypot` in this every-tick full object scan by using squared-distance comparison.

## Requirements
- Only edit the `calledTickCalc(p)` `liztobj` build section.
- Preserve behavior:
  - Objects inside `inRange` go into `nextLiz` and `tmp.render = true`.
  - Objects outside set `tmp.render = false`.
  - `root.liztobj = nextLiz`.
- Do not change thresholds or culling semantics.
- Avoid new helpers unless genuinely needed.
- Avoid console logs.
- Do not touch `_ha`, AutoBreaker, menus, metadata, rendering, resource cache, or networking.

## Validation
Run:

```powershell
node --check .\project-nozo-single.user.js
```

## Output
Summarize:
- exact lines/block changed
- why it is cheaper
- validation result
- behavior risk
