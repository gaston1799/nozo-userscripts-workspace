# Unported Classes Migration Plan
**Target:** `project-nozo-single.user.js`  
**Source of truth:** `moomoo.js` (read-only — do not edit)  
**Extracted references:** `classes-out/`  
**Date:** 2026-05-24

---

## Status

PLAN ONLY — no code changes in this document.  
Gate is live: `BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE = true` (line 18).  
All packet handlers dispatch correctly; zero unported classes are referenced in the single file today.

---

## Assumptions

1. Classes extracted to `classes-out/` are verbatim copies from `moomoo.js` and represent the canonical behavior contract.
2. The single file uses `"use strict"` and must remain a single concatenated script — no module imports.
3. Global-scope names used by extracted classes (`player`, `UTILS`, `objectManager`, `near`, `enemy`, `nearObjs`, `config`, `configs`, `items`, `_things`, `game`, `buyEquip`, `selectWeapon`, `sendAutoGather`, `findObjectBySid`, `mapDisplay`) must be bridged via closure or adapter before each class is instantiated.
4. `PlayerRuntime` is the authoritative state container; ported classes should prefer `PlayerRuntime` fields over re-reading globals.
5. `root = unsafeWindow ?? window` is available at module scope for global bridges.
6. Two distinct `Node` classes exist: `Node` (inside EasyStarJS cluster, `classes-out/Node.js`) and `Node_2` (`classes-out/Node_2.js`). They must be renamed to avoid collision: `EasyNode` and `AStarNode` respectively.
7. `moomoo.js` will not be edited under any circumstances.

---

## Class Dependency Graph (text)

```
CustomLogging ──────────────────────────────── (none)
deadfuturechickenmodrevival ─────────────────── (unsafeWindow)
LyricsPlayer ────────────────────────────────── (audio DOM)
addCh ───────────────────────────────────────── (none)
Petal ───────────────────────────────────────── (none)
Store ───────────────────────────────────────── (none)
Autoupgrade ─────────────────────────────────── (upg callback only)

Utils ───────────────────────────────────────── (Math stdlib)
    └─ Animtext ──────────────────────────────── (Utils, config)
           └─ Textmanager ───────────────────── (Animtext)
    └─ DeadPlayer ───────────────────────────── (Utils)
    └─ AutoBreaker ──────────────────────────── (Utils, items, player, nearObjs, near, enemy)
    └─ Traps / Traps_ ───────────────────────── (Utils, items, player, objectManager, near, config, configs)
    └─ BotObjManager ────────────────────────── (Utils, config, gameObjects, BotObject)
    └─ Bot ──────────────────────────────────── (Utils, config, items, Store)

MapPing ─────────────────────────────────────── (config, mapDisplay)
Damages ─────────────────────────────────────── (Items — already ported)
Autobuy ─────────────────────────────────────── (Store, player)

CachedMapResource ───────────────────────────── (player, findObjectBySid bridge)
    ├─ CachedTreeResource ───────────────────── (CachedMapResource)
    ├─ CachedBushResource ───────────────────── (CachedMapResource)
    ├─ CachedCatusResource ──────────────────── (CachedMapResource)
    ├─ CachedStoneResource ──────────────────── (CachedMapResource)
    └─ CachedGoldminResource ────────────────── (CachedMapResource)

MinHeap ─────────────────────────────────────── (none)
Node (EasyNode) ─────────────────────────────── (none)
SearchState ─────────────────────────────────── (MinHeap, EasyNode)
EasyStarJS ──────────────────────────────────── (MinHeap, EasyNode, SearchState)
Node_2 (AStarNode) ─────────────────────────── (none)

Instakill ───────────────────────────────────── (items, player, near, game, _things, buyEquip,
                                                  selectWeapon, sendAutoGather, getEl)

BotObject ───────────────────────────────────── (none)
BotObjManager ───────────────────────────────── (BotObject, Utils, config, gameObjects)
Bot ─────────────────────────────────────────── (config, Utils, items, Store, EasyStarJS)
```

---

## Phased Plan

---

### Phase 1 — Foundation Utilities
**Rationale:** `Utils` is consumed by 8+ other unported classes and is pure math — zero runtime side effects. `CustomLogging` has zero dependencies and provides a debug aid for all subsequent phases. These can be copied verbatim.

**Must port before updatePlayers full parity:** YES (Utils is needed by Textmanager→_h8 and DeadPlayer)

---

#### `Utils`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,120,515 – 1,147,184 · `classes-out/Utils.js` |
| **Current usage in single file** | None — not instantiated. Callers inside extracted classes reference `UTILS` as a module-scope singleton. |
| **Required adapter/bridge** | After class declaration, add: `const UTILS = new Utils();` at module scope. All downstream extracted classes already reference the global `UTILS` identifier. |
| **Expected side effects / state writes** | None — stateless math class. Constructor closes over local `Math.*` aliases. |
| **Risk** | LOW |

**Port checklist:**
- Copy class body verbatim from `classes-out/Utils.js`.
- Place before any class that depends on `UTILS`.
- Add `const UTILS = new Utils();` immediately after the class.
- The `containsPoint` method references `unsafeWindow.scrollX/scrollY`; the single file has `root = unsafeWindow ?? window`, so guard: `const _uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;` inside `containsPoint`.

---

#### `CustomLogging`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 426,550 – 428,021 · `classes-out/CustomLogging.js` |
| **Current usage in single file** | None — not instantiated. |
| **Required adapter/bridge** | None. Pure class, no global reads. |
| **Expected side effects / state writes** | None — wraps `console.log` only. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim.
- Place near top of file (before Entity class) for availability during all subsequent phases.
- Optionally instantiate a module-scope logger: `const _log = new CustomLogging("NozoSingle");`

---

**Phase 1 verification checkpoint:**
- `new Utils()` does not throw.
- `UTILS.getDistance(0,0,3,4) === 5`.
- `UTILS.getAngleDist(0, Math.PI) === Math.PI`.
- `new CustomLogging("Test").log("ok")` prints styled output to console.

---

### Phase 2 — Visual / Data-Only Classes
**Rationale:** These classes are either pure data holders (no external deps) or renderer helpers that depend only on Utils + config. They unblock the final wiring of `_h8` (showText) and `_h9` (pingMap) which currently just queue raw data.

**Must port before updatePlayers full parity:**
- `Animtext` + `Textmanager` — YES (_h8 must call `textManager.showText()`)
- `MapPing` — YES (_h9 must instantiate `MapPing` objects)
- `DeadPlayer`, `addCh`, `Petal` — NO (can defer; death/chat logic is separate)
- `Store`, `Damages` — NO (needed only for combat classes in Phase 4+)

---

#### `Animtext`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,147,203 – 1,150,865 · `classes-out/Animtext.js` |
| **Current usage in single file** | Instantiated by `Textmanager.showText` — not yet in single file. |
| **Required adapter/bridge** | Reads `UTILS.randFloat` (available after Phase 1). Reads `config.anotherVisual` — bridge as `const _cfgGet = (k) => (root.config && root.config[k] !== undefined ? root.config[k] : _config[k]);`. |
| **Expected side effects / state writes** | Mutates its own `x, y, scale, alpha, life` during `update(delta)`. Reads canvas context for `render()`. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim from `classes-out/Animtext.js`.
- Verify `UTILS.randFloat` is available (Phase 1 complete).
- `config` references inside the class use `root.config` or the `_config` bridge — add `const config = root.config || _config;` inside the render/update closures if needed, or rewrite the two `config.anotherVisual` reads to use `root.config?.anotherVisual`.

---

#### `Textmanager`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,150,884 – 1,152,490 · `classes-out/Textmanager.js` |
| **Current usage in single file** | `_h8` currently pushes raw `{x,y,value,type,at}` into `this.textQueue`. After port, `_h8` should call `playerRuntime.textManager.showText(x, y, scale, speed, life, text, color)`. |
| **Required adapter/bridge** | Depends on `Animtext` (Phase 2). Needs a canvas context for `update()` — accept `ctxt, xOff, yOff` as call-site parameters; do not store ctx in the manager. |
| **Expected side effects / state writes** | Maintains internal `this.texts[]` pool of `Animtext` instances. No writes to global state. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim.
- Add `this.textManager = new Textmanager();` inside `PlayerRuntime` constructor.
- Wire `_h8`: replace `this.textQueue.push(...)` with `this.textManager.showText(x, y, /* scale */ 24, /* speed */ 0.12, /* life */ 2000, String(value), /* color */ type === 1 ? "#ff4444" : "#ffffff");`. Keep the queue as a fallback if textManager is not yet present.
- The text queue can remain for logging/debug; it is not harmful.

---

#### `DeadPlayer`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,250,848 – 1,252,609 · `classes-out/DeadPlayer.js` |
| **Current usage in single file** | `_hP` (killPlayer) sets `inGame = false` and `p.alive = false` but does not create a `DeadPlayer`. The render loop (not yet ported) would consume it. |
| **Required adapter/bridge** | Reads `UTILS.getAngleDist` (available after Phase 1). No other external deps. |
| **Expected side effects / state writes** | Manages its own animation state. Caller must push instance into a `deadPlayers[]` array in `PlayerRuntime`. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim.
- Add `this.deadPlayers = [];` in `PlayerRuntime` constructor.
- In `_hP`: `this.deadPlayers.push(new DeadPlayer(p.x, p.y, p.dir, p.buildIndex, p.weaponIndex, p.weaponVariant, p.skinColor, p.scale, p.name));`
- Prune entries where `!dp.active` in a periodic sweep or render loop.

---

#### `addCh`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,250,424 – 1,250,829 · `classes-out/addCh.js` |
| **Current usage in single file** | `_h6` (receiveChat) pushes to `sender.chatMessages[]`. Currently uses raw objects. `addCh` is the proper typed structure. |
| **Required adapter/bridge** | None — pure data class. |
| **Expected side effects / state writes** | None. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim.
- Optionally update `_h6` to `sender.chatMessages.push(new addCh(sender.x, sender.y, message, sender));` instead of the raw object. Keep backward-compatible property names (`chat`, `alpha`, `active`).

---

#### `Petal`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,249,741 – 1,250,405 · `classes-out/Petal.js` |
| **Current usage in single file** | None — no petal packet handler ported yet. |
| **Required adapter/bridge** | None — pure data class. |
| **Expected side effects / state writes** | None. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim.
- Add `this.petals = [];` in `PlayerRuntime` constructor as a placeholder.
- No packet handler to wire yet; deferred to render-loop porting.

---

#### `MapPing`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte (at end of file) ~byte 10,962,312 – 10,963,820 · `classes-out/MapPing.js` |
| **Current usage in single file** | `_h9` pushes `{x, y, at}` into `this.mapPings[]`. Should push `MapPing` instances instead. |
| **Required adapter/bridge** | Reads `config.mapScale` and `mapDisplay` (a canvas element). Bridge: `const mapDisplay = root.mapDisplay || document.getElementById("mapCanvas") || { width: 200 };`. The single file should store a ref in `PlayerRuntime`. |
| **Expected side effects / state writes** | Manages its own `scale` and `active` state. Caller renders by calling `.update(ctxt, delta)`. |
| **Risk** | MED (mapDisplay reference may not exist at port time) |

**Port checklist:**
- Copy verbatim.
- Add `this.mapPingPool = [];` in `PlayerRuntime`.
- In `_h9`: find an inactive ping in pool or create new `new MapPing("#ffffff", 100)`, call `.init(x, y)`, push to pool.
- Replace raw queue push — keep raw fallback if `mapDisplay` is null.

---

#### `Store`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,206,262 – 1,228,486 · `classes-out/Store.js` |
| **Current usage in single file** | Referenced by `Autobuy` (`store.hats`, `store.accessories`). Not yet in single file. |
| **Required adapter/bridge** | None — pure data catalog. No global reads in constructor. |
| **Expected side effects / state writes** | None — immutable catalog. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim (large class, ~22 KB).
- Add `this.store = new Store();` in `PlayerRuntime` constructor after `this.items`.
- The `_h5` (updateStoreItems) handler already writes to `p.skins`/`p.tails` which mirrors `store.hats`/`store.accessories` lookups. No change to _h5 needed.

---

#### `Damages`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,556,094 – 1,557,074 · `classes-out/Damages.js` |
| **Current usage in single file** | Not referenced. Used by Instakill internally. |
| **Required adapter/bridge** | Constructor takes `items` — pass `this.items` from `PlayerRuntime`. |
| **Expected side effects / state writes** | Builds `this.weapons[]` array at construction time. No side effects. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim.
- Add `this.damages = new Damages(this.items);` in `PlayerRuntime` constructor after `this.items`.
- Items may not be hydrated yet at construction time — lazy-init: create `Damages` inside the `_hA` handler after `applyInitCatalog`, replacing any stale instance.

---

**Phase 2 verification checkpoint:**
- `new Animtext()` initializes without error.
- `playerRuntime.textManager.showText(100, 100, 24, 0.1, 2000, "test", "#fff")` does not throw.
- `_h8` packet correctly routes to `textManager.showText`.
- `new DeadPlayer(0, 0, 0, -1, 0, 0, 0, 35, "test")` creates an active object.
- `_hP` pushes a `DeadPlayer` into `playerRuntime.deadPlayers`.
- `new MapPing("#fff", 100)` initializes; `_h9` pushes an initialized `MapPing` into `mapPingPool`.
- `playerRuntime.store.hats.length > 0` (catalog populated).
- `new Damages(items).weapons.length === items.weapons.length`.

---

### Phase 3 — Autobuy / Autoupgrade
**Rationale:** These depend on Store (Phase 2) and the player state already present. They are safe to isolate because they only write back through the existing send-action API.

**Must port before updatePlayers full parity:** NO

---

#### `Autoupgrade`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,553,864 – 1,556,073 · `classes-out/Autoupgrade.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Takes an `upg` callback at call-site (not in constructor). No global reads in constructor. |
| **Expected side effects / state writes** | None — pure strategy object. Callers supply `upg` which writes to the game. |
| **Risk** | LOW |

**Port checklist:**
- Copy verbatim.
- Add `this.autoupgrade = new Autoupgrade();` in `PlayerRuntime`.
- Wire to a `sendUpgrade` bridge function when the upgrade packet path is identified.

---

#### `Autobuy`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,548,407 – 1,553,846 · `classes-out/Autobuy.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Constructor takes `buyHat, buyAcc` order arrays. Reads `store.hats`, `store.accessories` — bridge via `playerRuntime.store`. Reads `player.skins`, `player.tails` — bridge via current player ref. |
| **Expected side effects / state writes** | Calls `buyHat`/`buyAcc` send functions — these must be provided as injected callbacks, not globals. |
| **Risk** | LOW-MED (depends on store catalog being hydrated and send functions being available) |

**Port checklist:**
- Copy verbatim.
- Replace the two `store.` references inside the class body with a `_store` parameter or closure — OR keep as-is and ensure `store` is a module-scope reference pointing to `playerRuntime.store`.
- The class references `player` at call-site (in `isOwned`). Bridge: pass `playerRuntime.ensurePlayer()` where needed.
- Supply buy callbacks as constructor args or via a setter before first use.

---

**Phase 3 verification checkpoint:**
- `playerRuntime.autobuy.canTryBuy()` returns `true` on fresh instance.
- `playerRuntime.autoupgrade.sb` is a function.
- No reference to undefined `store` at runtime.

---

### Phase 4 — Combat Automation (AutoBreaker, Traps, Traps_)
**Rationale:** These three classes all share a dependency pattern: they need `UTILS`, the ported `Objectmanager`, `Items`, and the current `player` state. They are grouped together because their output (sending placement/attack packets) must be gated behind the BLOCK guard until the full update loop is confirmed correct.

**Must port before updatePlayers full parity:** NO (they are output classes, not input parsers)  
**Blocker:** Phase 1 (UTILS) must be complete.

---

#### `AutoBreaker`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,557,094 – 1,569,868 · `classes-out/AutoBreaker.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Reads `UTILS` (global, Phase 1), `nearObjs` (global array — bridge as `playerRuntime.root.nearObjs ?? []`), `player` (current player — bridge as `playerRuntime.ensurePlayer()`), `items` (bridge as `playerRuntime.items`), `enemy` (global array), `near` (nearest enemy object). All globals should be bridged as module-scope let variables refreshed each tick. |
| **Expected side effects / state writes** | Sets `this.active`, `this.aim`, `this.target` on its own instance. Callers read these to send aim/attack packets. |
| **Risk** | MED (many global bridging points; nearObjs / enemy / near populated by update loop that is currently gated) |

**Port checklist:**
- Copy verbatim from `classes-out/AutoBreaker.js`.
- Add module-scope shims: `let nearObjs = []; let near = null; let enemy = [];` — refresh these from `root.nearObjs`, `root.near`, `root.enemy` inside `_ha` handler after the near-cache reset block.
- Add `this.autoBreaker = new AutoBreaker();` in `PlayerRuntime`.
- The class's `useHammer` method references `items.weapons` and `player.weapons[1]` — both are available via the bridged references.

---

#### `Traps`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,380,036 – 1,423,844 · `classes-out/Traps.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Constructor signature: `new Traps(UTILS, items)`. Reads `player` (global bridge), `objectManager.checkItemLocation` (bridge as `playerRuntime.objectManager.checkItemLocation`), `near` (global), `config` (root.config + _config bridge), `configs` (_configs). Also reads `_things` for `configs.spikeTick`, `configs.spikeCones`. The `Traps` variant has safer guard code (`canUse` with explicit river/preplace checks) than `Traps_`. |
| **Expected side effects / state writes** | Mutates `this.preplaces`, `this.replaceSids`, `this.aim`, `this.inTrap`. Callers read these to decide placement packets. |
| **Risk** | HIGH (largest extracted class after Instakill; references `configs.spikeTick` which may not be in `_configs` yet; `objectManager.checkItemLocation` signature must match exactly) |

**Port checklist:**
- Copy verbatim.
- Pass `UTILS` and `items` at construction: `this.traps = new Traps(UTILS, playerRuntime.items);`.
- Add `spikeTick` and `secondaryOnCounter` to `_configs` with safe defaults (`false`).
- The `objectManager.checkItemLocation` inside `Traps` uses the bridge `objectManager` global — wire: `const objectManager = playerRuntime.objectManager;` at module scope.
- Note the method adds `getScale` to the synthetic `preObj` in `Traps` but not in `Traps_` — this is an intentional divergence; do not merge them.

---

#### `Traps_`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,433,643 – 1,471,174 · `classes-out/Traps_.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Same as `Traps`. Constructor: `new Traps_(UTILS, items)`. `Traps_` calls `objectManager.checkItemLocation(preObj.x, preObj.y, preObj.scale, 0.6, preObj.id, false)` without the `player` argument that `Traps` adds — preserve this difference. |
| **Expected side effects / state writes** | Same as `Traps`. |
| **Risk** | HIGH (same class family; subtle divergence from Traps must be preserved) |

**Port checklist:**
- Copy verbatim — do NOT merge with `Traps`.
- Add `this.traps_ = new Traps_(UTILS, playerRuntime.items);`.
- Both `Traps` and `Traps_` may coexist. The calling code (not yet ported) selects one based on mode/config.

---

**Phase 4 verification checkpoint:**
- `new AutoBreaker()` creates object; `autoBreaker.active === false`.
- `autoBreaker.getPriorityTarget()` returns `null` when `this.priority` is all empty.
- `new Traps(UTILS, items)` does not throw.
- `new Traps_(UTILS, items)` does not throw.
- `traps.createObj({id:0, scale:20}, 0)` returns an object with finite `x, y`.

---

### Phase 5 — Instakill
**Rationale:** Most complex unported class. It is separated into its own phase because it references the widest set of external state and side-effect functions (`buyEquip`, `selectWeapon`, `sendAutoGather`, `game.tickBase`). It must not be activated until those send-path bridges are confirmed.

**Must port before updatePlayers full parity:** NO  
**Blockers:** Phase 1 (UTILS), Phase 2 (Damages), Items already ported.

---

#### `Instakill`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,471,245 – 1,548,388 · `classes-out/Instakill.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Reads `my`, `near`, `player`, `_things`, `items` (all bridgeable). Calls: `buyEquip(id, slot)`, `selectWeapon(id)`, `sendAutoGather()`, `game.tickBase(fn, n)`, `getEl("turretCombat")`. The internal `getBaseDamages()` reads `_things.items.weapons` and `_things.player.primaryIndex` — bridge via `root._things`. All send functions must be provided as injected stubs or module-scope aliases pointing to `root.buyEquip` etc. |
| **Expected side effects / state writes** | Writes `this.isTrue`, `this.wait`, `this.can`, `this.ticking`, etc. Sends game actions on the wire. |
| **Risk** | HIGH (sends packets; reads turret DOM checkbox; calls tickBase which relies on the game tick loop; must be gated behind the combat enable flag) |

**Port checklist:**
- Copy verbatim.
- Add module-scope bridges: `const buyEquip = (...a) => root.buyEquip && root.buyEquip(...a); const selectWeapon = (id) => root.selectWeapon && root.selectWeapon(id); const sendAutoGather = () => root.sendAutoGather && root.sendAutoGather();`
- `game.tickBase` bridge: `const tickBase = (fn, n) => root.game && typeof root.game.tickBase === "function" ? root.game.tickBase(fn, n) : setTimeout(fn, n * 111);`
- Add `this.instakill = new Instakill();` in `PlayerRuntime` constructor but **do not call any instakill methods** until combat gate is separately cleared.
- `getEl("turretCombat")` must match an existing DOM id — verify or add fallback: `const _getElSafe = (id) => document.getElementById(id) || { checked: false };`

---

**Phase 5 verification checkpoint:**
- `new Instakill()` does not throw.
- `instakill.can === false`, `instakill.isTrue === false`.
- No send functions called during construction.

---

### Phase 6 — Resource Cache Hierarchy
**Rationale:** Resource caches track map resources between server updates. They are standalone after the bridge for `findObjectBySid` is wired. They enable the autofarming loop.

**Must port before updatePlayers full parity:** NO  
**Blockers:** None beyond Phase 1 (UTILS available).

---

#### `CachedMapResource` + subclasses
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,600,337 – 1,604,436 · `classes-out/CachedMapResource.js` + sibling files |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | `getGameObject()` calls `findObjectBySid(this.sid)` — bridge: `const findObjectBySid = (sid) => playerRuntime._findObjectBySid(sid);` at module scope. `distTo` / `dirTo` reference `player` defaulting — bridge as module-scope: `let player = null;` refreshed from `playerRuntime.ensurePlayer()` each tick. |
| **Expected side effects / state writes** | Each instance writes its own `lastSeen` timestamp. The caller maintains a cache map (`Map<sid, CachedXxxResource>`). |
| **Risk** | MED (findObjectBySid bridge must be live before `refreshFromGameObject()` is ever called) |

**Port checklist:**
- Copy `CachedMapResource` first, then all five subclasses.
- Add `this.resourceCache = { trees: new Map(), bushes: new Map(), stones: new Map(), catuses: new Map(), goldmins: new Map() };` in `PlayerRuntime`.
- Provide a `upsertResource(raw, TypeClass)` helper on `PlayerRuntime` that finds or creates the cache entry.
- The `player` default arg in `distTo`/`dirTo` — ensure the module-scope `player` reference is up-to-date on every updatePlayers tick.

---

**Phase 6 verification checkpoint:**
- `new CachedMapResource({sid:1, type:0, scale:50, x:100, y:100}, "trees")` creates object.
- `new CachedTreeResource({sid:2, type:0, scale:50, x:0, y:0}).getFarmKind() === "wood"`.
- `cachedObj.distTo({x2:100, y2:100}) === 0` (at same coords).

---

### Phase 7 — Pathfinding (EasyStarJS cluster)
**Rationale:** The pathfinding cluster is self-contained. MinHeap, Node/EasyNode, SearchState, EasyStarJS, and Node_2/AStarNode have no external dependencies. They unblock the Bot system in Phase 8.

**Must port before updatePlayers full parity:** NO  
**Blockers:** None.

---

#### `MinHeap`, `Node` (→ `EasyNode`), `SearchState`, `EasyStarJS`
| Field | Detail |
|---|---|
| **Source locations** | `classes-out/MinHeap.js` (~498,407), `classes-out/Node.js` (~499,386), `classes-out/SearchState.js` (~499,723), `classes-out/EasyStarJS.js` (~500,261) |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | None. All four classes are self-contained. **Name collision:** `Node` conflicts with `Node_2`. Rename the EasyStarJS `Node` to `EasyNode` and update all references inside `SearchState` and `EasyStarJS`. |
| **Expected side effects / state writes** | `EasyStarJS` manages internal state (`_grid`, `_queue`, `_active`). No writes to global scope. |
| **Risk** | LOW (pure algorithm, no DOM/global reads) |

**Port checklist:**
- Copy `MinHeap` verbatim.
- Copy `Node` with rename to `EasyNode`; update `new Node(` → `new EasyNode(` inside `SearchState` and `EasyStarJS`.
- Copy `SearchState` verbatim.
- Copy `EasyStarJS` verbatim; replace all `new Node(` with `new EasyNode(`.
- Add `this.easystar = new EasyStarJS();` in `PlayerRuntime` (lazy; only configure when Bot system is active).

---

#### `Node_2` (→ `AStarNode`)
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 1,643,292 – 1,643,719 · `classes-out/Node_2.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | None. Rename to `AStarNode` to avoid collision with `EasyNode`. |
| **Expected side effects / state writes** | None — pure data class. |
| **Risk** | LOW |

**Port checklist:**
- Copy with rename to `AStarNode`.
- Update any references inside `Bot` or pathfinding helpers from `Node_2` to `AStarNode`.

---

**Phase 7 verification checkpoint:**
- `new MinHeap((a, b) => a - b)` works; push/pop maintains heap order.
- `new EasyNode(null, 0, 0, 0, 0).bestGuessDistance() === 0`.
- `new EasyStarJS()` initializes without error.
- Calling `easystar.setGrid([[0,0],[0,0]])` then `easystar.setAcceptableTiles([0])` does not throw.

---

### Phase 8 — Bot System
**Rationale:** Bots require the full stack: Store (Phase 2), UTILS (Phase 1), Items (already ported), EasyStarJS (Phase 7), BotObject, BotObjManager, Bot. This phase is last among the core classes because it has the deepest dependency tree.

**Must port before updatePlayers full parity:** NO  
**Blockers:** Phase 1, Phase 2 (Store), Phase 7 (EasyStarJS).

---

#### `BotObject`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 2,323,397 – 2,324,239 · `classes-out/BotObject.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | None — pure data class. |
| **Expected side effects / state writes** | None beyond own fields. |
| **Risk** | LOW |

---

#### `BotObjManager`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 2,324,258 – 2,328,858 · `classes-out/BotObjManager.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Constructor: `new BotObjManager(botObj, fOS)` where `botObj` is the bot gameObjects array and `fOS` is a find-by-sid function. Reads `UTILS.getDistance`, `config`, `gameObjects` (pass as closure args). |
| **Expected side effects / state writes** | Manages `botObj[]` pool. Calls `disableObj` (writes `active = false`). |
| **Risk** | MED (gameObjects passed by reference — ensure it is the same array as PlayerRuntime's gameObjects) |

**Port checklist:**
- Copy verbatim.
- Pass `playerRuntime.gameObjects` as `gameObjects` reference inside `checkItemLocation` — note the method already receives it as a parameter in `customCheckItemLocation`. The two other `checkItemLocation` overloads close over an outer `gameObjects` — pass via constructor.

---

#### `Bot`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 2,317,092 – 2,323,376 · `classes-out/Bot.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Constructor: `new Bot(id, sid, hats, accessories)` — pass `playerRuntime.store.hats` and `playerRuntime.store.accessories`. Reads `config.playerScale`, `config.playerSpeed` — bridge via `root.config || _config`. Calls `this.resetMoveDir()`, `this.resetResources(moofoll)` — these are methods defined later in the Bot class body; copy the full class. The spawn method sets many fields including `config.playerScale` and `config.playerSpeed`. |
| **Expected side effects / state writes** | Manages own position, health, inventory. `spawn()` writes many own fields. Bot is self-contained except for the config bridge. |
| **Risk** | HIGH (large class; references many config fields; resetResources uses `moofoll` which is a game-specific structure; the full class body in classes-out/Bot.js must be read completely before port) |

**Port checklist:**
- Read the full `classes-out/Bot.js` content (only 80 lines visible in review — it extends further).
- Ensure `resetMoveDir` and `resetResources` methods are present in the extracted file.
- `moofoll` in `spawn(moofoll)` is a resource/material config object — pass `root.moofoll || {}` as a safe fallback.
- Add `this.bots = [];` and `this.botObjects = [];` in `PlayerRuntime`.
- `new BotObjManager(playerRuntime.botObjects, (sid) => playerRuntime.botObjects.find(b => b.sid === sid) || null)`.

---

**Phase 8 verification checkpoint:**
- `new BotObject(1)` creates object with `sid === 1`.
- `new BotObjManager([], () => null)` does not throw.
- `new Bot(0, 1, store.hats, store.accessories)` initializes with `this.tails` containing free items.

---

### Phase 9 — Optional / Cosmetic
**Rationale:** These classes have no dependency on the player update loop. They can be ported at any time or omitted without affecting parity.

**Must port before updatePlayers full parity:** NO

---

#### `LyricsPlayer`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 618,668 – 623,096 · `classes-out/LyricsPlayer.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Uses private class fields (`#songs`, `#urlFn`, `#timers`). Requires ES2022 support — verify the target browser/runtime. No global reads beyond `audio` DOM element. |
| **Expected side effects / state writes** | Attaches event listeners to the provided `<audio>` element. Schedules timers. |
| **Risk** | LOW (cosmetic; private fields require modern JS) |

---

#### `deadfuturechickenmodrevival`
| Field | Detail |
|---|---|
| **Source location** | `moomoo.js` ~byte 609,305 – 611,712 · `classes-out/deadfuturechickenmodrevival.js` |
| **Current usage in single file** | Not referenced. |
| **Required adapter/bridge** | Calls `unsafeWindow.open(...)` — available via `root` in the single file. |
| **Expected side effects / state writes** | Opens browser windows on `commands("rv3link")` / `commands("woah")`. Sets an interval in `startDayteSpawn`. |
| **Risk** | LOW (novelty class; no game-state writes) |

---

---

## Pre-UpdatePlayers Gate Checklist

The following must be true before `BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE` is set to `false`:

| # | Requirement | Blocks |
|---|---|---|
| 1 | `Utils` is declared and `UTILS` singleton is live | Textmanager, DeadPlayer, AutoBreaker, Traps, Bot |
| 2 | `Animtext` + `Textmanager` are declared and `playerRuntime.textManager` is live | `_h8` full parity |
| 3 | `_h8` calls `textManager.showText(...)` instead of only queueing | showText parity |
| 4 | `MapPing` is declared and `_h9` pushes `MapPing` instances | pingMap parity |
| 5 | `DeadPlayer` is declared and `_hP` pushes a `DeadPlayer` into `deadPlayers[]` | death visual parity |
| 6 | `addCh` is declared (even if `_h6` still uses raw objects) | chat structure parity |
| 7 | Module-scope bridges for `objectManager`, `player`, `near`, `enemy`, `nearObjs`, `config`, `configs`, `_things` are all live and refreshed each tick | all combat classes |
| 8 | `Store` is declared and `playerRuntime.store` is populated | Autobuy, Bot |
| 9 | `Damages` is declared and `playerRuntime.damages` is initialized after `_hA` hydrates `items` | Instakill |
| 10 | All Phase 1–2 verification checkpoints pass | — |

---

## Post-Gate Enablement Checklist

After the gate is removed and packet flow is live, enable classes in this order:

1. **Verify packet round-trip** — connect to game, confirm all `_h*` handlers fire without error.
2. **Enable AutoBreaker** — set `this.autoBreaker` as active; confirm `nearObjs` is being populated by the game loop before calling `calculateAim()`.
3. **Enable Traps / Traps_** — confirm `objectManager.checkItemLocation` returns correct values against real game object arrays.
4. **Enable Autobuy** — confirm `store.hats` and `store.accessories` are hydrated from `_hA` / game init.
5. **Enable Instakill** — verify `buyEquip`, `selectWeapon`, `sendAutoGather` bridges forward correctly; test with a throwaway session before production use.
6. **Enable Bot system** — spawn a `Bot`, call `bot.spawn(root.moofoll)`, confirm position updates via simulated `_ha` data.
7. **Enable pathfinding** — set a grid on `easystar`, request a path; confirm callback fires.
8. **Enable CachedMapResource** — populate from a `_hH` (loadGameObject) replay; confirm `distTo` and `getFarmKind` return expected values.

---

## Risks & Mitigations

| Risk | Level | Mitigation |
|---|---|---|
| `UTILS` global collides with a future game update renaming it | LOW | Keep `const UTILS = new Utils()` in module scope, not on `root` |
| `Traps` / `Traps_` behave differently from each other and break placement | HIGH | Port both; never merge; add a unit-test harness that exercises `radCalc` with synthetic objects before enabling on live traffic |
| `Instakill` sends spurious packets before all bridges are confirmed | HIGH | Add an `instakill.enabled = false` guard; only set true after manual testing |
| `Node` name collision between EasyStarJS and Node_2 clusters | MED | Rename as `EasyNode` / `AStarNode` during port; search-replace inside each class body |
| `Bot.resetResources` references `moofoll` structure that may differ from live server | HIGH | Add a defensive `moofoll = moofoll || {}` guard; log missing fields on first spawn |
| `MapPing` references `mapDisplay` which may be null at script load | MED | Gate `update()` call behind `if (mapDisplay && ctxt)` |
| `LyricsPlayer` uses private class fields (`#`) — some userscript managers transpile away support | LOW | Test in target environment before enabling; wrap in try-catch at instantiation |
| `CachedMapResource.getGameObject()` calls `findObjectBySid` which traverses all `gameObjects` on every call — O(n) | MED | Cache the result or call only on `refreshFromGameObject()` events, not in hot loops |
| `Damages` built at construction time from `items.weapons` — if weapons hydrate after construction, table is stale | MED | Rebuild `playerRuntime.damages = new Damages(playerRuntime.items)` inside `_hA` handler |
| Phase 8 Bot class body may exceed 80 lines reviewed — additional methods may have unreviewed dependencies | HIGH | Read full `classes-out/Bot.js` completely before beginning Phase 8 port |

---

## Suggested First Implementation Batch

Implement these together in a single PR/commit — they are non-breaking, zero side effects, and provide the foundation for all subsequent phases:

1. `CustomLogging` — copy verbatim, add `const _log = new CustomLogging("NozoSingle");`
2. `Utils` — copy verbatim, add `const UTILS = new Utils();`, patch `containsPoint` unsafeWindow ref
3. `Animtext` — copy verbatim, patch two `config.anotherVisual` reads to `root.config?.anotherVisual`
4. `Textmanager` — copy verbatim, add `this.textManager = new Textmanager();` to `PlayerRuntime`
5. Wire `_h8` to call `this.textManager.showText(...)` with sensible defaults for scale/speed/life/color
6. `addCh` — copy verbatim (3 lines, zero deps)
7. `DeadPlayer` — copy verbatim, wire into `_hP`

After this batch passes all Phase 1 + Phase 2 checkpoints for those classes, continue to `Store`, `MapPing`, `Damages`, then the Phase 3–4 classes.
