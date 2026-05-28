# updatePlayers (moomoo.js) → _ha (nozo-single) Port Plan

## Size
- **moomoo.js `updatePlayers`**: L30311–L34478 = **4,168 lines**
- **nozo-single `_ha`**: L5191–L5483 = **293 lines**
- **Gap**: ~3,875 lines not ported

---

## What's Already Ported (in `_ha`)

| moomoo.js section | nozo equivalent | Status |
|---|---|---|
| KYS gate | `_handleKysGate(p)` | ✅ |
| shame → my.reSync | L5224–5225 | ✅ |
| mills/oldXY init | L5227–5228 | ✅ |
| game.tick++ | L5230 | ✅ |
| tickQueue execution | L5232–5236 | ✅ |
| safeGetObjectsInLineOfSight | L5238–5247 | ✅ |
| visibility reset | L5253–5256 | ✅ |
| phantom cleanup | L5258–5263 | ✅ |
| 13-field tuple pass (pos, skin, etc.) | L5267–5332 | ✅ |
| nearObj scan + traps + autobreaker | L5334–5423 | ✅ |
| weapon indexes + manageReload | L5425–5438 | ✅ |
| second tuple pass (enemy/nears/damageThreat) | L5440–5462 | ✅ |
| calledTickCalc | L5465 | ✅ |
| syncResourceCacheFromObjects | L5466 | ✅ |
| pathfinder (if targetPos) | L5468–5474 | ✅ |

---

## NOT Ported — Remaining Blocks (by line range in moomoo.js)

### A. Pre-Tuple Tick Hooks (~5 lines)
| Item | Lines | Description |
|---|---|---|
| `wanderTick()` call | 30336 | ~~Wander tick called before tuple passes.~~ **DEAD CODE — intentionally skipped.** |
| `dPacketTracker.dirs = []` | 30333 | Direction packet tracker reset |

### B. Post-First-Tuple Hooks (~4 lines)
| Item | Lines | Description |
|---|---|---|
| `updatePlayerKinematics(tmpObj, game)` | 30588 | Kinematics update per player object |

### C. textManager Stack Merge (~35 lines)
| Item | Lines | Description |
|---|---|---|
| `textManager.stack` merge | 30592–30624 | Aggregates positive/negative text values, calls `textManager.showText()` |

### D. runAtNextTick / checkProjectileHolder (~5 lines)
| Item | Lines | Description |
|---|---|---|
| `runAtNextTick` drain → `checkProjectileHolder` | 30626–30630 | Runs queued projectile holder checks |

### E. Healer Decision System (~450 lines) — MAJOR
| Item | Lines | Description |
|---|---|---|
| Healer helper closures | 30671–30752 | `_healIsBullOrDaggerPressure`, `_healIsDangerNowTight`, `_healShouldAllowFastHealNonInsta`, `_healLogDecision`, `_healSlowHeal`, `_healSlowHealBullDaggerFallback`, `_healWithShameGate` |
| `advHeal.forEach` — death detection | 30754–30778 | Player death logging, `addDeadPlayer()`, `notif2()` |
| Bull-tick detection | 30782–30790 | `player.bullTick = game.tick`, poison counter, bullTicked flag |
| Full heal decision tree | 30796–31118 | Damage-type gating, `shouldHeal` logic, weapon-specific thresholds (sword insta, polearm/katana, dagger), per-damage-type heal timing |

### F. Combat Scans Construction (~170 lines) — MAJOR
| Item | Lines | Description |
|---|---|---|
| `scans` object | 31119–31190 | player scans (antiSpikeTick), near scans (trapFound, hasTeamTrapOnEnemy), los scans (solidBlockers, autoInstaClear), hammer scans (trap, trapDist, closeD, inCloseRange) |
| Object iteration for scans | 31191–31260 | Populates all scan fields from liztobj |
| `captureCombatMovementData()` | 31283–31289 | Snapshots traps state + meta for combat movement |

### G. Insta Decision Tree (~470 lines) — MAJOR
| Item | Lines | Description |
|---|---|---|
| `knockBackPredict` → spike sync | 31293–31300 | "insta them" / "primary sync" detection |
| Prehit / antiSpike logic | 31301–31355 | Spike prediction, antiSpike flag toggling |
| `healer1()` call | 31360 | Single heal call |
| Bulltick enemy detection | 31380–31382 | Chat announcement when enemy bullticks |
| `trapFound` / `updateTrapTankEquipPrediction` | 31388–31419 | Trap-found propagation, tank equip prediction |
| `canInsta` checks | 31421–31428 | `checkCanInsta(true/false)` → `_things.canNoBull`, `_things.canBull` |
| `autoInsta` logic | 31430–31508 | Available insta types, LOS check, shame-gated auto-instas |
| `smartAutoInsta` | 31490–31569 | Turret bull-tick phase prediction, one-frame bull tick |
| `autobullspam` | 31573–31581 | `instaC.canspam` / `instaC.spammer()` |
| `autoGo` + mill | 31606–31695 | Auto-gather resource walk |
| `instaC.can` / `instaC.canCounter` / `hammerInsta` | 31696–31716 | Main insta trigger, counter-type, hammer trap insta |
| `instaC.canSpikeTick` / `revTick` / `syncHit` | 31717–31742 | Spike-tick insta, rev-tick insta |
| `instaC.canKb` | 31743–31747 | Knockback insta guard |
| `nearspiker` handling | 31750–31760 | Spike-proximity auto-break coordination |

### H. AutoBreak / Trap Aim (~40 lines)
| Item | Lines | Description |
|---|---|---|
| AutoBreak wait-hit state machine | 31761–31798 | Coordinates trap-hit timing with autoBreak for swing timing |
| `canEnemyTickMe` | 31799–31800 | Whether enemy can tick the player into a spike |

### I. Click/Macro/Reload/Insta Movement (~130 lines)
| Item | Lines | Description |
|---|---|---|
| Manual click insta handling | 31801–31827 | Left/right click insta triggers |
| Middle-click insta | 31827–31832 | ageInsta bow movement, rangeType |
| `kmTickMovement` | 31845–31887 | Auto-KM movement state machine (blocked/by-trap/perf states) |
| Macro hotkey instas | 31888–31895 | `macro.t` → tickMovement, `macro.` → boostTickMovement |
| Reload manager autoBreak lock | 31898–31901 | Prevents reload during autoBreak |
| Weapon-specific reload + aim | 31902–31926 | Wasd-relative aim, weapon-switch reload logic |

### J. Preplace / AutoPlace / AutoReplace (~40 lines)
| Item | Lines | Description |
|---|---|---|
| `traps.preplaces` reset | 31927–31929 | Clears preplace arrays |
| `traps.autoReplace` | 31931–31934 | Replaces broken traps |
| `traps.autoPlace` chains | 31937–31953 | Multi-condition autoPlace calls (enemy in trap, near dist thresholds) |
| `preplacer()` / `autoOneFrame` / `adxtick` | 31957–31964 | Preplacer, one-frame spike placing, ADX tick |

### K. Anti-Spike Bot Positioning (~50 lines)
| Item | Lines | Description |
|---|---|---|
| Chosen spike selection | 31965–32014 | Finds best spike near enemy for anti-spike bot positioning |

### L. Insta Spot Computation (~140 lines)
| Item | Lines | Description |
|---|---|---|
| `computeInstaSpotStable()` | 32042–32142 | Finds stable position behind trap for insta (angle scoring, LOS, smoothing) |
| `_things.stealM` | 32144 | Steal-mode detection |
| `instaC.rangeType()` auto-trigger | 32166–32207 | Long-range insta auto-fire |
| Full insta spot setup | 32213–32256 | Trap-edge spot, ring radius, obstacle filtering, smooth render |

### M. Bull Window Management (~40 lines)
| Item | Lines | Description |
|---|---|---|
| `bullExpectedDmg()` | 32262–32266 | Calculates expected bull damage |
| `startBullWindow()` / `closeBullWindow()` | 32267–32277 | Opens/closes bull prediction window |
| `canBullTick(de)` | 32298–32321 | Whether enemy can bull-tick the player |

### N. dodgeKBI (~170 lines)
| Item | Lines | Description |
|---|---|---|
| `dodgeKBI()` | 32323–32493 | Knockback-instakill dodge movement (vector-based escape from enemy+spike combos) |

### O. Object Cleanup / BreakItem (~160 lines)
| Item | Lines | Description |
|---|---|---|
| `closeAI` proximity cleanup | 32495–32580 | Triggers cleanup when AI is near |
| `breakItem` collection | 32581–32621 | Gathers nearby breakable items |
| Mill routing | 32625–32779 | Resource-mill pathfinding |

### P. autoRuby (~170 lines)
| Item | Lines | Description |
|---|---|---|
| `autoRuby` resource routing | 32803–32973 | Ruby/stone auto-gather pathfinding |

### Q. Skin / Weapon Selection (~100 lines)
| Item | Lines | Description |
|---|---|---|
| Skin switching | 32917–33117 | Anti-shame skin selection, gear-based skin logic |
| Weapon selection | 33118–33177 | Auto-weapon switching for insta/situational |

### R. autoPushChain (~260 lines)
| Item | Lines | Description |
|---|---|---|
| Chain push detection | 33178–33258 | Multi-enemy push chain coordination |
| Death/shame push abort | 33259–33454 | Aborts push on death or high shame |
| Push state transitions | 33455–33661 | `_things.going_` → `_things.going` state machine |

### S. Camp Point Movement (~100 lines)
| Item | Lines | Description |
|---|---|---|
| Camp point following | 33662–33753 | Moves toward `_things.campPoint_` with distance thresholds |
| Weapon code switching | 33754–33769 | Selects appropriate weapon for camping |
| Trap-aware movement | 33770–33779 | Movement adjustments when in trap |

### T. Wander Management (~60 lines)
| Item | Lines | Description |
|---|---|---|
| Wander target cycling | 33947–34011 | Cycles wander targets when close, handles bull active check |

### U. reSync / anti0Tick (~100 lines)
| Item | Lines | Description |
|---|---|---|
| `_things.reSync` handling | 34037–34055 | Resync flag management |
| `needAnti0` / `anti0Tick` | 34056–34237 | Anti-0-tick (zero-tick insta) prediction and counter |

### V. WASD Movement (~70 lines)
| Item | Lines | Description |
|---|---|---|
| `useWasd` movement | 34295–34305 | WASD-based movement integration |

### W. autoPush / autoPush2 (~170 lines)
| Item | Lines | Description |
|---|---|---|
| `autoPush` main logic | 34306–34443 | Auto-push toward enemy with range checks, insta coordination |
| `autoPush2` logic | 34444–34468 | Secondary push path (bot skin movement) |

---

## Summary: 23 Remaining Blocks (~3,875 lines)

| Priority | Block | Lines | Dependencies |
|---|---|---|---|
| **HIGH** | E. Healer decision system | ~450 | `advHeal`, `healer()`, `notif2`, `addDeadPlayer`, `addMenuChText` |
| **HIGH** | F. Combat scans construction | ~170 | `liztobj`, `_things`, `captureCombatMovementData` |
| **HIGH** | G. Insta decision tree | ~470 | `instaC`, `knockBackPredict`, `healer1`, `updateTrapTankEquipPrediction`, `autoInsta` |
| **MED** | H. AutoBreak/trap aim | ~40 | `autoBreak`, `traps`, `setAttackAimLock`, `sendAutoGather` |
| **MED** | I. Click/macro/reload/insta movement | ~130 | `instaC`, `clicks`, `macro`, `kmTickMovement` |
| **MED** | J. Preplace/autoPlace/autoReplace | ~40 | `traps.preplaces`, `traps.autoReplace`, `traps.autoPlace` |
| **MED** | K. Anti-spike bot positioning | ~50 | `liztobj`, enemy position |
| **MED** | L. Insta spot computation | ~140 | `computeInstaSpotStable`, `instaC.rangeType` |
| **MED** | M. Bull window management | ~40 | `game.tick`, `player.bullTick` |
| **MED** | N. dodgeKBI | ~170 | `knockBackPredictEnemyToPlayer`, movement system |
| **MED** | O. Object cleanup / breakItem | ~160 | `closeAI`, `breakObjects`, mill routing |
| **MED** | P. autoRuby | ~170 | Resource routing, pathfinding |
| **MED** | Q. Skin/weapon selection | ~100 | `selectWeapon`, `buyEquip`, skin items |
| **MED** | R. autoPushChain | ~260 | Push chain state machine |
| **MED** | S. Camp point movement | ~100 | `_things.campPoint_` (from calledTickCalc) |
| ~~LOW~~ | ~~A. Pre-tuple hooks~~ | ~~5~~ | **DEAD CODE** — `wanderTick` not needed, `dPacketTracker` unused |
| **LOW** | B. updatePlayerKinematics | ~4 | Per-player kinematics |
| **LOW** | C. textManager.stack | ~35 | `textManager.showText` |
| **LOW** | D. runAtNextTick | ~5 | `checkProjectileHolder` |
| **LOW** | T. Wander management | ~60 | `_things.wander_` |
| **LOW** | U. reSync/anti0Tick | ~100 | `_things.reSync`, `anti0Tick` |
| **LOW** | V. WASD movement | ~70 | `useWasd` |
| **LOW** | W. autoPush/autoPush2 | ~170 | `my.autoPush`, `my.autoPush2` |

---

## Suggested Port Order
```
E (healer) → F (scans) → G (insta tree) → H–I (autoBreak + click/macro)
→ J–K (preplace + anti-spike pos) → L–M (insta spot + bull window)
→ N (dodgeKBI) → O–P (cleanup + autoRuby)
→ Q–R (skin/weapon + pushChain) → S (camp movement)
→ B–C–D (small hooks) → T–U–V–W (movement systems)
```
