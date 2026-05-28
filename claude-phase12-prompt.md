You are continuing Project Nozo migration from completed Phase 11.

Create `phase12-progress.md` only after all Phase 12 work/checks/commits are done.
Do not create `phase12-progress.md` at start.
If blocked, still create `phase12-progress.md` with:
- Status: BLOCKED
- exact blocker
- files touched
- next action

Read first:
- task.md
- phase11-progress.md
- findings.md (if present)
- progress.md (if present)

Scope:
- Allowed: `project-nozo-next.user.js`, `project-nozo-externals/`, task/progress files
- Forbidden: do not edit `moomoo.js`

Phase 12 objective:
Finish gameplay parity gaps that remain after Phase 11, then remove/trim temporary compatibility paths that are no longer needed.

Concrete current anchors (use these exact files/regions):

1) RAF override / render lifecycle:
- `project-nozo-next.user.js` lines 105-113 override RAF globally.
- `project-nozo-next.user.js` lines 159-163 and 177-178 perform render attach/draw in tick.
Task: keep custom render ownership stable while avoiding unnecessary breakage in native game flow. If current override is too blunt, adapt with a safer gate but keep Nozo render active.

2) Object list bridging:
- `project-nozo-next.user.js` lines 115-122 currently do one-way migration from `closeObjects` to `liztobj`.
- `project-nozo-externals/src/net-events.js` lines 91-96 only ensure `gameObjects` and `liztobj`.
Task: make canonical object list ownership explicit and remove stale state usage where possible (prefer `liztobj`), without breaking trap/autobreak scans.

3) WS hook dispatch path:
- `project-nozo-next.user.js` lines 291-339 wrap WebSocket and dispatch parsed packets.
- `project-nozo-externals/src/net-events.js` lines 72-87 dispatch.
Task: verify packet decode/dispatch path is parity-safe for current message shapes; harden any edge cases that can silently drop aim/combat-relevant events.

4) Net event parity completion:
- `project-nozo-externals/src/net-events.js` currently auto-registers only subset handlers at lines 297-307 (`C,a,H,Q,R,G,7,N,O`).
Task: add missing high-impact handlers needed for parity where values drive combat/movement/render state (especially object/player lifecycle and item/age/update flows). Keep handlers strict and maintainable.

5) Movement parity sanity:
- `project-nozo-externals/src/movement.js` line 42+ has `direct` strategy and line 174+ tick step.
Task: keep only active pathfinder logic (dead path modes remain excluded), but ensure step gating/parity aligns with current bridge tick usage.

6) Startup/token/server context:
- `project-nozo-next.user.js` lines 235-282 token flow and altcha click delay.
- lines 355-363 server lookup.
Task: preserve current working token/bootstrap behavior while removing avoidable silent-failure patterns if found.

Constraints:
- Avoid adding broad `try/catch` wrappers that hide errors.
- Prefer explicit guards and structured debug logs.
- Keep edits scoped; no unrelated refactors.

Validation required:
1. `node --check project-nozo-next.user.js`
2. `npm --prefix project-nozo-externals run check`
3. `npm --prefix project-nozo-externals run build`
4. summarize any parity-risk still open

Commit/push:
- Commit only valid scoped Phase 12 changes.
- Push to `main` of externals repo when checks pass.

Output contract (`phase12-progress.md`) must include:
- Status
- Summary
- Files changed
- Exact checks run + pass/fail
- Commit hashes
- Remaining risks and next recommended phase
