# Insta & Combat Decision Tree Port Plan

## Target
Port the post-advHeal combat section from `moomoo.js updatePlayers` (L31283–31762+).

This section sits between advHeal drain and the reload-manager/autoPlace blocks. It handles insta-kill decisions, spike prediction, anti-push, auto-insta, mill placement, and auto-break coordination.

## What's Already Done (nozo-single)
- `buildCombatScans(p)` — populates `root.scans` / `legacyCtx.info` with player/near/los/hammer/vel data
- `getAttackDir(p)` — attack direction with fallbacks
- `healer(p)`, `HKH(p)` — heal + combo methods
- advHeal drain loop skeleton in `_ha()` (operations commented out)

## State Available
| State | Source |
|---|---|
| `this.root.scans` / `this.legacyCtx.info` | `buildCombatScans(p)` — prehit, antiSpikeTick, vel.hasHostileHazard, los, hammer |
| `this.root.near` / `.enemy` / `.nears` | `_ha()` second pass |
| `this.root.traps` | First pass — `inTrap`, `aim`, `info` |
| `this.root.instaC` | L4386 — instakill controller |
| `this.root.my` | Player state — `autoPush`, `anti0Tick` |
| `p` (player) | `.reloads[]`, `.weapons[]`, `.shameCount`, `.skinIndex` |

---

## Section Map (moomoo.js L31283–31762+)

### A. Capture Combat Movement (~7 lines)
| L# | What | Dependencies |
|---|---|---|
| 31283–31289 | `captureCombatMovementData({tick, nowMs, info, nearObj, trapsState, inGameState})` | `captureCombatMovementData` function (not ported) |

### B. Predict Tick / Spike Sync (~10 lines)
| L# | What | Dependencies |
|---|---|---|
| 31291–31300 | `knockBackPredict()` → `instaC.changeType("rev")` or `instaC.spikeTickType("rev")` | `knockBackPredict` (not ported), `configs.predictTick`, `my.anti0Tick` |

### C. EmpAnti / SoldierAnti (~15 lines)
| L# | What | Dependencies |
|---|---|---|
| 31301–31315 | If `player.canEmpAnti`: check near reload → `player.empAnti` or `player.soldierAnti` | `my.safePrimary(near)`, `my.safeSecondary(near)` |

### D. Prehit → Spike Tick (~10 lines)
| L# | What | Dependencies |
|---|---|---|
| 31317–31324 | `info.near.prehitTeamDmg` → `instaC.canSpikeTick = true`, `instaC.syncHit = true`, optionally `instaC.revTick` | `configs.predictTick`, `configs.revTick`, `instaC.perfCheck` |

### E. AntiVel (~10 lines)
| L# | What | Dependencies |
|---|---|---|
| 31327–31337 | `info.vel.hasHostileHazard` → `buyEquip(6, 0)`, `player.antiVel = true` | `buyEquip`, `addMenuChText` |

### F. AntiSpike Placement (~20 lines)
| L# | What | Dependencies |
|---|---|---|
| 31339–31355 | Near enemy < 300: check if spike can be placed around player → `player.antiSpike = true/false` | `objectManager.checkItemLocation`, `items.list[9]` |

### G. Multi-Near Heal (~5 lines)
| L# | What | Dependencies |
|---|---|---|
| 31358–31361 | `nears.length > 1 && shame < 5 && nears have polearm/katana/sword` → `my.anti0Tick = 3`, `healer1()` | `secPacket`, `healer1` (not ported) |

### H. Anti1tick Detection (~15 lines)
| L# | What | Dependencies |
|---|---|---|
| 31363–31376 | Polearm variant ≥2 + skin 53 + dist 169–250 → `my.anti0Tick = 3`, `predictHeal(1)`, chat msg | `predictHeal` (not ported), `player.chat` |

### I. Bulltick Announcement (~10 lines)
| L# | What | Dependencies |
|---|---|---|
| 31380–31382 | `(game.tick - near.bullTick) % 9 == 0 && near.skinIndex == 7` → `addMenuChText`, `bultect` flag | `near.bullTick` |

### J. trapFound + Tank Equip Prediction (~30 lines)
| L# | What | Dependencies |
|---|---|---|
| 31388–31419 | Set `_things.trapFound`, `updateTrapTankEquipPrediction(near, trapFound)`, `antiSpikeTick` → `my.anti0Tick = 1` | `updateTrapTankEquipPrediction` (not ported), `configs.combatWarnings` |

### K. canInsta Checks (~10 lines)
| L# | What | Dependencies |
|---|---|---|
| 31421–31428 | Range + reload + perf check → `instaC.can`, `player.checkCanInsta(true/false)` → `_things.canNoBull` / `_things.canBull` | `instaC.wait`, `my.waitHit`, `instaC.perfCheck` |

### L. autoInsta Decision Tree (~100 lines) — HEAVY
| L# | What | Dependencies |
|---|---|---|
| 31430–31445 | Build `availableInstaTypes[]` from nobull/bull thresholds, LOS autoInstaClear check | `_things.canNoBull`, `_things.canBull`, `safeGetObjectsInLineOfSight` |
| 31445–31508 | 2-shame insta (range weapons) + 5-shame insta (hammer + polearm/katana) with range/reload/LOS gates | `unsafeWindow.autoInsta`, `clicks.right`, `instaC.changeType`, `_random`, `addMenuChText` |

### M. smartAutoInsta (~80 lines) — HEAVY
| L# | What | Dependencies |
|---|---|---|
| 31490–31508 | Same as L but for `configs.smartAutoInsta` with `instaType.value` | `instaType.value` (DOM) |
| 31515–31569 | Bulltick oneframe: turret projectile impact tick vs bull cycle phase math, gear gates (turret hat, diamond pole, soldier skin) | `_things.turretBullTickSample`, `sendChat`/`chat`, `_things.oneFrameInsultText` |

### N. autobullspam (~10 lines)
| L# | What | Dependencies |
|---|---|---|
| 31573–31581 | Range + reload check → `instaC.canspam` → `instaC.spammer()` | `configs.autobullspam` |

### O. Macro Hotkeys (~10 lines)
| L# | What | Dependencies |
|---|---|---|
| 31582–31588 | `macro.q/f/v/y/h/n` → `place()`, `getAttackDir()`, `getSafeDir()` | `macro` object, `getSafeDir`, `player.getItemType` |

### P. Mill Placement (~100 lines)
| L# | What | Dependencies |
|---|---|---|
| 31590–31695 | Mill auto-placement: `mills.place`, `mills.dist`, threshold calc, 3-angle placement, `canplace`/`checkPlace` | `mills`, `items2`, `canplace`, `checkPlace`, `items.list[player.items[3]]` |

### Q. InstaC Trigger Tree (~70 lines)
| L# | What | Dependencies |
|---|---|---|
| 31696–31699 | `instaC.can` → `instaC.changeType` | `instaType.value` |
| 31701–31709 | `instaC.canCounter` → `instaC.counterType()` or `instaC.hammerCounterType()` | `sendChat` |
| 31710–31716 | Hammer trap insta: `info.hammer.canRun` → `instaC.hammerInsta()` | `instaC.hammerInsta` |
| 31717–31742 | `canSpikeTick` + `revTick` → `instaC.spikeTickType()` / `instaC.changeType("rev")` | `my.anti0Tick`, `secPacket` |
| 31743–31747 | `instaC.canKb` → return `"insta them"` | `spikeDbg` |
| 31750–31762 | `nearspiker` + `autoBreak.active` / `traps.inTrap` → `sendReloadCheckedHit`, `setAttackAimLock` | `getAutoBreakCheckTarget`, `getAutoBreakCheckWeapon`, `sendReloadCheckedHit`, `setAttackAimLock` |

---

## Missing Dependencies (functions not yet in nozo-single)

| Function | Used In | Effort |
|---|---|---|
| `knockBackPredict()` | B | medium |
| `captureCombatMovementData(...)` | A | small |
| `my.safePrimary(near)` / `my.safeSecondary(near)` | C | small |
| `buyEquip(id, slot)` | E, autoInsta | medium |
| `objectManager.checkItemLocation(...)` | F | exists? check |
| `healer1()` | G, advHeal | tiny |
| `predictHeal(n)` | H | tiny |
| `player.chat.message/count` | H | state |
| `updateTrapTankEquipPrediction(near, trap)` | J | medium |
| `player.checkCanInsta(bool)` | K | medium |
| `_random(arr)` | L | tiny |
| `instaType.value` | L, M, Q | DOM ref |
| `unsafeWindow.autoInsta` | L | checkbox |
| `instaC.changeType(type)` | L, Q | instaC method |
| `instaC.perfCheck(player, near)` | D, K | instaC method |
| `instaC.spikeTickType(...)` / `instaC.counterType()` / `instaC.hammerCounterType()` / `instaC.hammerInsta()` / `instaC.spammer()` | Q | instaC methods |
| `sendChat(msg)` | Q | network |
| `spikeDbg(msg, color)` | Q | debug |
| `getAutoBreakCheckTarget()` / `getAutoBreakCheckWeapon()` | Q | autoBreak |
| `sendReloadCheckedHit(...)` / `setAttackAimLock(...)` | Q | combat |
| `macro` object | O | input |
| `getSafeDir()` | O | movement |
| `mills` object + `canplace` + `checkPlace` | P | building |
| `items2` | P | items variant |
| `secPacket` | G, Q | network |
| `clicks.left/right/middle` | L, Q | input |
| `useWasd` | L? | input |
| `configs.predictTick/revTick/combatWarnings/smartAutoInsta/autobullspam` | B, D, J, M, N | config |

---

## Suggested Port Order

```
Phase 1: Tiny leaf deps
  healer1(), predictHeal(), _random()

Phase 2: State wiring  
  instaType.value, unsafeWindow.autoInsta, secPacket, clicks, macro
  player.chat, configs.* flags

Phase 3: Medium deps  
  knockBackPredict(), buyEquip(), updateTrapTankEquipPrediction()
  player.checkCanInsta(), my.safePrimary/Secondary()

Phase 4: InstaC methods (must exist before wiring Q)  
  instaC.changeType, perfCheck, spikeTickType, counterType, hammerCounterType, hammerInsta, spammer

Phase 5: Section port (order: B→D→E→F→G→H→I→J→K→L→M→N→O→P→Q)
  A (captureCombatMovementData) can be stubbed.
  Sections with heavy instaC deps (L, M, Q) should be last.
```

---

## What Can Be Stubbed

| Item | Reason |
|---|---|
| `captureCombatMovementData` | Debug/metric system — stub as no-op |
| `spikeDbg` | Debug logging — `console.log` fallback |
| `sendChat` / `chat` | Network chat — guard or stub |
| `macro.q/f/v/y/h/n` | Hotkey system — guard with `typeof macro !== "undefined"` |
| `unsafeWindow.autoInsta` | DOM checkbox — `getEl("autoInsta")?.checked` |
| `clicks.left/right/middle` | Input system — not fully ported, guard |
