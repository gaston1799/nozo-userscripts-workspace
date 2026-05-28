# DeepSeek Task: NozoSingle Combat Scan Prep For AdvHeal

## Mode
Edit `project-nozo-single.user.js` only.

Use `project-nozo-single.before-advheal-scans.user.js` as the pre-task clone/reference copy. Do not edit the clone.

## Goal
Prepare `PlayerRuntime._ha()` for the next advHeal port by extracting the missing legacy combat scan inputs from `moomoo.js` into a focused helper.

This task is **not** to port the full healer yet. It should only add the scan state that advHeal depends on so the next phase can port healer decisions with real inputs instead of guessing.

## Source Context
Read these files:

- `moomoo.js`
- `project-nozo-single.user.js`
- `plan.md`

In `moomoo.js`, inspect the `updatePlayers` function, especially the region after the first player interpolation pass and before the large healer/insta decision blocks. Relevant concepts/variables to preserve:

- `safeGetObjectsInLineOfSight`
- `nearSpikeInfo`
- `player.antiSpikeTick`
- `trapFound`
- `trapFoundDist`
- `canHitObj`
- `autoInstaBreak`
- hammer/trap scan values such as `inCloseRange`, `closeD`, `traps.info`
- nearby enemy/near enemy state

Use `rg` and `Get-Content` line windows instead of loading the whole huge source into memory at once.

## Required Implementation
Add a helper on `PlayerRuntime`, suggested name:

```js
buildCombatScans(p)
```

It should:

1. Use the current NozoSingle runtime data, not new free globals.
2. Read from existing rooted state where possible:
   - `this.root.gameObjects`
   - `this.root.liztobj`
   - `this.root.near`
   - `this.root.enemy`
   - `this.root.player`
   - `this.root.traps`
   - `this.root.items`
   - `this.legacyCtx`
3. Return one object that groups scan outputs, for example:

```js
{
  player: {
    antiSpikeTick: false,
    nearEnemySpike: null
  },
  near: {
    trapFound: null,
    trapFoundDist: Infinity,
    hasTeamTrapOnEnemy: false
  },
  los: {
    default: [],
    tight: [],
    solidBlockers: [],
    autoInstaClear: true
  },
  hammer: {
    trap: null,
    trapDist: Infinity,
    closeD: Infinity,
    inCloseRange: false
  }
}
```

The exact shape can be adjusted if the existing file already has a better local convention, but it must be centralized and readable.

4. Call `buildCombatScans(p)` from `_ha()` after:
   - players are interpolated,
   - `enemy`, `nears`, and `near` have been computed,
   - `syncLegacyCombatRefs(p)` has run for current tick state.

5. Store the result in both:

```js
this.root.scans = scans;
this.legacyCtx.scans = scans;
```

Also mirror specific legacy-compatible fields only if already used by existing code, such as:

```js
this.legacyCtx.nearTrap
this.legacyCtx.nearSpikeInfo
this.root.nearSpikeInfo
```

Do not add broad new globals.

## Strictness Rules
Do not add broad `typeof fn === "function"` guards around core dependencies. Missing core dependencies should throw during testing.

Acceptable checks:

- Optional legacy/debug features may be guarded.
- Validity checks for no enemy/no object/no player are OK.
- Do not swallow errors with empty `try/catch`.

## Performance Rules
The game is lagging when many game objects are loaded, so avoid heavy repeated full-array scans.

Prefer:

- `liztobj` for close object scans when possible.
- One pass over `liztobj` or `gameObjects`, not repeated `.filter().sort()` chains.
- Squared distance where exact distance is not needed.

Do not rewrite the renderer or the full updatePlayers loop in this task.

## Do Not Port Yet
Do not port these in this task:

- full advHeal/healer decision tree
- full insta decision tree
- autoPlace/replacer/preplacer
- bot classes
- renderer changes
- major global cleanup/refactor

Leave short `// TODO(advHeal): ...` comments where the new scan values are meant to feed the next advHeal port.

## Validation
Run:

```powershell
node --check .\project-nozo-single.user.js
git diff -- .\project-nozo-single.user.js
```

If `node --check` fails, fix it before finishing.

## Report
Create or overwrite:

```text
deepseek-advheal-scans-report.md
```

The report must include:

- Summary of changes
- Exact helper/method names added
- Where `_ha()` calls the scan builder
- Any assumptions made from `moomoo.js`
- Validation result
- Any remaining scan fields still missing before advHeal

