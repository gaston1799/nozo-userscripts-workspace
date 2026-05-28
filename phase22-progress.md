# Phase 22 — Remaining Class Parity + Bridge Burn-Down

Status: COMPLETE

---

## Summary

Phase 22 completed render class parity, net-event handler hardening, bridge fixes,
and items/model parity validation.

### Render class parity (`src/render.js`)

**`_renderDeadPlayers(ctx, px, py, cw, ch)`** — iterates `state.players` for entries
where `alive === false`, draws a dashed gray circle with "(EZ)" text overlay. Matches
the legacy `renderDeadPlayer` draw order (hands/body/label) in simplified form.
Routed to `gameContext` (actual game canvas) path.

**`_renderAIs(ctx, px, py, cw, ch)`** — iterates `state.ais`, draws each as a filled
circle with a direction indicator line. Mirrors `renderAI`'s per-entity position/scale
rendering. Routed to `gameContext` path.

**`_renderProjectiles(ctx, px, py, cw, ch)`** — iterates `state.projectiles` (bounded
map from `_handlerX`), draws each as a fading dot with direction indicator. Skips
entries older than 3000 ms. Routed to `gameContext` path.

**Build item indicator in `_renderOnePlayer` layer 0** — when `p.buildIndex >= 0` the
player is holding a placed item. Previously neither the weapon-below nor weapon-above
branch executed and nothing was drawn. Now draws a small circle at arm's reach in the
facing direction. Matches the "BUILD ITEM" section of legacy `renderPlayer`.

**`_getThingState()` bridge fix** — was `Nozo.globals || root._things || {}`, which
always short-circuited to `Nozo.globals` (an object). `Nozo.globals` does not carry
`pushVis_`, `spikeCones`, or `autoPushChain` — those are written by moomoo.js to its
own `_things` object, exposed at `unsafeWindow._things`. Fixed to
`root._things || Nozo.globals || {}` so push overlay and spike cone renders actually
read from the live moomoo.js state.

**`getActiveStyle` exposed in public API** — added to the `render` export object so
external modules can read the current visual style palette.

**gameCanvas path** — `_renderPlayers`, `_renderDeadPlayers`, `_renderAIs`, and
`_renderProjectiles` are all routed to `state.gameContext` (the actual game canvas).
The overlay canvas retains: aim arrow, range ring, target markers, path trace,
KBI animations, push overlay, spike cones, tracer ghost, HUD text.

### Items/model parity

`_weaponMeta` in `render.js` and `_resolveWeaponMeta` in `html.js` both already
prefer `Nozo.state.itemsData.raw` over `root.items.weapons` — no changes needed.
All read paths confirmed to use Nozo state-backed catalog first.

### Net-event handler hardening (`src/net-events.js`)

**Partial-tuple typed logs** — added `warn:net:<type>:partial-tuple` log when incoming
data length is not an exact multiple of the expected tuple stride:
- `I` (loadAI): stride 7
- `H` (loadGameObject): stride 8
- `a` (updatePlayers): stride 13

These previously silently skipped trailing bytes; they now emit a warn log with `len`
and `rem` fields so malformed server packets are observable.

**`_handlerL` notFound log** — when `objectManager.getBySid(sid)` returns null (object
was removed between H and L packets), emits `warn:net:L:notFound` with the sid. Was
previously a silent early return.

**`_handlerN` setReload routing** (carried from uncommitted wip) — numeric `index`
values now route through `playerModel.setReload` when available, ensuring the `reloads`
map is always an object rather than direct property assignment.

**`html.js` weaponIndex safety** (carried from uncommitted wip) — `_updateWeaponHud`
now guards with `Number.isFinite` and hides the icon element when no sprite src exists.

### Bridge burn-down

**`root._things`** — confirmed the alias `if (typeof root._things === "undefined") root._things = Nozo.globals`
in the main userscript is correctly guarded. At `document-idle` moomoo.js has already
run and set `unsafeWindow._things = _things` (line 24044), so the condition is false
and `root._things` remains moomoo.js's original `_things` object. The Nozo userscript
does **not** overwrite it. The alias line is kept for the case where moomoo.js is absent.

**`_getThingState()` fix** — was the primary bridge burn-down item this phase.
Corrected so render overlays that read from `_things.pushVis_`/`_things.spikeCones`
now see moomoo.js's live state.

**`Nozo.compat`** — `renderTail` and `renderSkin` hooks remain optional in
`_renderOnePlayer`. They are guarded by `typeof === "function"` checks and never
called if absent. No stub removal needed.

---

## Files Changed

| File | Change |
|------|--------|
| `project-nozo-externals/src/render.js` | Added `_renderDeadPlayers`, `_renderAIs`, `_renderProjectiles`; build item indicator in `_renderOnePlayer`; `_getThingState` fix; `getActiveStyle` export; gameCanvas routing for new renders |
| `project-nozo-externals/src/net-events.js` | Partial-tuple warn logs for I/H/a; notFound log in `_handlerL`; setReload routing in `_handlerN` (wip carry-in); html.js wip carry-in |
| `project-nozo-externals/src/html.js` | `weaponIndex` guard + icon hide/show (wip carry-in) |
| `project-nozo-externals/dist/*.min.js` (all 22) | Full rebuild |
| `project-nozo-next.user.js` | Phase label → Phase 22; all `@require` hashes `f333953` → `c3047b0` |

**Not changed**: `src/object-model.js`, `src/object-manager.js`, `src/player.js`,
`src/traps.js`, `src/autobreak.js`, `src/combat.js`, `src/movement.js`,
`src/healer.js`, `src/tick-scheduler.js`, `src/packet.js`, `src/input.js` —
no Phase 22 parity gaps in these files.

---

## Checks Run

| Check | Result |
|-------|--------|
| `node --check project-nozo-next.user.js` | PASS |
| `npm --prefix project-nozo-externals run check` | PASS — 22 src files + scripts.js |
| `npm --prefix project-nozo-externals run build` | PASS — 22 modules built |

---

## Commits

| Hash | Message |
|------|---------|
| `c3047b0` | Phase 22: render parity (AI/projectile/dead-player), net-event hardening, bridge fix |

Previous last commit: `f333953`
All `@require` URLs updated to `c3047b0`.

---

## All `// BRIDGE:` Annotations (updated inventory)

No new BRIDGE annotations added in Phase 22. The `_getThingState` fix removed the
need for a BRIDGE comment there since the correct fallback order is now in place.

Existing BRIDGE annotations from Phase 19/20 remain valid (see `phase20-progress.md`
for the full table). Total bridge annotations: **12** across 3 files (unchanged).

---

## Remaining Gaps and Recommended Phase 23 Scope

| Gap | Severity | Notes |
|-----|----------|-------|
| Render sprite loading for tools/weapons | Low | `_renderOnePlayer` draws geometric lines for weapons. Adding sprite loading (Image cache + URL from itemsData.src) would match moomoo.js visual fidelity. Not required for functional parity. |
| `renderTail` / `renderSkin` not wired | Low | `Nozo.compat.renderTail` and `Nozo.compat.renderSkin` hooks exist but are never set. Wiring requires accessing moomoo.js's closed-scope `renderTail`/`renderSkin` functions. |
| `healingBeta` mode not ported | Medium | `dontAutoHeal` weapon-list gate, hit-back trigger (`my.inHitBack`), shield anti path. Carried from Phase 20. |
| `antiSyncHealing` not ported | Low | Burst-heal mode under `my.antiSync`. |
| `predictHeal(N)` not ported | Low | Speculative multi-item placement. |
| `combat.setEnabled()` master switch | Low | No menu master toggle for auto-aim. Sub-toggles exist. |
| `getThresholdRadius` not called by scan loops | Low | Helper exists in objectModel but traps/autobreak still compute threshold inline. |
| Push overlay / spike cones require moomoo.js bridge | Medium | Now that `_getThingState` is fixed, push overlay and spike cones will render when moomoo.js writes `_things.pushVis_` / `_things.spikeCones`. These are written by moomoo.js's own render code, so they should now work at runtime. Verify in-game. |
