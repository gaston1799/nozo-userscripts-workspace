You are continuing Project Nozo migration from completed Phase 16.

Create `phase17-progress.md` only after all Phase 17 work/checks/commits are done.
Do not create `phase17-progress.md` at start.
If blocked, still create `phase17-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase16-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

Phase 17 objective:
Port the next core sections after healer: parse init data into usable catalogs, wire shame tracking, and lay the base for more accurate healer/combat behavior.

Concrete tasks:

1) Parse init data (A handler)
- In `project-nozo-externals/src/net-events.js`, upgrade A/setInitData handling to extract and store structured data:
  - weapons/items catalog where available
  - ages/upgrades where available
  - preserve raw payload too
- Write to clear state keys (e.g. `Nozo.state.itemsData`, `Nozo.state.agesData`) while keeping compatibility.

2) Shame tracking foundation
- Add explicit `shameCount`/related tracking onto local player state in a maintainable way.
- Use available event paths (`N`, `a`, health deltas, skin transitions) to keep it up to date without fake values.

3) Healer integration improvements
- Update healer to consume parsed item heal values and real weapon/reload metadata when available.
- Keep safe fallbacks when data missing.
- Maintain bounded logs/history.

4) Combat/readiness alignment
- If combat uses static range/reload approximations, switch to parsed catalog data where feasible.
- Keep behavior stable; no broad refactor.

5) Menu/debug visibility
- Add read-only debug visibility for parsed init-data readiness and healer/shame state so runtime verification is easy.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Commit/push:
- Commit only valid scoped Phase 17 changes.
- Push to `main` of externals repo when checks pass.

Output contract (`phase17-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- Commit hashes
- Remaining parity gaps and recommended Phase 18 scope
