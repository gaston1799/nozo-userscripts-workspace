# Phase 11 - Stability/Cleanup

You are running inside `C:\Users\Naquan\userscripts`.

Read these first:

- `task.md`
- `phase8-progress.md`
- `phase9-progress.md`
- `project-nozo-next.user.js`
- `project-nozo-externals/src/`
- `project-nozo-externals/README.md`

## Completion Contract

Create `phase11-progress.md` only after all Phase 11 work, checks, and commits are complete.

Do not create `phase11-progress.md` at the beginning.

If blocked, still create `phase11-progress.md` with:

- `Status: BLOCKED`
- reason
- files touched
- tests/checks attempted
- exact next action needed

## Scope

Implement Phase 11 only: runtime stability hardening and shim cleanup.

Allowed files:

- `project-nozo-next.user.js`
- `project-nozo-externals/src/`
- `project-nozo-externals/dist/`
- `project-nozo-externals/package.json`
- `project-nozo-externals/README.md`
- task/progress files

Forbidden files:

- Do not edit `moomoo.js`.
- Do not reintroduce legacy globals.
- Do not add new combat packet paths.

## Required Work

1. WebSocket lifecycle hardening:
   - Ensure re-connects are handled safely.
   - Remove stale listeners on close/replacement.
   - Keep `Nozo.state.WS` consistent.

2. Tick/render lifecycle hardening:
   - Ensure only one bridge tick loop is active.
   - Ensure render attach/detach is resilient across canvas replacement.
   - Add guarded cleanup hooks where needed.

3. HTML lifecycle hardening:
   - Prevent duplicate panel mounts.
   - Keep default-on toggle behavior.
   - Ensure clean unmount path.

4. Remove temporary shims/dead fallbacks where safe:
   - Keep only compatibility aliases explicitly still needed.
   - Remove stale scaffold branches that no longer execute.
   - Keep behavior equivalent.

5. Documentation/update:
   - Update README for lifecycle expectations and cleanup behavior.
   - Ensure userscript `@require` pins are updated to this phase commit.

## Checks

Run:

```powershell
node --check .\project-nozo-next.user.js
npm --prefix .\project-nozo-externals run check
npm --prefix .\project-nozo-externals run build
git -C .\project-nozo-externals status --short
```

If externals changed, commit and push:

```powershell
git -C .\project-nozo-externals add .
git -C .\project-nozo-externals commit -m "Phase 11: Runtime stability and cleanup"
git -C .\project-nozo-externals push
```

## phase11-progress.md Format

Write concise report:

- `Status: COMPLETE` or `Status: BLOCKED`
- summary
- files changed
- lifecycle fixes
- cleanup items removed
- checks run
- commits/pushes
- CDN URLs changed
- remaining risks
- next recommended phase
