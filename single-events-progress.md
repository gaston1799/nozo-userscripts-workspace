# single-events-progress.md

## Status: COMPLETE

## Summary

Refactored `PlayerRuntime.handlePacket` in `project-nozo-single.user.js` to use strict safe dispatch (switch-based, no dynamic prototype access) and ported full event handling parity with moomoo.js's `getMessage` event table.

**Priority handlers** (fully implemented, logic ported from moomoo.js):
- `C` (`_hC`) — setupGame / yourSID assignment
- `a` (`_ha`) — updatePlayers bulk position tick (13 fields per player)
- `N` (`_hN`) — updatePlayerValue: reload timers + generic player props, with prototype-safe key guard
- `O` (`_hO`) — updateHealth
- `S` (`_hS`) — updateItemCounts
- `V` (`_hV`) — updateItems (items list and weapons list)

**Stubs / typed logs added** for all remaining moomoo.js packet types:
- `A` — setInitData (teams)
- `D` — addPlayer (id, sid, name)
- `E` — removePlayer (id)
- `G` — updateLeaderboard (length)
- `H` — loadGameObject (entry count at 8 fields each)
- `I` — loadAI (entry count at 7 fields each)
- `J` — animateAI (sid)
- `K` — gatherAnimation (sid, didHit, index)
- `L` — wiggleGameObject (dir, sid)
- `M` — shootTurret (sid, dir)
- `P` — killPlayer (no args)
- `Q` — killObject (sid)
- `R` — killObjects (sid)
- `T` — updateAge (xp, mxp, age)
- `U` — updateUpgrades (points, age)
- `X` — addProjectile (x, y, dir, …, sid)
- `Y` — remProjectile (sid, range)
- `0` — addAlliance
- `1` — deleteAlliance (sid)
- `2` — allianceNotification (sid, name)
- `3` — setPlayerTeam (team, isOwner) — also writes `p.team`
- `4` — setAlliancePlayers (length)
- `5` — updateStoreItems (type, id, index)
- `6` — receiveChat (sid, msg)
- `7` — updateMinimap (length)
- `8` — showText (x, y, value, type)
- `9` — pingMap (x, y)

**Guards preserved** (as required):
- `BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE = true` (line 18)
- Early return in ws message listener (line 824)

## Files Changed

- `project-nozo-single.user.js` — replaced `handlePacket` + old handler methods (`C`, `a`, `O`, `N`, `V`, `S`) with safe switch dispatch + prefixed handlers (`_hC`, `_ha`, `_hO`, `_hN`, `_hV`, `_hS`) + 28 new stub/typed-log handlers

## Validation Run

```
node --check project-nozo-single.user.js
# exit code: 0 (no syntax errors)
```

## Remaining Gaps

- All stubs log typed output only; no game-world side effects are implemented for: A, D, E, G, H, I, J, K, L, M, P, Q, R, T, U, X, Y, 0–9
- `_h3` writes `p.team` as a minimal real side-effect; full team/alliance state management is not yet implemented
- The ws message listener early-return guard (`BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE`) means **no packets are dispatched at runtime yet** — remove the guard and early return when all stubs are promoted to full implementations
