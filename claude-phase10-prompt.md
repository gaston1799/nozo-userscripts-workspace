# Phase 10 - Render/UI

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `phase8-progress.md`
- `phase9-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/src/`
- relevant render/UI sections from `moomoo.js` only (including Html/menu and overlay draw logic)

## Completion Contract

Create `phase10-progress.md` only after all Phase 10 work, checks, and commits are complete.

Do not create `phase10-progress.md` at the beginning.

If blocked, still create `phase10-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 10 only: render overlays and Html/menu module foundations.

Allowed files:

- `project-nozo-next.user.js`
- `project-nozo-externals/src/`
- `project-nozo-externals/dist/`
- `project-nozo-externals/package.json`
- `project-nozo-externals/README.md`
- task/progress files

Forbidden:

- Do not edit `moomoo.js`.
- Do not rewrite combat/movement logic.
- Do not add packet sends from UI modules.

## Required Work

1. Create render module:
   - `project-nozo-externals/src/render.js`
   - Attach `Nozo.render`, `Nozo.modules.render`, mirror `Nozo.state.render`.
   - API should include:
     - `setEnabled(flag)`
     - `attach(canvas)`
     - `detach()`
     - `draw(context)` (safe, guarded)
     - `setDebugPath(points)` for movement tracer support
     - `getDebugState()`
   - Draw minimal but useful overlays from current state:
     - current player aim direction
     - traps/autoBreak target markers
     - optional movement path line if available

2. Create Html/menu module:
   - `project-nozo-externals/src/html.js`
   - Attach `Nozo.html`, `Nozo.modules.html`, mirror `Nozo.state.html`.
   - API:
     - `setEnabled(flag)`
     - `mount()`
     - `unmount()`
     - `toggle()`
     - `setValue(key, value)` / `getValue(key)`
   - Keep persistence-compatible keys (localStorage/GM storage) where possible.
   - Add a default toggle setting for Html (default on).

3. Integrate in userscript:
   - Add `@require` for `render.min.js` and `html.min.js`.
   - Add `Nozo.render` and `Nozo.html` to externals checks.
   - In `Nozo.start()`, wire:
     - html mount (if enabled)
     - render attach when canvas available
   - Keep this resilient if canvas/UI isn’t ready at start.

4. Keep behavior safe:
   - No exceptions on missing canvas/context.
   - No direct gameplay packet send from render/html.
   - Use explicit guard returns and debug logs.

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
node --check .\project-nozo-externals\src\render.js
node --check .\project-nozo-externals\src\html.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
node --check .\project-nozo-externals\dist\render.min.js
node --check .\project-nozo-externals\dist\html.min.js
git -C .\project-nozo-externals status --short
```

If externals changed, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 10: Add render and html module foundations"
git -C .\project-nozo-externals push
```

## phase10-progress.md Format

Write concise report:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- render/html API
- checks run
- commits/pushes
- CDN URLs changed
- remaining risks
- next recommended phase
