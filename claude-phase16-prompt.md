You are continuing Project Nozo migration from completed Phase 15.

Create `phase16-progress.md` only after all Phase 16 work/checks/commits are done.
Do not create `phase16-progress.md` at start.
If blocked, still create `phase16-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase15-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

Phase 16 objective:
Port healer behavior from original `moomoo.js` update loop into maintainable Nozo modules, including the relevant pre-update and scheduled-call logic that feeds healer decisions.

Original anchors from moomoo.js (for behavior reference):
- `function healer(t)` around line ~19059
- `function healer1()` around line ~19079
- `updatePlayers(data)` around line ~30311
- healer call on skin/shame transition near ~30418-30423
- delayed healer scheduling near ~30715-30747
- pre-calls before update block: `calledTickCalc()` and `wanderTick()` around ~30335-30336

Implement requirements:

1) Add healer module
- Create `project-nozo-externals/src/healer.js` with a clear API, e.g.:
  - `setEnabled(flag)`
  - `onTick(ctx)` or `step(ctx)`
  - `onHealthUpdate(...)`
  - `requestHeal(reason, opts)`
- Persist state in `Nozo.state.healer`.

2) Port core healer decision logic
- Use current Nozo state (`player.health`, `oldHealth`, `enemy/near`, `traps`, reload/combat timing) to reproduce practical healer triggers.
- Include the important updatePlayers-adjacent behavior:
  - immediate healer trigger on key state transitions (e.g. shame/skin transitions where old code called `healer()`),
  - delayed/scheduled heal attempts when appropriate.
- Keep it bounded and maintainable; do not copy giant monolithic legacy code.

3) Wire into existing flow
- Wire healer into bridge tick flow in `project-nozo-next.user.js` (or equivalent central loop) after state refresh.
- Wire health event path from `net-events` (`O` updateHealth) so healer has up-to-date deltas.
- Ensure healer uses centralized packet/combat APIs (no rogue packet sends).

4) Menu integration
- Add a Healer toggle to Html menu sectioning and wire it to `Nozo.healer.setEnabled`.
- Apply persisted default on mount.

5) Logging/debug
- Add structured logs for healer trigger reason and blocked reason.
- Keep logs bounded and avoid spam.

Constraints:
- Avoid broad try/catch swallow wrappers.
- Preserve existing module patterns and ownership.
- No unrelated refactors.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Commit/push:
- Commit only valid scoped Phase 16 changes.
- Push to `main` of externals repo when checks pass.

Output contract (`phase16-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- Commit hashes
- Remaining healer parity gaps and recommended Phase 17 scope
