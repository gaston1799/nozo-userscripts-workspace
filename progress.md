# Migration Progress

Last updated: 2026-05-18

---

## Phase 1: Vendor Extraction — COMPLETE

### Completed Tasks

- [x] Created `project-nozo-externals/dist/vendor/` directory
- [x] Extracted EasyStar UMD block (moomoo.js lines 2850–3113) → `dist/vendor/easystar.min.js`
- [x] Extracted msgpack browserify IIFE (moomoo.js line 3463) → `dist/vendor/msgpack.min.js`
- [x] Added `@require` entries to `project-nozo-next.user.js` in correct load order
- [x] Updated `project-nozo-externals/README.md` with vendor CDN URLs and load-order table
- [x] Passed `node --check` syntax validation on both vendor files
- [x] Committed and pushed to `project-nozo-externals` (`main` branch)
- [x] Created `progress.md`

### Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/dist/vendor/easystar.min.js` | Created — 16,135 bytes; EasyStar UMD extracted from moomoo.js lines 2850–3113 |
| `project-nozo-externals/dist/vendor/msgpack.min.js` | Created — 62,689 bytes; msgpack IIFE extracted from moomoo.js line 3463 |
| `project-nozo-externals/README.md` | Updated — added vendor CDN table and `@require` load order |
| `project-nozo-next.user.js` | Updated — added 2 new `@require` entries between gpu.js and utils.min.js |
| `progress.md` | Created — this file |

`moomoo.js` was **not modified**.

### CDN URLs

| File | CDN URL (pinned commit) | CDN URL (@main) |
|------|------------------------|-----------------|
| easystar.min.js | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@4342aa8/dist/vendor/easystar.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@main/dist/vendor/easystar.min.js` |
| msgpack.min.js | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@4342aa8/dist/vendor/msgpack.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@main/dist/vendor/msgpack.min.js` |
| utils.min.js | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@4342aa8/dist/utils.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@main/dist/utils.min.js` |

Commit hash: `4342aa8846c40f2f611b2dace9b642a40398ac04`

### @require order in project-nozo-next.user.js

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@main/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@main/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@main/dist/utils.min.js
```

### Tests Run

| Check | Result |
|-------|--------|
| `node --check dist/vendor/easystar.min.js` | PASS |
| `node --check dist/vendor/msgpack.min.js` | PASS |
| EasyStar first line matches moomoo.js line 2850 | PASS — `(function (root, factory) {` |
| EasyStar last line matches moomoo.js line 3113 | PASS — `});` |
| msgpack first 80 chars match moomoo.js line 3463 | PASS — `!function (t) { if ("object" == typeof exports ...` |
| File sizes are non-zero | PASS — 16,135 and 62,689 bytes |
| git push succeeded | PASS — `18dd7af..4342aa8 main -> main` |
| moomoo.js unmodified | PASS — not touched |

### Remaining Risks

| Risk | Severity | Notes |
|------|---------|-------|
| CDN cache propagation | Low | jsdelivr may serve stale `@main` for up to 24 h after push; use pinned commit hash URL to bypass during testing |
| EasyStar has 4-space indent from moomoo.js outer scope | Low | UMD is self-invoking; indentation does not affect execution; `window.EasyStar` will be defined correctly |
| moomoo.js still bundles both EasyStar variants inline | Medium | After Phase 1 the same library loads twice (once from `@require`, once from moomoo.js inline). This is harmless but wasteful. Remove from moomoo.js in a later phase once project-nozo-next.user.js fully replaces it |
| `EasyStar_` (old minified bundle, moomoo.js lines 3120–3433) is dead code | Low | testNew=1 so it is never used; leave it; do not extract |
| msgpack assignments `unsafeWindow.msgpack` and `document.msgpack` at lines 3465–3466 remain in moomoo.js | Low | These lines re-expose the global after the IIFE; harmless now; revisit in Phase 4 |
| No CDN cache headers validated | Low | Verify Network tab shows 200 on first load and `disk cache` on second load before treating Phase 1 as prod-ready |

---

## Completed Phases

| Phase | Name | Status | Commit |
|-------|------|--------|--------|
| 1 | Vendor Extraction | Complete | `4342aa8` |

## Remaining Phases

| Phase | Name | Status |
|-------|------|--------|
| 0 | Inventory | Planning (MIGRATION_PLAN.md exists) |
| 2 | Bootstrap | Not started |
| 3 | Utils/Constants | Not started (Utils already extracted) |
| 4 | Packet/Socket | Not started |
| 5 | Input | Not started |
| 6 | Attack/Aim | Not started |
| 7 | AutoBreak/Traps | Not started |
| 8 | Movement/Pathfinding | Not started |
| 9 | Render/UI | Not started |
| 10 | Remove Shims | Not started |

## Next Recommended Task

**Phase 2 — Bootstrap**

Create the `NozoNext` namespace with `state`, `modules`, `debug`, and `log` on `unsafeWindow`. Wire `_things`, `game`, and `WS` as the first Phase 1 globals in `NozoNext.state`. Add compatibility aliases so moomoo.js continues to run without changes.

Key files to touch:
- `project-nozo-next.user.js` — add bootstrap block after the existing `Nozo.log` definition
- No moomoo.js changes needed yet

Reference: `MIGRATION_PLAN.md` §3 Global State Map (CRITICAL tier: `_things` at 23479, `game` at 13790, `WS` at 3471/13781).
