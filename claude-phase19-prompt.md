You are continuing Project Nozo migration after Phase 18.

Create `phase19-progress.md` only after all Phase 19 work/checks are done.
Do not create `phase19-progress.md` at start.
If blocked, still create `phase19-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase18-progress.md
- phase17-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

CRITICAL RULES:
1) Fully port class behavior for active systems (Player/Object/ObjectManager) as far as feasible in this phase.
2) If a global is genuinely required for parity, add it intentionally and minimally.
3) For every intentional compatibility bridge kept, add explicit code comments like:
   `// BRIDGE: <why needed> <remove condition>`
4) Do not leave silent/fuzzy compatibility paths with no marker comments.
5) NO GIT COMMITS OR PUSHES in this phase.

Phase 19 objective:
Finish up Player/Object/ObjectManager class parity for currently active modules (combat, traps, autobreak, healer, movement), with explicit bridge annotations.

Concrete tasks:
1) Player class parity increments
- Expand `src/player.js` with behavior helpers used by active systems:
  - reload/timing helper(s)
  - team checks
  - damage/shame related helpers where needed
- Keep method set focused on active runtime needs; avoid dead mega-port.

2) Object model parity increments
- Expand `src/object-model.js` scale/team/type behavior to better match live usage patterns.
- Ensure `getScale(...)` semantics are consistent for active logic paths.

3) Object manager integration
- Ensure `src/object-manager.js` is the canonical route for H/Q/R object lifecycle paths.
- Keep state sync coherent with `Nozo.state.gameObjects` and `liztobj`.

4) Net-events and module adoption
- Update `src/net-events.js` and dependent modules to prefer model/manager APIs.
- Any fallback/compat path must be marked with `// BRIDGE:` comments and remove-condition.

5) Globals policy
- If globals are required for parity, add only narrowly scoped globals and document why.
- Prefer `Nozo.state`/`Nozo.modules` first; globals only when unavoidable.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Output contract (`phase19-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- List of every `// BRIDGE:` comment added with file + reason
- Remaining parity gaps and recommended Phase 20 scope
- Explicit note: no commit/push performed
