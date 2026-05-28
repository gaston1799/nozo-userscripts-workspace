You are continuing Project Nozo migration from completed Phase 17.

Create `phase18-progress.md` only after all Phase 18 work/checks/commits are done.
Do not create `phase18-progress.md` at start.
If blocked, still create `phase18-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase17-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

Phase 18 objective:
Port tick-based scheduler behavior (game.tickBase-style) and replace ms-timeout driven delayed actions in active systems.

Concrete tasks:

1) Add tick scheduler module
- Create `project-nozo-externals/src/tick-scheduler.js` (or equivalent) with:
  - `scheduleInTicks(delayTicks, fn, meta?)`
  - `scheduleNextTick(fn, meta?)`
  - `cancel(id)`
  - `runTick(currentTick)` (called once per bridge tick)
  - bounded queue/history and debug state

2) Wire scheduler into bridge tick
- In `project-nozo-next.user.js`, call scheduler runner in `Nozo.bridge.tick` using `Nozo.state.tick`.
- Ensure scheduler executes before modules that depend on delayed callbacks.

3) Replace ms timeouts in healer/combat paths
- Replace active delay usage (e.g., damage/onHealth timers, healer defers, shame-adjacent delay calls) with tick scheduler equivalents where intended parity is 1+ ticks.
- Keep ms fallback only if tick context unavailable.

4) Keep behavior parity intent
- Preserve semantics: “next tick”, “N ticks later”, and cancellation patterns.
- Add structured logs for scheduled, executed, canceled events with tags/reasons.

5) Debug visibility
- Expose scheduler state in debug panel (queue size, last executed tag, pending count).

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Commit/push:
- Commit only valid scoped Phase 18 changes.
- Push to `main` of externals repo when checks pass.

Output contract (`phase18-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- Commit hashes
- Remaining tick-scheduler parity gaps and recommended Phase 19 scope
