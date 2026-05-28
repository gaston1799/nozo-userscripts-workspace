You are continuing Project Nozo migration from completed Phase 19.

Create `phase20-progress.md` only after all Phase 20 work/checks are done.
Do not create `phase20-progress.md` at start.
If blocked, still create `phase20-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase19-progress.md
- phase18-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

CRITICAL RULES:
1) Finish class parity work for active paths (player/object/object-manager/net-events integration).
2) Keep explicit `// BRIDGE:` comments only where still truly required.
3) Reduce bridge usage in active runtime paths where parity can be completed safely now.
4) No giant dead-code port. Only active behavior used by combat/traps/autobreak/healer/movement/render.
5) NO GIT COMMIT/PUSH in this phase.

Phase 20 objective:
Close the biggest parity gaps left from Phase 19 and make model/manager paths primary with minimal fallback surface.

Concrete tasks:

1) Player behavior parity (active subset)
- In `src/player.js` add focused behavior methods used by active systems:
  - team checks parity helper (`isTeam` style)
  - reload/update helper parity (`manageReload`-style minimal behavior)
  - damage threat helper parity (`addDamageThreat`-style minimal behavior)
- Keep signatures and state updates maintainable.

2) Object scale/team semantics parity
- In `src/object-model.js` improve `getScale(...)` and object helper semantics to match active usage patterns from moomoo (including mult/isItem style cases actually used).
- Ensure trap/spike/turret/blocker interactions use consistent scale logic.

3) Net-events primary path cleanup
- In `src/net-events.js`, make objectManager/objectModel/playerModel path the default and reduce fallback execution in hot paths.
- Keep fallback only where necessary; annotate with `// BRIDGE:`.

4) Module adoption cleanup
- Update traps/autobreak/combat/healer to use player/object helper methods directly where it removes duplicate logic safely.

5) Runtime safety checks
- Ensure no crashes if catalog/model data is late.
- Keep bounded memory structures and logs.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Output contract (`phase20-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- All remaining `// BRIDGE:` locations with reason
- Remaining parity gaps and recommended Phase 21 scope
- Explicit note: no commit/push performed
