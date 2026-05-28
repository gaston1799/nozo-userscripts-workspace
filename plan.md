# AdvHeal Port Plan

## Target
Port the healer decision system from `moomoo.js updatePlayers` (L30653–31118) into `project-nozo-single.user.js`.

## What advHeal Does
Every server tick, `_hO` (health update handler) pushes damage events into `this.advHeal[]`. The advHeal drain loop then iterates these events and decides:
- **Instant heal** (`healer()`) — call now, no delay
- **Deferred heal** — call via `setTimeout` or `game.tickBase` after N ticks/ms
- **Skip** — don't heal (damage too small, ignore type)

Decisions are gated by: damage amount, enemy weapon type, shame count, danger level, trap state, healing beta mode.

---

## Dependencies — What Needs Porting

### Phase 1: Leaf Dependencies (8 functions)

| # | Function | moomoo.js L# | What It Does | Effort |
|---|---|---|---|---|
| 1.1 | `healthBased()` | 19030 | Returns how many food items to place based on missing HP | tiny |
| 1.2 | `soldierMult()` | 19026 | Returns soldier skin damage multiplier | tiny |
| 1.3 | `addDeadPlayer(tmpObj)` | 28103 | `deadPlayers.push(new DeadPlayer(...))` | tiny |
| 1.4 | `notif2(msg, target)` | 29876 | DOM toast notification with fade in/out | small |
| 1.5 | `addMenuChText(name, msg, color, ...)` | 13662 | Logs to in-game menu chat panel | small |
| 1.6 | `getAttacker(damaged)` | 19039 | Maps damage value → attacker weapon info | small |
| 1.7 | `getAttackDir(debug)` | 25596 | Attack direction considering aim lock, weapon, auto-break, anti-push (~40 lines) | medium |
| 1.8 | `healer(t)` | 19059 | Places food recursively. Uses `healthBased`, `place`, `getAttackDir`, `game.tickBase` | small |
| 1.9 | `HKH()` | 19230 | Hit-Kill-Hit combat combo execution | medium |

### Already in Nozo-Single (no port needed)

| Function | Nozo Location |
|---|---|
| `getEl(id)` | L103 |
| `place(id, rad, ...)` | L1483 → `this.root.place` → `ctx.place` |
| `game.tickBase(fn, ticks)` | L4418 |
| `findPlayerBySID(sid)` | `this._findPlayerBySid(sid)` |

### Phase 2: Helper Closures (the decision engine)

| # | Closure | moomoo.js Lines | What It Does |
|---|---|---|---|
| 2.1 | `_healIsBullOrDaggerPressure()` | 30679–30684 | True if enemy has dagger (idx 7) or player has dagger vs katana/tail-21 |
| 2.2 | `_healIsDangerNowTight(damaged, dmg, tmpObj, inTrap)` | 30685–30693 | True if inTrap OR big hit OR combo threat OR close-range reload threat |
| 2.3 | `_healShouldAllowFastHealNonInsta(tmpObj)` | 30694–30696 | `shameCount < 2` |
| 2.4 | `_healLogDecision(stage, reason, damaged, dmg, tmpObj, inTrap)` | 30697–30708 | Debug logging via `addMenuChText` with per-tick dedup |
| 2.5 | `_healSlowHeal(timerMs, delayTicks, ...)` | 30709–30719 | `game.tickBase(healer, delayTicks)` or `setTimeout(healer, timerMs)` |
| 2.6 | `_healSlowHealBullDaggerFallback(timerMs, ...)` | 30720–30726 | Wraps slowHeal with bull/dagger-specific delay logic |
| 2.7 | `_healWithShameGate(wantsInstant, reason, ...)` | 30727–30751 | Main decision gate: instant vs deferred based on danger/shame/beta |

### Phase 3: advHeal Drain Loop (the main body)

| # | Section | moomoo.js Lines | What It Does |
|---|---|---|---|
| 3.1 | Death detection | 30754–30778 | If health ≤ 0: mark death, `notif2()`, `addDeadPlayer()`, GM target-kill cleanup |
| 3.2 | Bull-tick detection | 30782–30790 | `damaged == 5*soldier` → `player.bullTick`, resync clear, poison counter |
| 3.3 | Self-damage heal (beta, low ping) | 30796–31042 | `pingTime < 150` + beta enabled: food-based thresholds, weapon-specific tree (sword/polearm/katana/dagger/shield/spear/axe), HKH combo, shield anti |
| 3.4 | Self-damage heal (non-beta, low ping) | 31043–31055 | `pingTime < 150` + no beta: simpler damage-threat gating |
| 3.5 | Out-of-game poison | 31056–31060 | `setPoisonTick` when not inGame |
| 3.6 | Self-damage heal (high ping) | 31062–31115 | `pingTime >= 150`: same structure as 3.3/3.4 but `traps.inTrap` aware, `healTimeout = 60` |
| 3.7 | Non-self damage | 31116–31117 | Poison tick detection for other players |
| 3.8 | `advHeal = []` clear | 31118 | Reset for next tick |

---

## State Already Available in Nozo

| State | Source |
|---|---|
| `this.advHeal[]` | `_hO` handler (L5816, L5826) — `[sid, hp, damaged]` tuples |
| `this.root.scans` | `buildCombatScans(p)` — near/player/los/hammer |
| `this.root.near` / `.enemy` | `_ha()` second tuple pass |
| `this.root.traps` | First tuple pass — `inTrap`, `info` |
| `this.root.game` | `tick`, `tickBase()`, `tickQueue` |
| `this.legacyCtx` | `_things` mirror — `nearTrap`, `instaC`, `configs`, `pingTime` |
| `p` / `player` | `.health`, `.shameCount`, `.damageThreat`, `.reloads[]`, `.weapons[]`, `.skinIndex`, `.tailIndex` |
| `getEl(id)` | L103 |
| `place(...)` | `this.root.place` |
| `game.tickBase(...)` | L4418 |
| `this._findPlayerBySid(sid)` | Player lookup |

---

## State NOT Yet Available (needs wiring or stubbing)

| State | How To Get It |
|---|---|
| `unsafeWindow.pingTime` | `this.legacyCtx.pingTime` (already mirrored at L4635) |
| `getEl("healingBeta").checked` | `getEl` exists, just needs DOM element |
| `getEl("slowHealUnlessInsta").checked` | Same |
| `config.isSandbox` | `this.root.config.isSandbox` or `_config.isSandbox` |
| `configs.HKH` | `this.root.configs.HKH` or `_configs.HKH` |
| `antispiketicked` | Legacy flag — likely dead code, guard or stub |
| `safewalking` | Legacy flag — likely dead code, guard or stub |
| `GM_getValue / GM_setValue / sendUpdate` | Target-kill tracking — stub: skip if `typeof GM_getValue !== "function"` |
| `deadPlayers[]` | Create `this.root.deadPlayers = []` when `addDeadPlayer` is ported |
| `my.autoAim` | `this.root.my.autoAim` |
| `player.antiTimer` | `p.antiTimer` |

## Porting Rule: No setTimeout — Tick-Based Only

This game is tick-based. All `setTimeout`/`clearTimeout` calls in the original moomoo.js advHeal **must be converted to `game.tickBase`**.

| Original setTimeout | Converted tickBase |
|---|---|
| `setTimeout(fn, ms)` | `game.tickBase(fn, Math.ceil(ms / game.tickRate))` |
| `clearTimeout(id)` | Drop entirely — tickBase has no cancel mechanism |

**3 conversions needed:**

| Location | Original | Tick-Based Replacement |
|---|---|---|
| `_healSlowHeal` fallback | `setTimeout(() => healer(), timerMs)` | `game.tickBase(() => healer(), Math.ceil(timerMs / game.tickRate))` |
| `healer()` ping-delay | `healTM = setTimeout(() => healer(1), pingTime * 1.5)` | `game.tickBase(() => healer(1), Math.ceil(pingTime * 1.5 / game.tickRate))` |
| Shield anti swap-back | `setTimeout(() => { selectWeapon(w0); my.autoAim = false }, 250)` | `game.tickBase(() => { selectWeapon(w0); my.autoAim = false }, Math.ceil(250 / game.tickRate))` |

---

## Suggested Port Order

```
Phase 1: Leaf Dependencies (bottom-up)
  1.1 healthBased()           — tiny, ~5 lines
  1.2 soldierMult()           — tiny, ~10 lines
  1.3 addDeadPlayer(tmpObj)   — tiny, 2 lines (+ deadPlayers[] init)
  1.4 notif2(msg, target)     — small, ~30 lines DOM
  1.5 addMenuChText(...)      — small, needs menu DOM ref
  1.6 getAttacker(damaged)    — small, damage→weapon mapping
  1.7 getAttackDir(debug)     — medium, ~40 lines (depends on place/aim lock)
  1.8 healer(t)               — small (depends on healthBased, place, getAttackDir, tickBase)
  1.9 HKH()                   — medium, combat combo

Phase 2: Helper Closures (ported as PlayerRuntime methods)
  2.1–2.7  All 7 closures    — ~80 lines, pure logic

Phase 3: advHeal Drain Loop
  3.1–3.8  Full loop          — ~250 lines, calls Phase 1+2
```

---

## What Can Be Stubbed / Skipped

| Item | Reason |
|---|---|
| `GM_getValue('k')` / `GM_setValue` / `sendUpdate` | Target-kill tracking. Guard with `typeof` check. |
| `antispiketicked` | Likely dead code. Guard or omit. |
| `safewalking` | Likely dead code. Guard or omit. |
| `clicks.left/right/middle` | Not in advHeal scope. Skip. |
| `my.autoAim` | Mirror from `this.root.my.autoAim` if not present. |

---

## What NOT to Port in This Phase

- Full insta decision tree
- Preplace/autoPlace/autoReplace
- autoPush/autoPush2/chainPush
- Camp point movement
- Skin/weapon auto-selection
- dodgeKBI / bull window management
- Renderer changes
