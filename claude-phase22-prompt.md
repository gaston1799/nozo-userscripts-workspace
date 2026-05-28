Phase: Phase 22 - Remaining Class Parity + Bridge Burn-Down

Read first:
- task.md
- findings.md
- progress.md
- phase19-progress.md
- phase20-progress.md
- phase21-progress.md (if present)

Output contract:
- Create `phase22-progress.md` ONLY when all requested work is complete.
- Do not create it at start.
- If blocked, still create `phase22-progress.md` with:
  - `Status: BLOCKED`
  - exact blocker
  - files touched
  - next action

Scope:
- Allowed:
  - `project-nozo-next.user.js`
  - `project-nozo-externals/src/*`
  - `project-nozo-externals/dist/*` (via build output)
  - phase docs/task docs
- Forbidden:
  - no `moomoo.js` edits
  - no unrelated refactors

Primary objective:
Finish parity for remaining major class/function surfaces that are still bridge/stub/placeholder quality.

Priority targets (in order):
1) Render class parity:
   - port missing legacy rendering helpers into Nozo render compat path:
     - `renderTool`
     - `renderProjectile`
     - `renderAI`
     - `renderDeadPlayer`
     - full `renderPlayer` draw order/material behavior
   - keep debug/HUD on overlay only
   - keep world/player/object rendering on actual game canvas path

2) Items/model parity for render/combat:
   - ensure all read paths use Nozo state-backed catalog first (`state.itemsData`)
   - retain fallback to globals only if state catalog missing

3) Net-event handler parity hardening:
   - verify packet handlers for `I/J/L/M/X/Y/K/N/O/H/a/D/E/C/A` are strict and typed
   - no silent swallow for critical state mutation
   - keep typed logs on malformed tuples

4) Bridge burn-down:
   - identify remaining `_things`/compat aliases still required
   - remove only aliases no longer used by current modules
   - keep intentional bridge comments where removal is deferred

Validation required:
- `npm run check` in `project-nozo-externals`
- `npm run build` in `project-nozo-externals`
- `node --check project-nozo-next.user.js`

Commit policy:
- Commit only if phase work is coherent and passing checks.
- Include commit hash(es) in `phase22-progress.md`.

Implementation notes:
- Prefer strict data guards over try/catch swallowing.
- Preserve packet contracts and existing module APIs.
- Keep edits minimal and behavior-focused.
