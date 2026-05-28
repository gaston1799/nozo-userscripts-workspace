# DeepSeek AdvHeal Scans Report

## Summary
Added `buildCombatScans(p)` method to `PlayerRuntime` — a focused combat scan builder that extracts the scan state `advHeal` depends on from `moomoo.js updatePlayers` (L31119–31289) into a single-pass liztobj-based helper. Called once per tick from `_ha()` after enemy/nears/near are computed.

## Changes

### New method: `PlayerRuntime.buildCombatScans(p)`
- **Location**: Inserted after `updateInstaHud()` (~L4728), before `wanderTick()`
- **Lines added**: ~160

### Call site in `_ha()`
- **Location**: L5743, between `this.root.near = ...` and `this.calledTickCalc(p)`
- **Timing**: After players interpolated, enemy/nears/near computed, `syncLegacyCombatRefs` already run

## Scan Output Shape
```js
{
  meta:       { nearSid },
  near:       { prehitTeamDmg, prehitTeamDmgDist, trapFound, trapFoundDist, hasTeamTrapOnEnemy },
  player:     { antiSpikeTick, antiSpikeTickDist },
  vel:        { pos, hasHostileHazard },
  los:        { listDefault, listTight, solidBlockers, autoInstaClear, shieldClear, millClear },
  hammer:     { trap, trapDist, closeD, inCloseRange, primaryReady, secondaryReady, bothReady, primaryAllowed, dirToTrapEnemyIsIn, canRun }
}
```

## Storage
- `this.root.scans = scans` — canonical nozo-side location
- `this.legacyCtx.info = scans` — mirrors `_things.info` from moomoo.js
- `this.legacyCtx.scans = scans` — explicit scans key
- `this.legacyCtx.nearSpikeInfo` + `this.root.nearSpikeInfo` — legacy mirror

## Assumptions from moomoo.js
- `safeGetObjectsInLineOfSight` already defined and stored on `root` (L5238 of nozo)
- `liztobj` used instead of full `gameObjects` for spike/trap scan — moomoo.js uses `gameObjects` but liztobj is the already-filtered near-object set, sufficient for combat scans
- `trapFound` is the nearest team trap overlapping the nearest enemy
- `prehitTeamDmg` is the nearest team spike overlapping the nearest enemy (pre-hit coordination)
- Hammer readiness uses `p.reloads` vs `things.pingTime` (same as moomoo.js)
- `hammer.canRun` depends on `configs.hammerInsta` (may not exist yet — guarded by boolean check)

## Validation
```
node --check project-nozo-single.user.js
```
**Result**: PASS (exit code 0, no syntax errors)

## Remaining Scan Fields (for advHeal)
The core scan data is complete. Fields not yet populated that moomoo.js has:

| Field | Status | Reason |
|---|---|---|
| `scans.hammer.primaryReady` | ✅ | Computed from `p.reloads` vs `pingTime` |
| `scans.hammer.secondaryReady` | ✅ | Same |
| `scans.hammer.canRun` | ✅ | Full gate computed |
| `scans.vel.hasHostileHazard` | ✅ | liztobj pass |
| `captureCombatMovementData()` | ⚠️ NOT called | This is a separate system — not part of scan construction. Will be wired in advHeal or combat-movement port. |

## TODO markers left in code
```js
// TODO(advHeal): scans.near.trapFound feeds hammerInsta trap detection.
// TODO(advHeal): scans.player.antiSpikeTick feeds antiSpike reaction timing.
// TODO(advHeal): scans.los.autoInstaClear gates auto-insta eligibility.
// TODO(advHeal): scans.hammer.canRun gates hammerInsta trigger.
```
