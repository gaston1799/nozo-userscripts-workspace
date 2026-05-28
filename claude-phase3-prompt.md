# Phase 3 - Utils/Constants

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `progress.md`
- `phase2-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/README.md`
- `project-nozo-externals/src/utils.js`
- `project-nozo-externals/scripts/scripts.js`

## Completion Contract

Create `phase3-progress.md` only after all Phase 3 work, checks, and commits are complete.

Do not create `phase3-progress.md` at the beginning.

If blocked, still create `phase3-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 3 only: Utils/Constants foundation.

Allowed files:

- `project-nozo-next.user.js`
- `project-nozo-externals/src/`
- `project-nozo-externals/dist/`
- `project-nozo-externals/scripts/scripts.js`
- `project-nozo-externals/README.md`
- task/progress files

Forbidden files:

- Do not edit `moomoo.js`.
- Do not port combat, attack/aim, input, movement, render, `AutoBreaker`, or `Traps`.
- Do not move the huge `Items` or `Store` catalogs yet unless you first create a tiny constants foundation and explain why more is needed.

## Required Work

1. Confirm the current external `utils.min.js` should expose:
   - `NozoNext.Utils`
   - `NozoNext.createUtils()`
   - `NozoUtils`

2. Improve the externals build pipeline only if needed for Phase 3:
   - Keep readable code in `src/`.
   - Build output must remain `dist/*.min.js`.
   - Already-dist vendor files in `dist/vendor/` must not be rebuilt.
   - If you add recursive build or manifest support, keep it small and test it.

3. Add a small readable constants module if useful:
   - `project-nozo-externals/src/constants.js`
   - attach to `NozoNext.constants`
   - include only low-risk pure constants needed for bootstrap/testing, not huge gameplay catalogs
   - build to `dist/constants.min.js`
   - add `@require` after `utils.min.js` if created

4. Update `project-nozo-next.user.js` to verify Phase 3 externals:
   - `Nozo.Utils`
   - `Nozo.createUtils`
   - `Nozo.constants` if created
   - keep `Nozo.compat` compatibility behavior

5. Update docs with any new CDN URL and load order.

## Checks

Run relevant checks:

```powershell
node --check .\project-nozo-next.user.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
git -C .\project-nozo-externals status --short
```

If the externals repo changes, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 3: Add constants foundation"
git -C .\project-nozo-externals push
```

Only commit if changes are valid and scoped.

## phase3-progress.md Format

Write a concise Markdown report with:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- checks run
- git commits/pushes, if any
- CDN URLs added/changed
- remaining risks
- next recommended phase
