You are continuing Project Nozo migration from completed Phase 12.

Create `phase13-progress.md` only after all Phase 13 work/checks/commits are done.
Do not create `phase13-progress.md` at start.
If blocked, still create `phase13-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase12-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

Phase 13 objective:
Take render ownership for Nozo by disabling native RAF callbacks and expanding Nozo render pipeline with performant, maintainable slices ported from moomoo.js patterns.
Also calibrate remaining packet/event assumptions against current runtime state/logging.

Concrete anchors:

1) RAF takeover
- `project-nozo-next.user.js` currently has RAF passthrough proxy in `Nozo.bridge.overrideRaf`.
Task: switch to hard-block RAF callback execution (`requestAnimationFrame` no-op) while preserving Nozo tick/render loop stability.
Add explicit debug log signal that native RAF is blocked.

2) Render pipeline expansion
- `project-nozo-externals/src/render.js` is currently minimal overlay debug draw.
- `moomoo.js` has large render surface and helper draw modes (see around lines 41k+ for style patterns).
Task: port only high-value active visuals first (not decorative overload):
  - player-centered aim vector + attack range ring
  - target object highlight with label/tag
  - optional trap/autobreak path trace line segments
  - lightweight HUD debug text (tick, aim source, reload gate state)
Keep it performant (single clear, bounded loops, no heavy allocations every frame).

3) Render toggle defaults
- Keep HTML toggle default ON and ensure it controls render enabled state cleanly.
- On disable, overlay should stop drawing without detaching listeners unnecessarily.

4) Event calibration pass
- `project-nozo-externals/src/net-events.js` now handles many events.
Task: verify non-implemented/high-risk handlers are explicitly tracked (e.g. I/J/K/L/M/X/Y/5/6/8/9).
For Phase 13, do not fully implement all of them; instead add structured drop/observe logs and state counters so live testing can confirm which are needed next.

5) State hygiene
- Keep canonical object/player state consistent (`liztobj`, `gameObjects`, `players`, `player`).
- Avoid adding broad try/catch swallow blocks.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Commit/push:
- Commit only valid scoped Phase 13 changes.
- Push to `main` of externals repo when checks pass.

Output contract (`phase13-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- Commit hashes
- Remaining parity risks and recommended Phase 14 scope
