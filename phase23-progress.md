# Phase 23 Progress

Status: COMPLETE

## Summary of Refactor Changes

### 1. `this.legacyCtx` introduced on `PlayerRuntime` (constructor)
Added a plain object `this.legacyCtx` initialized at construction time with all legacy combat ref fields:
`player`, `items`, `nearObjs`, `enemy`, `near`, `objectManager`, `traps`, `configs`, `config`,
`gameObjects`, `game`, `instaC`, `my`, `useWasd`, `buyEquip`, `selectWeapon`, `sendAutoGather`,
`packet`, `getDirection`, `place`, `checkPlace`, `canplace`, `chat`, `stop`, `_random`, `pingTime`,
`io`, `importantDirs`, `tmpObj`, `findObjectBySid`.

Seeded with stable refs from constructor (`this.items`, `this.objectManager`, `this.traps`, `this.gameObjects`, `_configs`, `_config`). File location: ~line 4279.

### 2. `_ensureThingsContext` simplified
Old implementation merged `root._things` + `root.NozoSingle._things` via `Object.assign`. New
implementation directly wires both facades to `this.legacyCtx`:
```javascript
this.root.NozoSingle._things = this.legacyCtx;
this.root._things = this.legacyCtx;
return this.legacyCtx;
```
`NozoSingle._things` compatibility facade is preserved per Phase 23 constraint.

### 3. `syncLegacyCombatRefs` refactored (3-step pattern)
Step 1 — Populates `this.legacyCtx` from live game state (all fields).
Step 2 — Calls `this._ensureThingsContext()` to wire the facade (`root._things = this.legacyCtx`).
Step 3 — Mirrors from `this.legacyCtx` to module-scope globals (for legacy-ported class bodies) with explicit TODO markers.

### 4. `_assertInstakillDeps` reads from `this.legacyCtx`
Replaced `const t = _things` (module-scope read) with `const t = this.legacyCtx`. The guard now
reads directly from the authoritative holder, eliminating a level of indirection.

### 5. `calledTickCalc` reads from `this.legacyCtx`
Replaced:
```javascript
const things = root._things && typeof root._things === "object" ? root._things : (root._things = {});
const cfg = (root.config && typeof root.config === "object") ? root.config : {};
```
With:
```javascript
const things = this.legacyCtx;
const cfg = this.legacyCtx.config || (root.config && typeof root.config === "object" ? root.config : {});
```
Writes inside `calledTickCalc` (`things.waterState`, `things.enemyRange`, etc.) propagate
automatically to `root._things` because they share the same object reference.

---

## Symbols Still Requiring Global Alias Mirroring

The following module-scope globals must continue to be written by `syncLegacyCombatRefs` because
the legacy-ported class bodies close over them directly from module scope:

| Symbol | Required by |
|---|---|
| `player` | `AutoBreaker` (all methods), `Instakill` (many methods) |
| `items` | `AutoBreaker.objectsHit`, `AutoBreaker.getFilteredPriority`, `Instakill.getBaseDamages` |
| `nearObjs` | `AutoBreaker.objectsHit`, `AutoBreaker.getFilteredPriority` |
| `enemy` | `AutoBreaker.calculateAim` |
| `near` | `AutoBreaker.calculateAim`, `Instakill.assistInsta` |
| `traps` | `AutoBreaker.processTargets` (reads `traps.inTrap`, `traps.info`) |
| `_things` | `Instakill` (entire class body — every method) |
| `config` | `Instakill.getBaseDamages`, `Instakill.hammerInsta2`, `Traps` internals |
| `configs` | `Traps` internals |
| `gameObjects` | `Instakill.hammerInsta`, `Instakill.hammerInsta2` |
| `game` | `Instakill.changeType1`, `Instakill.assistInsta` |
| `instaC` | `Instakill.changeType1` |
| `my` | `Instakill.assistInsta`, `Instakill.rangeFrame` |
| `buyEquip` | `Instakill.assistInsta` (direct call) |
| `selectWeapon` | `Instakill.assistInsta` (direct call) |
| `sendAutoGather` | `Instakill.assistInsta` (direct call) |
| `place` | Instakill helpers |
| `checkPlace` | Instakill helpers |
| `canplace` | `Instakill.hammerInsta2` |
| `chat` | Instakill helpers |
| `stop` | Instakill helpers |
| `_random` | Instakill helpers |
| `pingTime` | `Instakill.changeType1`, `Instakill.assistInsta` |
| `io` | Instakill helpers |
| `importantDirs` | `Instakill.changeType1` |
| `tmpObj` | Instakill helpers |
| `findObjectBySid` | `CachedMapResource` bridge |
| `useWasd` | Instakill/movement helpers |

---

## Validation Command Output

```
node --check project-nozo-single.user.js
(no output — exit code 0)
```

Syntax check: PASS.
