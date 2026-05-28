# Phase 3 — Utils/Constants

Status: COMPLETE

---

## Summary

Phase 3 created the constants foundation and confirmed the utils externals pipeline is solid.

- `src/constants.js` added to externals: pure bootstrap constants on `NozoNext.constants`
- `dist/constants.min.js` built and committed
- `package.json` `check` script expanded to cover `src/constants.js`
- `project-nozo-next.user.js` updated: new `@require`, `Nozo.constants` check in `start()`, phase label bumped to "Phase 3 - Utils/Constants"
- `README.md` updated with new CDN URL and load-order table
- All `@require` lines pinned to commit `c6286fa`

`moomoo.js` — not touched.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/constants.js` | Created — pure bootstrap constants (`VERSION`, `MAP_SCALE`, `TICK_MS`, `RELOAD_TICK`, `MAX_LOG`) on `NozoNext.constants` |
| `project-nozo-externals/dist/constants.min.js` | Created — obfuscated+minified build of `src/constants.js` (573b → ~1537b) |
| `project-nozo-externals/dist/utils.min.js` | Rebuilt (same source, refreshed obfuscator output) |
| `project-nozo-externals/package.json` | Added `src/constants.js` to `check` script |
| `project-nozo-externals/README.md` | Added `constants.min.js` to `@require` order and project modules table |
| `project-nozo-next.user.js` | Added `@require` for `constants.min.js`; added `Nozo.constants` to `start()` externals check; updated phase label; bumped all commit hashes to `c6286fa` |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `node --check src/constants.js` | PASS |
| `node --check src/utils.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS |
| `npm --prefix project-nozo-externals run build` | PASS — `constants.js → dist/constants.min.js`, `utils.js → dist/utils.min.js` |
| `git -C project-nozo-externals status --short` | PASS — clean |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `05df7fc` | Phase 3 - Utils/Constants foundation |
| `39a5043` | docs: update README with constants.min.js CDN entry and load order |
| `c6286fa` | build: refresh dist outputs (obfuscator is non-deterministic) |

All three commits pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## API Surface After Phase 3

| API | Status |
|-----|--------|
| `Nozo.version` | ✓ |
| `Nozo.root` | ✓ |
| `Nozo.state` | ✓ |
| `Nozo.modules` | ✓ |
| `Nozo.debug` | ✓ |
| `Nozo.log(type, payload)` | ✓ |
| `Nozo.register(name, factory)` | ✓ |
| `Nozo.getState(key, fallback)` | ✓ |
| `Nozo.setState(key, value)` | ✓ |
| `Nozo.compat` (NozoNext / UTILS / createUtils) | ✓ |
| `Nozo.Utils` (class) | ✓ via utils.min.js |
| `Nozo.createUtils()` | ✓ via utils.min.js |
| `Nozo.constants` | ✓ new — via constants.min.js |
| `Nozo.start()` with phase + externals | ✓ updated to Phase 3 |

---

## CDN URLs (pinned to c6286fa)

| File | CDN URL |
|------|---------|
| `easystar.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c6286fa/dist/vendor/easystar.min.js` |
| `msgpack.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c6286fa/dist/vendor/msgpack.min.js` |
| `utils.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c6286fa/dist/utils.min.js` |
| `constants.min.js` | `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c6286fa/dist/constants.min.js` |

`@main` variants work too; use pinned hashes to bypass jsdelivr CDN cache during testing.

---

## @require order in project-nozo-next.user.js

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c6286fa/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c6286fa/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c6286fa/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@c6286fa/dist/constants.min.js
```

---

## Decisions / Scope Notes

- Items and Store catalogs (moomoo.js lines 15369–16154, 16353–16828) were **not** ported — they are hard extractions with deep coupling, deferred to a later phase.
- `constants.js` contains only five pure numeric/string values needed for bootstrap verification. No gameplay catalogs.
- Build pipeline (`scripts/scripts.js`) was **not** changed — it already handles multiple `src/*.js` files correctly. Manifest/subfolder improvements noted in `findings.md` are deferred to P2/P3 gap work.
- The obfuscator is non-deterministic (random dead-code seeds); a second `npm run build` always diffs against the prior dist output. Added a note about this in the refresh commit message.

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Obfuscator non-determinism means `dist/` diffs on every rebuild | Low | Cosmetic; output is functionally equivalent; pin commit hash in `@require` to freeze the CDN copy |
| CDN cache propagation for `@main` | Low | Use pinned hash URLs during testing |
| `project-nozo-next.user.js` has no git history | Medium | File is outside any git repo; changes are untracked |

---

## Next Recommended Phase

**Phase 4 — Packet/Socket**

- Centralize `packet()` from moomoo.js and wire it through `NozoNext`.
- Centralize `sendAutoGather()`.
- Add debug hooks for packet type, angle, tick, and caller tag.
- Key reference: `findings.md` §Combat Pipeline Problems — five competing D-send sites.
