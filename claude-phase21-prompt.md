You are continuing Project Nozo migration from completed Phase 20.

Create `phase21-progress.md` only after all Phase 21 work/checks are done.
Do not create `phase21-progress.md` at start.
If blocked, still create `phase21-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase20-progress.md
- phase19-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

Phase 21 objective:
Remove remaining bridge fallbacks by making model/manager paths canonical and required.

Rules:
1) Delete remaining fallback branches where `playerModel/objectModel/objectManager` are checked as optional in active hot paths.
2) Keep one short runtime guard/log if needed for migration safety, but do not keep full duplicate fallback implementations.
3) Ensure `@require` order and hashes point to a commit that actually contains all required dist files.
4) This phase MAY commit/push (unlike phase 19/20).

Concrete tasks:
1) Net-events bridge removal
- In `src/net-events.js`, remove fallback bodies for:
  - `_handlerD`, `_handlerA`, `_handlerE`, `_handlerO` player fallbacks
  - `_decorateObject`, `_removeObjectBySid`, `_handlerH`, `_handlerR` object fallbacks
- Make model/manager calls canonical.

2) Traps/autobreak bridge cleanup
- In `src/traps.js` and `src/autobreak.js`, remove inline team fallback checks that duplicate `isTeamObject`.
- Assume decorated objects from canonical lifecycle.

3) Load-order and runtime safety
- Verify required module load order in userscript (`player` -> `object-model` -> `object-manager` -> `net-events`).
- Add minimal startup assertion logs if required modules are missing, then fail fast instead of silent fallback.

4) Commit + hash repin
- Commit externals changes and push.
- Update all `@require` hashes in `project-nozo-next.user.js` to the new commit hash so runtime resolves required files.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Output contract (`phase21-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- Commit hashes
- Explicit list of bridge code removed
- Any remaining intentional bridge and why
