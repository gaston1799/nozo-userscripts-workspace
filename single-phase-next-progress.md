# Single-File Runtime — Phase Next Progress

## Status: COMPLETE

---

## Event Handlers Ported (actual behavior)

All handlers below were upgraded from typed-log stubs to real state-maintaining logic.
`a` (updatePlayers) was NOT touched — still minimal local-player-only tuple update.

| Packet | Name              | Real behavior ported                                                                 |
|--------|-------------------|--------------------------------------------------------------------------------------|
| A      | setInitData       | Stores `data.teams` into `this.alliances`                                            |
| D      | addPlayer         | Find-or-create Player in `this.players` by id; sets sid/name; marks isYou            |
| E      | removePlayer      | Splices player from `this.players` by id                                              |
| G      | updateLeaderboard | Stores flat array in `this.lastLeaderboardData`                                      |
| H      | loadGameObject    | Find-or-create game objects (8 fields each) in `this.gameObjects`                    |
| I      | loadAI            | Find-or-create AI entries (7 fields each) in `this.ais`; interpolation timestamps   |
| J      | animateAI         | Looks up AI in `this.ais`, calls `startAnim()` if present                            |
| K      | gatherAnimation   | Looks up player in `this.players`, sets `gathering`/`gatherIndex`, calls `startAnim` |
| L      | wiggleGameObject  | Finds object in `this.gameObjects`, applies `xWiggle`/`yWiggle` from config          |
| M      | shootTurret       | Finds object, updates `dir`, applies reverse wiggle                                  |
| O      | updateHealth      | Looks up any player in `this.players`, updates `oldHealth`/`health`/`damaged`; pushes to `advHeal` on damage; local player also gets `p.applyHealth()` |
| P      | killPlayer        | Sets `this.inGame = false`, `p.alive = false`, saves `this.lastDeath = {x,y}`       |
| Q      | killObject        | Finds object in `this.gameObjects`, sets `active = false`                            |
| R      | killObjects       | Sets `active = false` on all `this.gameObjects` entries matching ownerSid            |
| S      | updateItemCounts  | Already correct (single index/value update on local player)                          |
| T      | updateAge         | Updates `p.XP`, `p.maxXP`, `p.age`                                                  |
| U      | updateUpgrades    | Updates `p.upgradePoints`, `p.upgrAge`                                               |
| V      | updateItems       | Already correct (weapons/items arrays + primaryIndex/secondaryIndex)                 |
| X      | addProjectile     | Pushes `{x,y,dir,range,speed,indx,layer,sid,active}` into `this.projectiles`        |
| Y      | remProjectile     | Finds projectile by sid, sets `range` and `active = false`                           |
| 0      | addAlliance       | Pushes alliance entry into `this.alliances`                                          |
| 1      | deleteAlliance    | Filters out alliance entry from `this.alliances`                                     |
| 2      | allianceNotif     | No-op log only (moomoo.js source is also a no-op for bots we don't maintain)         |
| 3      | setPlayerTeam     | Updates `p.team`, `p.isOwner`; clears `this.alliancePlayers` on null team           |
| 4      | setAlliancePlayers| Stores flat array in `this.alliancePlayers`                                          |
| 5      | updateStoreItems  | Updates `p.skins[id]`/`p.tails[id]` or `p.latestSkin`/`p.latestTail`               |
| 6      | receiveChat       | XSS guard (img/iframe filter); finds sender in `this.players`; appends to `sender.chatMessages` (capped at 3) |
| 7      | updateMinimap     | Stores flat data in `this.minimapData`                                               |
| 8      | showText          | Pushes `{x,y,value,type,at}` into `this.textQueue` (capped at 32)                  |
| 9      | pingMap           | Pushes `{x,y,at}` into `this.mapPings` (capped at 16)                               |

---

## advHeal Port Report

### 1) Where `advHeal` is defined
**moomoo.js line 19285**
```js
let advHeal = [];
```
In `project-nozo-single.user.js`: added as `this.advHeal = []` in `PlayerRuntime` constructor.

### 2) Where it is mutated (push)
**moomoo.js line 28571** — inside `updateHealth(sid, value)`:
```js
if (tmpObj.oldHealth > tmpObj.health) {
    tmpObj.damaged = tmpObj.oldHealth - tmpObj.health;
    advHeal.push([sid, value, tmpObj.damaged]);
}
```
Ported to `_hO` in `PlayerRuntime`: fires for any player in `this.players` when their health drops.

### 3) Where it is consumed
**moomoo.js lines 30753–31118** — inside a game tick loop, guarded by `if (advHeal.length)`:
- Iterates entries `[sid, value, damaged]`
- Guards on `unsafeWindow.pingTime < 150`
- Looks up player, tracks death state (`tmpObj.death`), notifies, calls `addDeadPlayer`
- Bull-tick detection: `if (damaged == 5 * ...)` → sets `player.bullTick`
- Healer trigger logic (heal decisions)
- Clears `advHeal = []` at end

### 4) What remains unported
The **consumption loop** (lines 30753–31118) is **not ported** — it depends on:
- `unsafeWindow.pingTime` (live network stat)
- `GM_getValue`/`GM_setValue` (userscript storage cross-tab)
- `sendUpdate`, `notif2`, `addDeadPlayer`, `game.tickBase` (engine tick system)
- Healer subsystem (`_healLogDecision`, `_healSlowHeal`, heal timeout chain)
- `instaC` (insta-kill controller)

The single-file runtime stores the `advHeal` queue and populates it correctly. The owner can wire up consumption logic in a future phase when the tick system and healer subsystem are ported.

---

## Files Changed

- `C:\Users\Naquan\userscripts\project-nozo-single.user.js`
  - `Player` constructor: added `XP`, `maxXP`, `age`, `upgradePoints`, `upgrAge`, `isOwner`, `skins`, `tails`, `latestSkin`, `latestTail`, `chatMessages`, `gathering`, `gatherIndex`, `damaged`
  - `PlayerRuntime` constructor: added `players`, `ais`, `gameObjects`, `projectiles`, `alliances`, `alliancePlayers`, `minimapData`, `lastLeaderboardData`, `advHeal`, `inGame`, `lastDeath`, `textQueue`, `mapPings`
  - Added `_findPlayerBySid`, `_findObjectBySid`, `_findAIBySid` helper methods
  - Updated `applySpawnUiOnce` to set `this.inGame = true` on first spawn
  - Replaced all stub handlers (A, D, E, G, H, I, J, K, L, M, P, Q, R, T, U, X, Y, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9) with real logic
  - Updated `_hO` to track all players' health and populate `advHeal`
  - `_ha` (updatePlayers): **unchanged**
  - `BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE`: **still in place**

---

## Validation Run

```
node --check project-nozo-single.user.js
# Exit 0 — no output (clean)
```

---

## Remaining Gaps

1. **advHeal consumption loop** — game-tick integration, healer subsystem, ping gating (see advHeal report above)
2. **`a` handler parity** — bulk player position updates for non-local players; owner to implement manually
3. **UI updates** in `_hV`, `_hS`, `_hU` — `selectWeapon`, `updateItemCountDisplay`, `upgradeHolder` DOM writes not ported (no game DOM in this runtime)
4. **`objectManager`/`aiManager` callbacks** — `wiggleGameObject` and `shootTurret` only update raw xWiggle/yWiggle; render-side pickup is not connected
5. **Projectile damage** — `remProjectile` marks inactive but does not apply `projDmg` to hit objects (no `objectManager.hitObj` in this runtime)
6. **`gatherAnimation` damage tick** — val calculation and `objectManager.hitObj` health reduction not ported
7. **Alliance menu UI** (packet 2) — `allianceNotification` is a no-op; the full invite-accept flow is not ported
8. **`updateStoreItems`** skin index 7 `reSync` flag — depends on `my.reSync` which belongs to the combat subsystem
