# Phase 2 - Bootstrap

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `findings.md`
- `progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/README.md`

## Completion Contract

Create `phase2-progress.md` only after all Phase 2 work, checks, and commits are complete.

Do not create `phase2-progress.md` at the beginning.

If blocked, still create `phase2-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 2 only: Bootstrap.

Allowed files:

- `project-nozo-next.user.js`
- `project-nozo-externals/README.md` if documentation needs a small update
- `task.md` / progress files if useful

Forbidden files:

- Do not edit `moomoo.js`.
- Do not port gameplay systems yet.
- Do not edit attack/aim logic.
- Do not move readable modules yet.

## Required Bootstrap Work

Strengthen `unsafeWindow.NozoNext` in `project-nozo-next.user.js`.

Keep the current userscript metadata and `@require` order intact.

The bootstrap should provide stable APIs:

- `Nozo.version`
- `Nozo.root`
- `Nozo.state`
- `Nozo.modules`
- `Nozo.debug`
- `Nozo.log(type, payload)`
- `Nozo.register(name, moduleFactory)`
- `Nozo.getState(key, fallbackValue)`
- `Nozo.setState(key, value)`
- `Nozo.compat`
- `Nozo.start()`

Add external availability checks for:

- `Nozo.Utils`
- `Nozo.createUtils`
- `window.EasyStar`
- `window.msgpack`

Expose compatibility aliases only inside `Nozo.compat`; do not create new random globals.

Debug/start output should show:

- page URL
- registered modules
- external availability summary
- current phase: `Phase 2 - Bootstrap`

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
```

Also inspect git state:

```powershell
git -C .\project-nozo-externals status --short
```

## Commit / Push Policy

Commit and push only valid scoped changes.

If `project-nozo-externals` was not changed, do not force a commit there.

If only local userscript files changed and they are not in a git repo, say so in `phase2-progress.md`.

## phase2-progress.md Format

Write a concise Markdown report with:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- tests/checks run
- git commits/pushes, if any
- remaining risks
- next recommended phase
