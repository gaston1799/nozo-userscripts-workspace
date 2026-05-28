# DeepSeek Edit Task: Reduce Repeated AutoBreaker Filters

## Mode
Bounded edit task. Edit only `project-nozo-single.user.js`.

## Context
The first optimization changed the local-player object scan in `PlayerRuntime._ha(...)` to use:

```js
const scanObjectsRef = liztobjRef.length ? liztobjRef : gameObjectsRef;
```

Now the same `_ha(...)` block still does repeated scans over `liztobjRef` for AutoBreaker priorities:

- `_abNearSpikes = liztobjRef.filter(...).sort(...)`
- `liztobjRef.filter(... turret/teleporter/blocker ...)`
- `liztobjRef.filter(... type == null ...)`

## Goal
Within the existing `if (liztobjRef.length) { ... }` block in `PlayerRuntime._ha(...)`, reduce repeated `liztobjRef.filter(...)` passes by using one explicit loop over `liztobjRef`.

## Requirements
- Edit only this AutoBreaker priority section inside `_ha(...)`.
- Preserve behavior:
  - `_abNearSpikes` must still be sorted nearest-first by distance to local player.
  - `priority[0]` trap priority logic remains the same.
  - `breakSpikeSwitch`, `breakTTB`, and `breakAll` behavior remains the same.
- Avoid adding console logs.
- Avoid broad refactors.
- Do not add `typeof` guards that hide missing dependency errors.
- Keep code readable.

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
- any behavior risk
