# Project Nozo Next — Migration Plan

Generated 2026-05-18. Read-only audit of `moomoo.js` (46,422 lines).

---

## 1. Vendor Audit

Three vendor blocks were identified. None are duplicated. Move all three directly to `dist/vendor/` without re-obfuscation.

| # | Line Range | Library | Wrapper Type | Destination File | Duplicate | Load Order | Confidence |
|---|-----------|---------|--------------|-----------------|-----------|------------|------------|
| 1 | 48–87 | gpu.js | Reference + conditional assignment (already loaded via `@require`) | `dist/vendor/gpu.min.js` | No | 1 | HIGH |
| 2 | 2850–3452 | easy.js (EasyStar) | UMD `(function(root, factory){...})(globalThis, function(){...})` with `module.exports`/`define.amd`/global checks | `dist/vendor/easystar.min.js` | No | 2 | HIGH |
| 3 | 3463 | msgpack | Single-line IIFE `!function(t){...}(function(){...})` — browserify bundle; assigned to `unsafeWindow.msgpack` and `document.msgpack` at lines 3465–3466 | `dist/vendor/msgpack.min.js` | No | 3 | HIGH |

**Notes:**
- gpu.js is already externally loaded via `@require` at line 21; lines 48–87 just assign `GPUClass` from `window.GPU`. No extraction needed, only keep the `@require`.
- EasyStar (603-line UMD) and msgpack (~62 KB single-liner) are the two true vendor extractions for Phase 1.
- Required `@require` order: gpu.js → easystar.min.js → msgpack.min.js → (project modules) → project-nozo-next.user.js.

---

## 2. Readable Module Map

48+ readable local systems identified in `moomoo.js`. `Utils` is already extracted to `project-nozo-externals/src/utils.js`.

| Line Range | Module Name | Dependencies | Globals Read | Globals Written | Difficulty |
|-----------|------------|-------------|-------------|----------------|------------|
| 830–868 | CustomLogging | console | `console`, `top` | `CustomLog` | Easy |
| 2572–2685 | element | document | `document` | — | Easy |
| 2872–2886 | MinHeap / A\* Node | Array methods | `a, cmp, parent, x, y, g, h` | heap/node state | Easy |
| 2889–2898 | SearchState | — | — | search state | Easy |
| 2901–3120 | EasyStarJS | Math, Array | `grid, tiles, portals, callback` | `_queue, _active` | Medium |
| 3739–3784 | deadfuturechickenmodrevival | — | `unsafeWindow` | — | Easy (stub) |
| 3785–3902 | HtmlAction | document | `element, innerHTML` | — | Easy |
| 3903–4100+ | LyricsPlayer | Audio API | `audio, songs, timers` | audio/lyrics state | Easy |
| 12927–13661 | Html | document, HtmlAction, getEl | `element, divElement, getEl, setting` | `element, divElement` | Medium |
| 14683–15134 | Utils | Math, document, gameObjects | `unsafeWindow, document, gameObjects` | — | Medium (**already extracted**) |
| 15135–15204 | Animtext | — | text state, update/render | animation state | Easy |
| 15205–15239 | Textmanager | — | text array, delta, display | text tracking state | Easy |
| 15240–15368 | GameObject | — | position, health, scale, team | game object state | Easy |
| 15369–16154 | Items | — | item groups, projectiles, weapons, store | `groups, projectiles, weapons, store` | Hard (1 000+ line config) |
| 16166–16289 | Objectmanager | Items, GameObject | `gameObjects, objectSids, objectIds` | object tracking maps | Medium |
| 16290–16352 | Projectile | GameObject, server | projectile state | projectile state | Easy |
| 16353–16828 | Store | Items config | `hats[], accessories[]` | store catalogs | Hard (1 500+ line catalog) |
| 16829–16890 | ProjectileManager | Projectile, gameObjects, Items, config | `projectiles[], gameObjects` | `projectiles` | Medium |
| 16920–17148 | AiManager | AI, Items, Players, config, UTILS | `aiTypes[], ais[], gameObjects` | `ais` | Hard |
| 17149–17259 | AI | Items, AiManager, config, UTILS | AI state, path, weapons | AI behaviors | Hard |
| 17260–17276 | Petal | — | petal position/rotation | — | Easy |
| 17277–17287 | addCh | — | chat message object | — | Easy |
| 17288–17324 | DeadPlayer | player data | `x, y, name, skin, effects` | — | Easy |
| 17325–18167 | Player | Items, config, UTILS, projectileManager, objectManager | extensive player state | extensive player state | Hard (2 800+ lines) |
| 19539–20392 | Traps | Items, UTILS, player, gameObjects | `player, items.weapons, gameObjects` | trap state, vectors | Hard |
| 20393–21010 | Traps\_ (variant) | same as Traps | same | same | Hard (likely duplicate) |
| 21011–22312 | Instakill | Items, player, config, gameObjects | `player, near, configs, items` | instakill state | Hard |
| 22313–22450 | Autobuy | Items, player, config, Store | `items, player.points, player.itemCounts` | purchase queue | Medium |
| 22451–22510 | Autoupgrade | Items, player, config | `player.points, player.age` | upgrade state | Medium |
| 22511–22529 | Damages | Items config | `items.weapons, items.projectiles` | — | Easy |
| 22530–23328 | AutoBreaker | Items, player, config, gameObjects | `player.weapons, player.points, gameObjects, near` | breaker state | Hard |
| 23329–23423 | CachedMapResource | gameObjects, map data | `gameObjects` | cache maps | Medium |
| 25341–26810 | Input/UI handlers | mouse/keyboard, player, packet | `clicks, macro, player, packet` | `clicks, macro` | Hard (1 400+ lines) |
| 26811–29766 | Pathfinder variants (JPS, GPT, naive) | EasyStar, gameObjects, player | `player, gameObjects` | pathfinder state | Hard |
| 28483–30311 | Server packet handlers | WS, player, gameObjects | `player, gameObjects, near, enemy` | `player, near, enemy` | Hard |
| 35514–35648 | Bot | Items, Player, config | `id, sid, hats, itemCounts` | bot entity state | Hard |
| 35649–35668 | BotObject | GameObject | object state | — | Easy |
| 35669–35750+ | BotObjManager | gameObjects, Items, Bot | `gameObjects, bots, items` | bot maps | Medium |
| 38518–38600+ | MapPing | config, canvas | `config.mapScale, mapDisplay, ctx` | ping animation | Easy |

**Migration priority order:**
1. Foundation — GameObject, Items, Store (phase 3)
2. Entities — Player, Bot, AI, Projectile (phase 3)
3. Managers — ObjectManager, AiManager, ProjectileManager (phase 3)
4. Tactics — Traps, Instakill, AutoBreaker (phases 6–7)
5. Automation — Autobuy, Autoupgrade, Damages (phase 3)
6. Pathfinding — EasyStar variants, Pathfinder JPS/GPT (phase 8)
7. I/O & Polish — server handlers, input multiplexing, HTML UI (phases 4–5, 9)

---

## 3. Global State Map

22 globals tracked. Sorted by migration phase and risk.

| Global | Write Locations | Top Read Sites | `NozoNext.state` Owner | Temporary Alias | Cleanup Phase | Mutability | Risk |
|--------|----------------|---------------|----------------------|----------------|--------------|-----------|------|
| `_things` | 23479 (object literal) | 2327, 2332, 2404, 13552 | `NozoNext.state` (root) | none needed | Phase 1 | Mutable namespace | **CRITICAL** |
| `game` | 13790 (let {}), 13837 (tick++) | 13811, 13820, 23728, 29714 | `NozoNext.state.game` | `const game = NozoNext.state.game` | Phase 1 | Mutable (tick counter) | **HIGH** |
| `WS` | 3471 (new WebSocket), 13781 (let null) | 3472, 3473, 14372, 706 | `NozoNext.state.WS` | `let WS = NozoNext.state.WS` | Phase 1 | Mutable (connection ref) | **CRITICAL** |
| `gameObjects` | 14506 (let []), 16244 (push) | 3070, 14667, 15081, 16241 | `NozoNext.state.gameObjects` | `const gameObjects = NozoNext.state.gameObjects` | Phase 2 | Mutable (array) | **HIGH** |
| `liztobj` | 14507 (let []), 14508 (→ game.closeObjects) | 17664, 23281, 23747, 24328 | `NozoNext.state.liztobj` | `const liztobj = NozoNext.state.liztobj` | Phase 2 | Mutable (array) | **HIGH** |
| `closeObjects` | Alias of liztobj (14508) | 17788, 20271 | Alias for `NozoNext.state.liztobj` | `const closeObjects = NozoNext.state.liztobj` | Phase 2 | Mutable | **MEDIUM** |
| `configs` | 3679 (setConfigs()), 3689 | 11455, 11466, 31841 | `NozoNext.state.configs` | `const configs = NozoNext.state.configs` | Phase 2 | Mutable (user config) | **MEDIUM** |
| `items` | 22751 (new Items()) | 2332, 16196, 23729 | `NozoNext.state.items` | `const items = NozoNext.state.items` | Phase 2 | Semi-constant | **LOW** |
| `UTILS` | 22750 (new Utils()) | 14674, 16167, 22752, 23729 | `NozoNext.state.UTILS` | `const UTILS = NozoNext.state.UTILS` | Phase 2 | Semi-constant | **LOW** |
| `player` | 14514 (let), 28509 (new Player) | 2327, 2328, 23840, 29054 | `NozoNext.state.player` | `const player = NozoNext.state.player` | Phase 3 | Mutable (changes on death) | **HIGH** |
| `packet` | 14318 (function decl.) | 2404, 14129, 17721, 18415 | `NozoNext.state.packet` | `const packet = NozoNext.state.packet` | Phase 3 | Semi-constant (function) | **MEDIUM** |
| `origPacket` | 14375 (function decl.) | 14377, 27041, 29189, 29238 | `NozoNext.state.origPacket` | `const origPacket = NozoNext.state.origPacket` | Phase 3 | Semi-constant (function) | **MEDIUM** |
| `objectManager` | 22752 (new Objectmanager()) | 16830, 18754, 19377 | `NozoNext.state.objectManager` | `const objectManager = NozoNext.state.objectManager` | Phase 3 | Semi-constant | **MEDIUM** |
| `projectileManager` | 22756 (new ProjectileManager()) | 22756, 28509, 35171 | `NozoNext.state.projectileManager` | `const projectileManager = NozoNext.state.projectileManager` | Phase 3 | Semi-constant | **MEDIUM** |
| `aiManager` | 22757 (new AiManager()) | 34831, 34836, 34907 | `NozoNext.state.aiManager` | `const aiManager = NozoNext.state.aiManager` | Phase 3 | Semi-constant | **MEDIUM** |
| `near` | 14520, 30339, 30656, 38811, 39017 | 11403, 11560, 19142, 25556 | `NozoNext.state.near` | `let near = NozoNext.state.near` | Phase 4 | Mutable (every frame) | **CRITICAL** |
| `enemy` | 14518, 30337, 35523 | 2327, 23846, 27730, 40469 | `NozoNext.state.enemy` | `let enemy = NozoNext.state.enemy` | Phase 4 | Mutable (array, every frame) | **CRITICAL** |
| `traps` | 22760 (new Traps()) | 17883, 18017, 19142, 25556 | `NozoNext.state.traps` | `const traps = NozoNext.state.traps` | Phase 5 | Semi-constant (instance) | **MEDIUM** |
| `autoBreak` | 22761 (new AutoBreaker()) | 16188, 16207, 25558, 25630 | `NozoNext.state.autoBreak` | `const autoBreak = NozoNext.state.autoBreak` | Phase 5 | Semi-constant (instance) | **MEDIUM** |
| `instaC` | 22762 (new Instakill()) | 11403, 11560, 17997, 25630 | `NozoNext.state.instaC` | `const instaC = NozoNext.state.instaC` | Phase 5 | Semi-constant (instance) | **MEDIUM** |
| `clicks` | 25365 (let {}), 25394, 25612, 25710 | 16207, 25612, 25710 | `NozoNext.state.clicks` | `const clicks = NozoNext.state.clicks` | Phase 6 | Mutable (properties) | **HIGH** |
| `macro` | 14639 (let {}), 28486 (reset) | 25771, 31583, 31588 | `NozoNext.state.macro` | `let macro = NozoNext.state.macro` | Phase 6 | Mutable (properties) | **MEDIUM** |

**Key risks:**
- `liztobj` is aliased as `game.closeObjects` at line 14508 — both must be updated together.
- `player` changes reference on respawn (line 28509); never cache outside a state read.
- `near` and `enemy` are mutated in-place every frame; switch to state accessors carefully.
- `_things` is the de-facto root namespace; migrate it first to anchor all others.

---

## 4. Combat Pipeline Trace

### Symbol Reference Table

| Symbol | Definition | Call Sites | Current Function | Failure Point |
|--------|-----------|-----------|-----------------|--------------|
| `getAttackDir()` | 25596–25675 | 14326–14327, 17662, 17737, 19055, 19073, 19076, 19081, 19090, 19155–19185, 19232, 19239, … (100+) | Master aim resolver: checks aim lock → antiPushSpike → traps.aim → autoBreak.aim → weapon readiness → fallback to lastDir | Race between clicks.left/right toggle and reload state; no lock prevents concurrent writes |
| `sendAutoGather()` | 18536–18551 | 2351, 2361, 2376, 2387, 14042, 19156, 19163, 19182, 19185, 19232, 19239, … (80+) | Sends `packet("K", 1, 1)` to toggle swing; throttles by `secPacket >= 90` | `secPacket` throttle race — multiple callers can bypass throttle if it crosses 90 between checks |
| `packet("D", ...)` | 14318–14373 (wrapper) | 23739, 29422, 29707, 34459, 34488 + indirect via wrapper | Tracks sent aims in `dPacketTracker.dirs`; logs via console; stores `_things.lastAim` | 5 competing D sends (aimSpike, antiPush, baseAim, etc.) with no central dispatcher |
| `sendReloadCheckedHit()` | 18553–18652 | Specialized attack systems | Gated by `my.waitHit`; schedules start/stop via sendAutoGather; checks reload with `checkTicks` delay | `my.waitHit` set by multiple systems; `clearWait()` fires on `firstReload > 0` but retry logic causes double-toggles |
| `_things.atkKey` | Written via packet calls ~18599 | 24598, 24606–24610, 25380, 25384, 31633–31634, 31819, 31822, 32730–32731, 32787–32788, 32920–32921, 33015–33016 | Holds weapon attack key for raw `packet(_things.atkKey, ...)` sends | No mutual exclusion; autoBreak aim updates (32730) and manual atkKey packets (24598) can collide |
| `clicks.left` / `clicks.right` | Global flags | Writes: 25410, 25418, 27478–27480, 27486, 27594, 31806, 32415–32416, 32771, 33725, 33742–33765, 33981–33983 | Guard weapon readiness checks and aim calculation gates | UI thread writes, script thread reads — clicks.left can flip between reload check and packet send |
| `my.waitHit` | Global flag | Reads: 18559, 25567; Writes: 18591, 18599, 29722, 29725, 44792 | Blocks sendAutoGather during in-flight hit detection | Line 18599 sets `waitHit=1` without clearing prior state; line 29725 clears conditionally but no guarantee all paths clear it |
| `traps.aim` | Traps instance (22760) | Reads: 25626–25628, 25684–25685, 32487; Writes: 30512, 34792 | Calculated angle to nearest trap; override in getAttackDir at line 25626 | Updated in tick handler (30512) but getAttackDir reads without synchronization — stale reads possible |
| `autoBreak.aim` | AutoBreaker class (22530), set at 22664, 22710 | Reads: 25630–25633, 25697, 33834, 34792; Writes: 22664, 22710 | Set by `AutoBreaker.calculateAim()` when priority targets exist; read in getAttackDir (25630) | calculateAim() runs async relative to getAttackDir; aim can change mid-frame before reload check |
| `approachAttackObject` | **Not found in file** | N/A | Does not exist in current codebase | N/A |

### Target Architecture (Phase 6–7)

- **One aim resolver** — consolidate `getAttackDir`, `getHazardAimOverrideDir`, and `getSafeDir` into a single `calculateAim(context)` with priority tiers: lock → spike → trap → autoBreak → enemy → fallback. Gate with `AimLockManager.setAimLock(aim, tag, ticks)`.
- **One D sender** — `DirectionDispatcher`: deduplicates consecutive D packets, enforces reload gating, logs aim source + weapon + reload + blocked reason + sent tick.
- **One gather swing sender** — `SwingSender`: atomic `secPacket` read, exponential backoff retry, single entry point replacing all 80+ `sendAutoGather` call sites.
- **One reload-checked scheduler** — replace `my.waitHit` flag with `HitWaitState` class using Promise resolution; no overlapping wait regions.
- **Isolated F packets** — only `sendAtck` / `_things.atk` (lines 18678, 23741–23743) emit F packets; gate with `config.optInFAttack && clicks.left && !waitHit && reload <= 0`.

### Phased Rewrite Plan

**Phase 6 — Aim Consolidation & Lock Pattern**
1. Rename `getAttackDir` → `getAttackDirImpl`; create new `getAttackDir` wrapper that returns locked aim or delegates.
2. Merge all aim sources into `calculateAim(context)`.
3. Replace `attackAimLock` global with `AimLockManager` class (`setAimLock`, `getActiveAim`).
4. Update all 100+ call sites; log conflicts when multiple systems try to set locks simultaneously.
5. Debug state output: aim source, weapon, reload, blocked reason, sent D tick, gather tick.

**Phase 7 — Packet & Toggle Dispatch**
1. Create `DirectionDispatcher` with throttled D send and reload gate.
2. Create `SwingSender` with atomic secPacket read and exponential backoff.
3. Replace `my.waitHit` with `HitWaitState` Promise-based state machine.
4. Create `AttackPacketGate` for opt-in F packets.
5. Audit all 80+ `sendAutoGather` call sites; redirect to `SwingSender`; remove dead code.
6. End-to-end test: rapid weapon switch + click toggle; verify no packet burst or stale reload detection.

---

## 5. Build Pipeline Review

### Current Pipeline Summary

`project-nozo-externals/scripts/scripts.js` (86 lines) is a Node.js pipeline:

1. Reads all `.js` files from flat `src/` directory.
2. Obfuscates with **javascript-obfuscator** v5.4.2 (control-flow flattening, dead-code injection, base64 string array encoding).
3. Minifies with **terser** v5.47.1 (2-pass compression, mangled names, comments stripped).
4. Outputs `dist/<name>.min.js`.
5. Logs size reduction to console.

### Gap Table

| Feature | Supported | Suggested Change | Priority |
|---------|-----------|-----------------|----------|
| Subfolder support (`src/sub/*.js` → `dist/sub/*.min.js`) | ❌ No | Recursive `readdirSync` or glob; use `path.relative()` to mirror hierarchy | P1 |
| Manifest generation (`dist/manifest.json`) | ❌ No | Collect filename, output size, SHA-256 hash, timestamp after build loop; include `package.json` version | P1 |
| Skip vendor/pre-minified files | ❌ No | Detect `*.min.js` / `*.bundle.js` in `src/`; copy directly to `dist/` without obfuscation | P1 |
| Source maps | ❌ No | Pass `sourceMap: { content: 'inline' }` to terser; write `.map` files alongside outputs | P0 |
| Error reporting | ⚠️ Partial | Wrap obfuscator + terser in try-catch; include filename + line context; log to stderr | P0 |
| Generated `@require` list | ❌ No | After build, emit `dist/requires.txt` with CDN URL per output file | P2 |
| Commit hash CDN URLs | ❌ No | Call `git rev-parse --short HEAD`; embed hash in manifest for jsdelivr `@<hash>` pinning | P2 |
| Build only changed files | ❌ No | Compare mtime of source vs. output; cache in `dist/.buildcache.json`; skip if output is newer | P2 |

### Recommended Changes (numbered)

1. **Subfolder recursion** — wrap file-discovery in a recursive function; use `path.relative(srcDir, file)` to construct output path.
2. **Manifest generation** — collect `{ filename, outputSize, sha256, timestamp }` per file after build loop; write `dist/manifest.json` with package version.
3. **Source maps** — pass `sourceMap: true` to terser; write `.min.js.map` alongside each output.
4. **Skip-if-unchanged** — stat source and output mtimes; store cache in `dist/.buildcache.json`; skip if output exists and is newer.
5. **Vendor copy** — if source filename matches `*.min.js` or `*.bundle.js`, copy directly to dest path without obfuscation/minification.
6. **Git hash integration** — call `child_process.execSync('git rev-parse --short HEAD')` and embed result in manifest + optional build-time constant.
7. **Enhanced error handling** — wrap each file's obfuscation+minification in try-catch; log `[ERROR] <filename>: <message>` to stderr; continue remaining files.
8. **`@require` snippet** — after manifest write, emit `dist/requires.txt` with one jsdelivr CDN URL per entry.

---

## 6. Test Plan

### Pre-flight Checklist

- [ ] Tampermonkey 5.1+ installed (`about:addons` shows version ≥ 5.1.0)
- [ ] `project-nozo-next.user.js` has `@namespace`, `@name`, `@match`, `@grant unsafeWindow` headers
- [ ] No duplicate `@require` entries in script header
- [ ] All CDN `@require` URLs follow pattern `https://cdn.jsdelivr.net/gh/gaston1799/project-nozo-externals@main/dist/<name>.min.js`
- [ ] Network tab shows all CDN URLs returning 200 OK
- [ ] **Baseline**: disable `project-nozo-next.user.js` → moomoo.js loads with zero console errors

---

### Phase 0: Inventory

- [ ] Enable `project-nozo-next.user.js`; console shows no new errors
- [ ] `unsafeWindow.NozoNext` exists and contains only minimal bootstrap keys
- [ ] Game behaves identically to baseline for 30 seconds (attack, move, gather)

### Phase 1: Vendor Extraction

- [ ] Network tab shows `easystar.min.js` and `msgpack.min.js` CDN requests returning 200
- [ ] Second page load serves vendor files from browser cache (`disk cache` in Network Size column)
- [ ] `typeof window.EasyStar` and `typeof window.msgpack` return `"object"` or `"function"` (not `"undefined"`)
- [ ] `document.querySelectorAll('script')` count matches expected — no duplicate vendor scripts
- [ ] Zero `ReferenceError` or `TypeError` for vendor globals in console
- [ ] Disable new script → moomoo.js still runs (vendor no longer bundled in moomoo.js after extraction)

### Phase 2: Bootstrap

- [ ] `unsafeWindow.NozoNext` is an object; `state` and `debug` properties exist
- [ ] `typeof unsafeWindow.NozoNext.modules === "object"` and `typeof unsafeWindow.NozoNext.registerModule === "function"`
- [ ] `unsafeWindow.NozoNext.debug.log('test')` outputs to console with timestamp and module name
- [ ] `Object.keys(unsafeWindow).filter(k => unsafeWindow[k] === unsafeWindow.NozoNext[k])` — no unexpected collisions
- [ ] Game still playable; zero new console errors

### Phase 3: Utils/Constants

- [ ] `unsafeWindow.NozoNext.Utils` exists; `unsafeWindow.UTILS` alias resolves to same object
- [ ] `UTILS.getDistance(0,0,3,4)` returns `5`; `UTILS.toRad(180)` ≈ `3.14159`; `UTILS.toAng(Math.PI)` ≈ `180`
- [ ] `unsafeWindow.NozoNext.items` and `unsafeWindow.items` reference same object with item definitions
- [ ] `UTILS.raycast(...)` returns null (clear LoS) or `{ object, x, y, t }` (hit)
- [ ] `utils.min.js` CDN URL returns 200 in Network tab
- [ ] Zero undefined-reference errors for Utils or items

### Phase 4: Packet/Socket

- [ ] `typeof unsafeWindow.NozoNext.packet === "function"` and `typeof unsafeWindow.packet === "function"`
- [ ] Attack or gather once → console shows `[NozoNext:packet] Type: D, Tick: X, Angle: Y, Caller: leftClick`
- [ ] Gather for 3 s then attack → packet sequence alternates gather (K) and attack (D) correctly
- [ ] Auto-gather packets appear at regular intervals with `Caller: autoGather`
- [ ] Rapid attacks stop when reload not complete; resume only after `pingTime` elapses
- [ ] `unsafeWindow.WS.readyState === 1` (OPEN)
- [ ] 5 rapid attacks produce ≥ 100 ms spacing between D packets
- [ ] Zero packet-related errors in console

### Phase 5: Input

- [ ] `unsafeWindow.NozoNext.clicks` and `unsafeWindow.clicks` reference same object with `left` / `right` properties
- [ ] Left click → one D packet with angle to target
- [ ] Right click → no error; character moves toward click
- [ ] `typeof unsafeWindow.NozoNext.macro` resolves; `unsafeWindow.macro` exists
- [ ] W/A/S/D keys move character responsively; no console lag errors
- [ ] Manual swing → packet includes correct angle; no duplicate sends
- [ ] `unsafeWindow.clicks.left` reflects recent click state accurately
- [ ] Zero input/click/macro errors in console

### Phase 6: Attack/Aim

- [ ] `unsafeWindow.NozoNext.getAttackDir({ x:100, y:100 })` returns a number (radians)
- [ ] `typeof unsafeWindow.NozoNext.resolveAim === "function"`
- [ ] Attack enemy → debug shows `[NozoNext:aim] Aim source, Target, Angle, Weapon, Reload, Sent tick`
- [ ] Switch weapons → debug line shows updated weapon name per attack
- [ ] Rapid double attack → second blocked when reload not complete; attack succeeds after reload
- [ ] Gather swing → packet has angle to item; tagged `Caller: autoGather`
- [ ] `unsafeWindow.NozoNext.traps.aim` accessible; debug shows trap aim direction
- [ ] `unsafeWindow.NozoNext.autoBreak.aim` accessible
- [ ] Combat primarily uses D packet pipeline; F packets limited to explicit gather swings
- [ ] Zero aim/reload/attack-packet errors in console

### Phase 7: AutoBreak/Traps

- [ ] `unsafeWindow.NozoNext.traps` and `unsafeWindow.traps` reference same object
- [ ] `traps.currentTarget` and `traps.aimAngle` update when enemies approach
- [ ] Enemy proximity → debug shows `[NozoNext:traps] Target, Angle, Status: armed/triggered`
- [ ] Trap trigger → packet sent through combat pipeline (not direct)
- [ ] `unsafeWindow.NozoNext.autoBreak` and `unsafeWindow.autoBreak` reference same object
- [ ] Enable AutoBreak → `autoBreak.currentTarget` shows nearest breakable object ID
- [ ] AutoBreak attack debug: `[NozoNext:autoBreak] Target, Angle, Reload, Sent tick`
- [ ] Disable attack with AutoBreak enabled → aim angles compute but no packets sent (aim ≠ swing)
- [ ] Both systems active simultaneously → max one swing packet per tick; source tags correct
- [ ] Zero trap/autoBreak errors in console

### Phase 8: Movement/Pathfinding

- [ ] `unsafeWindow.NozoNext.movement` exists; `typeof movement.move === "function"`
- [ ] `movement.currentDirection`, `movement.targetX`, `movement.targetY` reflect recent move
- [ ] Right-click on ground → debug shows `[NozoNext:movement] Target: (X,Y), Direction: A, Distance: D`
- [ ] Click blocked-by-object location → character navigates around OR debug shows `blocked path`
- [ ] Attack + simultaneous movement → both systems send packets without interference
- [ ] Movement over 5 s produces ~10 packets/sec (matches game tick rate)
- [ ] Zero movement-related errors in console

### Phase 9: Render/UI

- [ ] `unsafeWindow.NozoNext.render` exists; `typeof render.draw === "function"`
- [ ] `unsafeWindow.NozoNext.Html` exists; `typeof Html.showMenu === "function"`
- [ ] Change a setting → `localStorage.getItem('nozonezt:<key>')` returns new value after page reload
- [ ] `typeof GM_getValue === "function"` and `typeof GM_setValue === "function"`
- [ ] Debug overlay draws without visible lag; shows aim direction, target, or status info
- [ ] FPS remains within 5% of Phase 0 baseline over 30 s (Performance tab)
- [ ] Settings menu opens; toggling features applies immediately in-game
- [ ] Zero render or UI errors in console

### Phase 10: Remove Shims

- [ ] Audit remaining compatibility aliases; record which still exist via console checks for `UTILS`, `packet`, `clicks`, `traps`, `autoBreak`
- [ ] All core systems use `NozoNext.*` — no bare `packet()` or `clicks` calls outside shim layer
- [ ] Disable `project-nozo-next.user.js` → moomoo.js still runs (backwards compatibility preserved)
- [ ] Remove shims; play for 60 s → zero `ReferenceError` or `undefined` errors
- [ ] FPS within 2% of Phase 0 baseline (no performance regression)
- [ ] `Object.keys(unsafeWindow.NozoNext).filter(k => typeof NozoNext[k] === 'object')` lists: utils, packet, input, attack, traps, autoBreak, movement, render
- [ ] Play for 5 minutes → zero errors or warnings related to NozoNext or migration

---

## 7. First Commit Sequence

| Step | Action | Agent Source |
|------|--------|-------------|
| 1 | Copy EasyStar UMD block (lines 2850–3452) → `dist/vendor/easystar.min.js` | Vendor Auditor |
| 2 | Copy msgpack IIFE (line 3463) → `dist/vendor/msgpack.min.js` | Vendor Auditor |
| 3 | Add `@require` entries for both to `project-nozo-next.user.js` header (gpu.js already present at line 21) | Vendor Auditor |
| 4 | Add subfolder recursion + vendor-skip to `scripts/scripts.js` (P1 gap) | Build Pipeline Reviewer |
| 5 | Add manifest generation + source map support to `scripts/scripts.js` (P0 gap) | Build Pipeline Reviewer |
| 6 | Run `npm run build` in `project-nozo-externals/`; verify `dist/utils.min.js` rebuilds cleanly | Build Pipeline Reviewer |
| 7 | Create `NozoNext` bootstrap with `state`, `modules`, `debug`; add `_things`, `game`, `WS` as Phase 1 globals | Global State Mapper |
| 8 | Add Phase 2 globals: `gameObjects`, `liztobj`, `closeObjects`, `configs`, `items`, `UTILS` with aliases | Global State Mapper |
| 9 | Extract `packet()` + `origPacket()` as Phase 3 globals; wire `AimLockManager` stub | Global State Mapper + Combat Pipeline |
| 10 | Begin Phase 6 aim consolidation: rename `getAttackDirImpl`, create `calculateAim(context)`, add `DirectionDispatcher` stub | Combat Pipeline Planner |

---

## 8. Known Risks Summary

| Risk | Source | Mitigation |
|------|--------|-----------|
| `liztobj` aliased as `game.closeObjects` — must update both | Global State Mapper | Keep both writes in sync during Phase 2 migration |
| `player` reference changes on respawn (line 28509) | Global State Mapper | Never cache outside `NozoNext.state.player` read |
| `near`/`enemy` mutated in-place every frame | Global State Mapper | Migrate last (Phase 4); test thoroughly before removing alias |
| 100+ `getAttackDir` call sites | Combat Pipeline | Batch update via wrapper first; migrate call sites incrementally |
| 80+ `sendAutoGather` call sites | Combat Pipeline | Replace with `SwingSender` single entry point before removing originals |
| `my.waitHit` set without clearing prior state (line 18599) | Combat Pipeline | Replace with `HitWaitState` Promise in Phase 7 |
| `traps.aim` / `autoBreak.aim` read without synchronization | Combat Pipeline | Snapshot aim values at start of each `getAttackDir` call |
| Traps\_ (lines 20393–21010) appears to be a duplicate of Traps | Module Mapper | Audit before extraction; may be a variant — do not blindly merge |
| scripts.js obfuscates everything in `src/` flat only | Build Pipeline | Add subfolder + vendor-skip before Phase 2 modules land in `src/` |
