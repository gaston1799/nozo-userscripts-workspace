You are continuing Project Nozo migration from completed Phase 14.

Create `phase15-progress.md` only after all Phase 15 work/checks/commits are done.
Do not create `phase15-progress.md` at start.
If blocked, still create `phase15-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase14-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

Phase 15 objective:
Port the original menu into Nozo Html section and ensure menu toggles drive live Nozo state/modules.

Requirements:

1) Html menu parity
- Expand `project-nozo-externals/src/html.js` to port the original menu structure and key controls (high-value operational controls first).
- Keep UI maintainable (modular sections/helpers), avoid giant one-function blob.

2) Toggle wiring
- Every menu toggle/control must wire to live Nozo behavior/state.
- Persist via existing storage pattern where applicable.
- Ensure default values are applied on mount and reflected in control states.

3) Functional bindings (minimum)
- Render enabled/disabled
- Trap system enabled/disabled
- AutoBreak enabled/disabled
- Movement/path helper enabled/disabled where applicable
- Debug logging visibility level (or on/off)

4) Back-compat bridges
- If legacy names are needed from original menu logic, add narrow compatibility mappings rather than global sprawl.

5) UX
- Keep menu usable in-game: scrollable, non-blocking overlay, clear section labels.
- No decorative bloat; prioritize control density and correctness.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. `git -C project-nozo-externals status --short`

Commit/push:
- Commit only valid scoped Phase 15 changes.
- Push to `main` of externals repo when checks pass.

Output contract (`phase15-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- Commit hashes
- Remaining parity gaps and recommended Phase 16 scope
