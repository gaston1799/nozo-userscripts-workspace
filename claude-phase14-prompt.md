You are continuing Project Nozo migration from completed Phase 13.

Create `phase14-progress.md` only after all Phase 14 work/checks/commits are done.
Do not create `phase14-progress.md` at start.
If blocked, still create `phase14-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase13-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

Phase 14 objective:
Calibrate live behavior after RAF hard-block and promote highest-value observed event handlers with bounded, maintainable implementations.

Concrete tasks:

1) RAF live-safety gate
- Keep default hard-block behavior from Phase 13.
- Add a controlled fallback mode flag (state/debug switch) to temporarily allow passthrough in case hard-block breaks runtime updates during live testing.
- Emit structured log showing active RAF mode.

2) Dynamic render scale
- `project-nozo-externals/src/render.js` currently relies on `state.scale` defaulting to 1.
- Implement runtime scale update from canvas dimensions / DPR / available game canvas metrics so range rings and world-to-screen mapping are closer to real scale.
- Keep math simple and stable; avoid expensive per-frame recomputation when values unchanged.

3) Promote X/Y handlers
- In `project-nozo-externals/src/net-events.js`, implement concrete handlers for:
  - `X` addProjectile
  - `Y` remProjectile
- Maintain `Nozo.state.projectiles` as a bounded map/object keyed by sid/id.
- Keep observer counters for all other deferred handlers.

4) Promote K handler
- Replace pure observer for `K` (gatherAnimation) with lightweight state update useful for render/combat debugging.
- Do not build full animation engine; just reliable state event (tick/time/source) and bounded history.

5) Combat range + reload HUD accuracy
- Ensure `Nozo.state.combat.weaponRange` is updated from held weapon info so render ring is not always fallback 35.
- Add live reload gate state (not stale last value only) for HUD usage.

6) Dead player pruning helper
- Add bounded helper path to avoid unbounded dead player accumulation.
- Either prune by grace period or provide `getAlivePlayers()` and move near/enemy rebuild to use alive-only filtering.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Commit/push:
- Commit only valid scoped Phase 14 changes.
- Push to `main` of externals repo when checks pass.

Output contract (`phase14-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- Commit hashes
- Remaining parity risks and recommended Phase 15 scope
