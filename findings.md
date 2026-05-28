# Project Nozo Next — Audit Findings

Generated 2026-05-18 from six read-only agents inspecting `moomoo.js` (46,422 lines).

---

## Vendor Blocks (3 found, 0 duplicates)

| # | Lines | Library | Wrapper | Destination | Load Order |
|---|-------|---------|---------|-------------|------------|
| 1 | 48–87 | gpu.js | Conditional assignment (already `@require`'d at line 21) | Keep existing `@require`; no extraction needed | 1 |
| 2 | 2850–3452 | EasyStar.js | UMD `(function(root, factory){...})` with `module.exports` / `define.amd` / global checks | `dist/vendor/easystar.min.js` | 2 |
| 3 | 3463 | msgpack | Single-line IIFE ~62 KB; browserify bundle; assigned to `unsafeWindow.msgpack` + `document.msgpack` at lines 3465–3466 | `dist/vendor/msgpack.min.js` | 3 |

No vendor library appears more than once. Both EasyStar and msgpack are safe to extract in Phase 1 without re-obfuscation.

---

## Readable Modules (48+ identified)

`Utils` is already extracted to `project-nozo-externals/src/utils.js`.

### Easy extractions (self-contained, minimal deps)
| Lines | Module |
|-------|--------|
| 830–868 | CustomLogging |
| 2572–2685 | element (DOM wrapper) |
| 2872–2886 | MinHeap / A\* Node / SearchState |
| 3739–3784 | deadfuturechickenmodrevival (stub) |
| 3785–3902 | HtmlAction |
| 15135–15204 | Animtext |
| 15205–15239 | Textmanager |
| 15240–15368 | GameObject |
| 16290–16352 | Projectile |
| 17260–17276 | Petal |
| 17277–17287 | addCh |
| 17288–17324 | DeadPlayer |
| 22511–22529 | Damages |
| 35649–35668 | BotObject |
| 38518–38600+ | MapPing |

### Medium extractions (need Items / Player / config injected)
| Lines | Module |
|-------|--------|
| 3903–4100+ | LyricsPlayer |
| 12927–13661 | Html |
| 16166–16289 | Objectmanager |
| 16829–16890 | ProjectileManager |
| 22313–22450 | Autobuy |
| 22451–22510 | Autoupgrade |
| 23329–23423 | CachedMapResource |
| 35669–35750+ | BotObjManager |

### Hard extractions (deep coupling, expect 20–30% refactor each)
| Lines | Module | Notes |
|-------|--------|-------|
| 15369–16154 | Items | 1,000+ line config |
| 16353–16828 | Store | 1,500+ line catalog |
| 16920–17148 | AiManager | Complex AI dispatch |
| 17149–17259 | AI | 100+ methods, state machines |
| 17325–18167 | Player | 2,800+ lines, core entity |
| 19539–20392 | Traps | 850 lines, tactical AI |
| 20393–21010 | Traps\_ | Possible duplicate of Traps — audit before merging |
| 21011–22312 | Instakill | 1,200 lines, combat AI |
| 22530–23328 | AutoBreaker | 798 lines, combat AI |
| 25341–26810 | Input/UI handlers | 1,400+ lines |
| 26811–29766 | Pathfinder variants (JPS, GPT, naive) | Three implementations; unify before extracting |
| 28483–30311 | Server packet handlers | Tight coupling to near/enemy/player |
| 35514–35648 | Bot | 135 lines, bot player entity |

---

## Global State (22 globals)

### CRITICAL — migrate first
| Global | Written At | Risk |
|--------|-----------|------|
| `_things` | 23479 | Root namespace; everything threads through it |
| `WS` | 3471, 13781 | WebSocket connection; packet() and origPacket() depend on it |
| `near` | 14520, 30339, 30656, 38811 | Mutated every frame; 4+ write sites |
| `enemy` | 14518, 30337, 35523 | Array mutated every frame |

### HIGH — migrate in phases 2–3
`gameObjects` (14506), `liztobj` (14507 + aliased as `game.closeObjects` at 14508), `game` (13790), `player` (14514 — reference changes on respawn at 28509), `clicks` (25365)

### MEDIUM — migrate in phases 3–6
`configs`, `packet`, `origPacket`, `objectManager`, `projectileManager`, `aiManager`, `traps`, `autoBreak`, `instaC`, `macro`, `closeObjects`

### LOW — migrate last
`items` (22751), `UTILS` (22750) — stateless utility instances

**Key hazard:** `liztobj` is aliased as `game.closeObjects` at line 14508 — both must be updated together or reads will diverge.

---

## Combat Pipeline Problems

### Current failure points
| Symbol | Problem |
|--------|---------|
| `getAttackDir` (25596–25675) | 100+ call sites; reads 5+ aim sources without mutual exclusion; no lock prevents concurrent writes |
| `sendAutoGather` (18536–18551) | 80+ call sites; `secPacket` throttle is a race — multiple callers can bypass if threshold crossed between checks |
| `packet("D", ...)` | 5 competing D-send sites (23739, 29422, 29707, 34459, 34488) with no central dispatcher |
| `my.waitHit` | Set at 18599 without clearing prior state; line 29725 clears conditionally — not all paths guaranteed to clear |
| `traps.aim` / `autoBreak.aim` | Updated in tick handler (30512 / 22664); read in `getAttackDir` without synchronization — stale reads possible |
| `clicks.left` / `clicks.right` | UI thread writes, script thread reads — flag can flip between reload check and packet send |
| `approachAttackObject` | **Does not exist** in the file |

### Target architecture (Phases 6–7)
- `calculateAim(context)` — single aim resolver with priority tiers: lock → spike → trap → autoBreak → enemy → fallback
- `AimLockManager` — replaces `attackAimLock` global; exposes `setAimLock(aim, tag, ticks)` / `getActiveAim()`
- `DirectionDispatcher` — deduplicated D sender with reload gate and debug logging
- `SwingSender` — single entry point for all 80+ `sendAutoGather` callers; atomic `secPacket` read
- `HitWaitState` — Promise-based replacement for `my.waitHit` flag
- `AttackPacketGate` — opt-in only F packets gated by `config.optInFAttack && clicks.left && !waitHit && reload <= 0`

---

## Build Pipeline Gaps

Current `scripts/scripts.js` (86 lines): flat `src/` only, javascript-obfuscator v5.4.2 + terser v5.47.1, no manifest, no source maps, no vendor-skip.

| Gap | Priority | Fix |
|-----|----------|-----|
| No source maps | P0 | Pass `sourceMap: true` to terser; emit `.min.js.map` |
| Weak error reporting | P0 | Wrap each file in try-catch; log filename + message to stderr |
| No subfolder support | P1 | Recursive `readdirSync`; mirror hierarchy via `path.relative()` |
| No vendor-skip | P1 | Detect `*.min.js` / `*.bundle.js` in `src/`; copy direct to `dist/` |
| No manifest | P1 | Write `dist/manifest.json` with filename, size, SHA-256, timestamp |
| No `@require` list | P2 | Emit `dist/requires.txt` with one CDN URL per output |
| No commit-hash pinning | P2 | `git rev-parse --short HEAD` → embed in manifest for jsdelivr `@<hash>` URLs |
| No incremental build | P2 | Compare mtime source vs. output; skip unchanged via `dist/.buildcache.json` |

---

## Notable Anomalies

| Finding | Location | Action |
|---------|----------|--------|
| `Traps_` class is a near-duplicate of `Traps` | 20393–21010 | Audit diff before merging; may be intentional variant |
| Three separate Pathfinder implementations (JPS, GPT, naive) | 26811–29766 | Unify API surface before extracting to `src/` |
| `approachAttackObject` referenced in task.md does not exist in file | N/A | Remove from Phase 6 target list or verify alternate name |
| gpu.js `@require` already present at line 21; lines 48–87 just assign `GPUClass` | 48–87 | No extraction needed; keep `@require` and the assignment block |
| `player` reference replaced entirely on respawn | 28509 | Code must read from `NozoNext.state.player` each tick, never cache |
