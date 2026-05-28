# Phase 2 — Bootstrap

Status: COMPLETE

---

## Summary

Strengthened `unsafeWindow.NozoNext` in `project-nozo-next.user.js` with all required Phase 2 APIs. The existing bootstrap was extended (not rewritten) — metadata block and `@require` order are unchanged.

Added:
- `Nozo.getState(key, fallback)` — safe read from `Nozo.state` with undefined-aware fallback
- `Nozo.setState(key, value)` — write to `Nozo.state`
- `Nozo.compat` — lazy-getter object holding `NozoNext`, `UTILS`, and `createUtils` aliases; no new globals created
- External availability checks in `Nozo.start()` for `Nozo.Utils`, `Nozo.createUtils`, `window.EasyStar`, `window.msgpack`
- `Nozo.start()` now logs `phase: "Phase 2 - Bootstrap"`, `href`, `modules[]`, and `externals{}` together

`Nozo.register` was also tightened: local variable renamed from `module` (CJS reserved) to `mod`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-next.user.js` | Added `getState`, `setState`, `compat`; updated `start()` with phase/externals output |

`moomoo.js` — not touched.
`project-nozo-externals/` — not touched (git status confirmed clean).

---

## Tests / Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `git -C project-nozo-externals status --short` | PASS — empty (no changes) |

---

## Git Commits / Pushes

`project-nozo-next.user.js` is not inside a git repository (`C:\Users\Naquan\userscripts` has no `.git`). No commit was created. `project-nozo-externals` was unchanged so no commit there either.

---

## API Surface After Phase 2

| API | Status |
|-----|--------|
| `Nozo.version` | ✓ |
| `Nozo.root` | ✓ |
| `Nozo.state` | ✓ |
| `Nozo.modules` | ✓ |
| `Nozo.debug` | ✓ |
| `Nozo.log(type, payload)` | ✓ |
| `Nozo.register(name, factory)` | ✓ |
| `Nozo.getState(key, fallback)` | ✓ new |
| `Nozo.setState(key, value)` | ✓ new |
| `Nozo.compat` (NozoNext / UTILS / createUtils) | ✓ new |
| `Nozo.start()` with phase + externals | ✓ updated |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| `Nozo.compat` guards against double-init but does not deep-merge if caller added extra keys before this script ran | Low | Acceptable until Phase 3 wires a real module for Utils |
| `Nozo.Utils` / `Nozo.createUtils` will be `false`/`false` in `start()` externals until the `utils.min.js` `@require` populates them | Low | Expected during Phase 2; Utils already extracted; Phase 3 will confirm these flip to `true` |
| CDN cache for `@main` pinned URLs may lag | Low | Use commit-hash URLs from `progress.md` for testing if stale behaviour is seen |
| `project-nozo-next.user.js` is outside any git repo — no version history for this file | Medium | Consider adding the file to a git repo or tracking it separately before Phase 3 |

---

## Next Recommended Phase

**Phase 3 — Utils/Constants**

- Confirm `Nozo.Utils` and `Nozo.createUtils` are populated by `utils.min.js` (externals check should flip to `true`).
- Move pure constants / items / config blocks from `moomoo.js` into `project-nozo-externals/src/`.
- Wire `const UTILS = NozoNext.createUtils()` compatibility alias so moomoo.js continues to run.
- Key reference: `findings.md` §Readable Modules — Items (lines 15369–16154), Store (lines 16353–16828) are the large ones; start with smaller constants first.
