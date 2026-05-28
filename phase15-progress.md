# Phase 15 — Original Menu Port (Html Toggle-Wired)

Status: COMPLETE

---

## Summary

Phase 15 expanded `html.js` into a fully sectioned menu with four sections
(Render / Combat / Movement / Debug), wired every toggle to the corresponding
live Nozo module, and added `setEnabled()` entry points to the three modules
that previously lacked one (traps, autobreak, movement). All persisted defaults
are applied on mount. The movement helper defaults to `false`; all others
default to `true`. All checks pass. Pushed to `main` as two commits
(`94a36c8` + `e99aec9`). `@require` hashes pinned to `e99aec9`.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/html.js` | Full menu rewrite: 4 sections (Render/Combat/Movement/Debug), `_makeSection` helper, 5 `_applyXxx` wiring callbacks, scrollable body, defaults applied on mount |
| `project-nozo-externals/src/traps.js` | Added `state.enabled=true`, `setEnabled(flag)` (clears aim when disabled), disabled guard at top of `scan()`, exported `setEnabled` on public API |
| `project-nozo-externals/src/autobreak.js` | Added `state.enabled=true`, `setEnabled(flag)` (clears aim when disabled), disabled guard at top of `scan()`, exported `setEnabled` on public API |
| `project-nozo-externals/src/movement.js` | Added `state.enabled=false` (off by default), `setEnabled(flag)`, disabled guard at top of `step()`, exported `setEnabled` on public API |
| `project-nozo-externals/dist/html.min.js` | Rebuilt (9200b → 14348b) |
| `project-nozo-externals/dist/traps.min.js` | Rebuilt (13834b → 14774b) |
| `project-nozo-externals/dist/autobreak.min.js` | Rebuilt (19936b → 19626b) |
| `project-nozo-externals/dist/movement.min.js` | Rebuilt (9311b → 9348b) |
| `project-nozo-externals/dist/*.min.js` (all others) | Rebuilt (obfuscator re-seed) |
| `project-nozo-next.user.js` | Phase label → Phase 15; @require hashes → e99aec9 |

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — 12 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — 12 modules built |
| `git -C project-nozo-externals status --short` | PASS — clean after commit |

---

## Git Commits (externals)

| Hash | Message |
|------|---------|
| `94a36c8` | Phase 15 - Original Menu Port (Html Toggle-Wired) |
| `e99aec9` | Phase 15 - rebuild dist (obfuscator re-seed) |

Pushed to `main` at `https://github.com/gaston1799/project-nozo-externals`.

---

## What Changed and Why

### 1. html.js — full menu expansion

`mount()` now builds four labeled sections using a `_makeSection(doc, label)`
helper that renders a green-tinted uppercase divider. Each section contains
`_makeRow` checkboxes that call module-specific `_applyXxx` callbacks on
change. The panel body gains `overflow-y:auto;max-height:calc(80vh - 36px)`
so it scrolls in-game without blocking the viewport.

**DEFAULTS** extended to cover all toggle keys:
```
"html.enabled":      true   (back-compat, not shown as a row)
"render.enabled":    true
"traps.enabled":     true
"autobreak.enabled": true
"movement.enabled":  false  (disabled by default — requires explicit opt-in)
"debug.enabled":     true
```

All five `_applyXxx` calls run at end of `mount()` with the loaded
`state.settings` values, so persisted state is applied without any user
interaction on first load.

### 2. traps.js — setEnabled

`state.enabled = true` added. `setEnabled(flag)` calls `clearAim("disabled")`
when turning off so no stale aim survives. `scan()` returns early with
`reason: "disabled"` when flag is false. Exported on the public `traps` object.

### 3. autobreak.js — setEnabled

Same pattern as traps. `clearAim("disabled")` on disable prevents residual aim
from being consumed by `combat.calculateAim` after the toggle is turned off.

### 4. movement.js — setEnabled

`state.enabled = false` (off by default). `setEnabled(flag)` logs the change.
`step()` returns `{ok: false, reason: "disabled"}` at the top when flag is false,
before the `canMove()` gate, so no socket calls or path computation occur.
Default-off prevents unintended server movement during normal bot use.

---

## @require order in project-nozo-next.user.js (pinned to e99aec9)

```js
// @require https://unpkg.com/gpu.js@2.16.0/dist/gpu-browser.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/vendor/easystar.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/vendor/msgpack.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/utils.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/constants.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/packet.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/input.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/combat.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/player.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/net-events.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/traps.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/autobreak.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/movement.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/render.min.js
// @require https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@e99aec9/dist/html.min.js
```

---

## Remaining Parity Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| No combat.setEnabled toggle | Medium | Combat module has no enabled gate. Phase 16 should add `combat.setEnabled()` so the menu can expose a "Combat Auto-Aim" master toggle. |
| No render.setEnabled in combat HUD | Low | HUD elements are unconditionally drawn when render is enabled; no per-HUD-layer toggle. Phase 16 can add granular draw flags. |
| No per-weapon toggle | Low | Single "AutoBreak" toggle controls all break levels. Level-3 (break-all) is particularly aggressive. Phase 16 could expose a "Break Level" selector. |
| initData not parsed | Medium | `_weaponRanges` in combat.js is a static table. `RELOAD_TICK` is base 400 ms. Real values are in the A-handler initData. Phase 16 should parse `state.initData` to get live weapon catalog. |
| RAF mode not in menu | Low | `Nozo.bridge.setRafMode()` is console-only. Phase 16 can expose a Debug section dropdown or toggle for `hard-block` vs `passthrough`. |
| X/Y projectile shape unverified | Medium | `_handlerX` reads args positionally; live shape unknown. Phase 16 live-test with `netEventCounters.X` data. |
| No keyboard shortcut to toggle menu | Low | Phase 16 can add a keybind (e.g. Insert) to call `html.toggle()` in-game. |

---

## Recommended Phase 16 Scope

**Phase 16 — initData Parsing + Combat Toggle + Menu Polish**

1. **Parse A (setInitData)**: decode `state.initData` to extract weapons/ages tables; store as `Nozo.state.itemsData`.
2. **Real weapon ranges + reload**: replace `_weaponRanges` static table and `RELOAD_TICK` with live values from itemsData.
3. **combat.setEnabled()**: add enabled gate to combat.js so the menu "Combat" section can expose an auto-aim master switch.
4. **RAF mode toggle**: expose `hard-block` / `passthrough` as a Debug section toggle in html.js.
5. **Menu keybind**: wire Insert key (or configurable) to `Nozo.html.toggle()` for in-game convenience.
6. **X/Y arg layout verification**: confirm projectile packet shape from live `netEventCounters`; update `_handlerX` if needed.
