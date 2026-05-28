# DeepSeek Edit Task: Optimize NozoSingle Object Hot Path

## Mode
Bounded edit task. Edit only `project-nozo-single.user.js`.

## Goal
Reduce lag caused by full `gameObjects` scans during the updatePlayers tick path.

## Primary Target
In `PlayerRuntime._ha(...)`, the local-player object scan currently uses `gameObjectsRef` around the area with:

- `const gameObjectsRef = this.gameObjects;`
- `const liztobjRef = Array.isArray(this.root.liztobj) ? this.root.liztobj : [];`
- `if (gameObjectsRef.length) { ... for (let g = 0; g < gameObjectsRef.length; g++) ... }`
- `nearObjsTmp`
- trap/spike detection
- turret count
- break object detection

Change this hot scan to use `liztobjRef` as the primary working set when it has entries. This scan only needs nearby objects:

- turret range is about 680
- break range default is 700
- nearObjs is <= 500
- trap/spike proximity checks are local

## Requirements
- Keep `syncResourceCacheFromObjects()` global. Do not change resource cache logic in this task.
- Do not rewrite `calledTickCalc(...)` beyond what is necessary.
- Do not touch rendering, menu, token/bootstrap, msgpack, or metadata.
- Preserve current behavior where possible.
- Avoid adding `typeof` guards that hide missing dependencies.
- Avoid new console logging.
- Keep edits minimal and readable.

## Suggested Implementation
1. Create a local `scanObjectsRef` inside `_ha` from `liztobjRef.length ? liztobjRef : gameObjectsRef`.
2. Use `scanObjectsRef` for the local-player object scan that builds `nearObjsTmp`, trap/spike scan, turret count, and local break object detection.
3. Avoid a second duplicate loop over `liztobjRef` if it becomes redundant after using `scanObjectsRef`.
4. Keep AutoBreaker priority filters on `liztobjRef` or the active scan set, but preserve behavior.

## Validation
After editing, run:

```powershell
node --check .\project-nozo-single.user.js
```

## Output
In your final response, summarize:
- exact functions changed
- why the scan is now cheaper
- validation result
- any uncertainty or behavior risk
