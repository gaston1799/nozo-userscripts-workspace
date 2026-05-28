# Phase 25 Progress

Status: COMPLETE

## Summary of Refactor Changes

### 1. `_elAutoPlaceTick` replaced in `Traps_.autoPlace`
Line ~2532: `_elAutoPlaceTick.value` was an undefined module-scope variable.
Replaced with `getEl("autoPlaceTick")?.value` to match the pattern used by `Traps.autoPlace`.

### 2. `Traps_.autoPlace_` dead method removed
The `autoPlace_` method (~76 lines) was never called anywhere in the file.
It closed over module globals `enemy`, `configs`, `instaC`, `game`, `player`, `items`,
`nearObjs`, `place`, `checkPlace`, `near`, `_elAutoPlaceTick` from module scope.
Removed entirely — no behavior change.

### 3. `Traps_.autoReplace` migrated to `this.ctx`
All six module-global reads replaced with `_ctx` references:

| Old (module global) | New (this.ctx) |
|---|---|
| `enemy.length` | `_ctx.enemy.length` |
| `near.dist2` | `_ctx.near.dist2` |
| `configs.autoReplace` | `_ctx.configs.autoReplace` |
| `findObjectBySid(sid)` | `_ctx.findObjectBySid(sid)` |
| `player` (3 uses) | `_ctx.player` |
| `gameObjects.find(...)` | `_ctx.gameObjects.find(...)` |
| `near.scale`, `near.dist2`, `near.aim2` | `_ctx.near.*` |

### 4. `syncLegacyCombatRefs` TODO comment updated
Section 3 comment updated to accurately state:
- Traps and Traps_ are fully migrated to ctx as of Phase 25.
- Remaining mirrors are required by Instakill and call-site code only.
- TODO marker renamed to `TODO(Instakill)`.

### 5. Dead module-scope declarations removed
`let nearObjs = [];` and `let traps = null;` removed from the legacy combat refs block (lines ~1300, ~1304).
- `nearObjs` was not in `syncLegacyCombatRefs` mirror block (removed in Phase 24).
  After removing `autoPlace_`, no active code reads it.
- `traps` was not in `syncLegacyCombatRefs` mirror block (removed in Phase 24).
  All active code accesses `ctx.traps` or `_ctx.traps` (never the module global).

---

## Removed Traps/Traps_ Global Aliases

After Phase 25, neither `Traps` nor `Traps_` reads any module-scope legacy alias:

| Alias | Removed from |
|---|---|
| `enemy` | `Traps_.autoReplace` |
| `near` | `Traps_.autoReplace` |
| `configs` | `Traps_.autoReplace` |
| `findObjectBySid` | `Traps_.autoReplace` |
| `player` | `Traps_.autoReplace` |
| `gameObjects` | `Traps_.autoReplace` |
| `enemy`, `configs`, `instaC`, `game`, `player`, `items`, `nearObjs`, `place`, `checkPlace`, `near` | `Traps_.autoPlace_` (dead code, removed) |
| `_elAutoPlaceTick` | `Traps_.autoPlace` (replaced with `getEl(...)`) |
| `nearObjs` | module declaration removed (was already not mirrored) |
| `traps` | module declaration removed (was already not mirrored) |

Note: `sendChat` and `getSpikeTickReserve` in `Traps.protect` and `Traps.doPlace` are game-environment window globals, not module-scope legacy aliases — they are intentionally left as-is.

---

## Remaining Aliases (Instakill only)

All mirrors in `syncLegacyCombatRefs` section 3 remain for Instakill and call-site code:

| Symbol | Required by |
|---|---|
| `player` | Instakill (many methods) |
| `items` | Instakill.getBaseDamages |
| `enemy` | call-site code (~line 3612) |
| `near` | Instakill.changeType |
| `_things` | Instakill (entire class body) |
| `config` | Instakill.getBaseDamages, hammerInsta2 |
| `configs` | Instakill.hammerCounterType |
| `gameObjects` | Instakill.hammerInsta, hammerInsta2 |
| `game` | Instakill (tickBase calls) |
| `instaC` | call-site code (~lines 3328, 3335) |
| `my` | Instakill |
| `buyEquip` | Instakill |
| `selectWeapon` | Instakill |
| `sendAutoGather` | Instakill |
| `place` | call-site code (~lines 3392, 3539, 3574) |
| `checkPlace` | Instakill.hammerInsta |
| `canplace` | Instakill.hammerInsta2 |
| `chat` | Instakill helpers |
| `stop` | Instakill.changeType1 |
| `_random` | Instakill.changeType |
| `pingTime` | Instakill.changeType1, hammerInsta |
| `io` | Instakill.spikeTickType |
| `importantDirs` | Instakill.changeType1 |
| `tmpObj` | Instakill.spikeTickType |
| `findObjectBySid` | call-site code (~line 4136) |
| `useWasd` | Instakill/movement helpers |

---

## Validation Command Output

```
node --check project-nozo-single.user.js
(no output — exit code 0)
```

Syntax check: PASS.
