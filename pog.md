kys leave gate.
self tuple detection and early return if self not present.
shame resync into my.reSync.
mills/oldXY init.
game.tick++ and tickQueue[game.tick] execution.
player visibility reset.
phantom object disable/reset.
first 13-field player tuple pass:
position history x1/x2/x3/x4/x5, y1/...
direction, weapon/build/skin/tail/team/icon/z state
distances/aims dist2..dist5, aim2..aim5
shame timer skin 45 handling
local-player nearby object scan
nearObjs
trap detection into traps.inTrap/info/aim/dist
nearSpikeInfo
autobreak priority population
autoBreaker.calculateAim()
primary/secondary weapon indexes
manageReload(...)
second tuple pass:
enemy
nears
addDamageThreat(...)
root.near
calls adapted calledTickCalc(p).
calls syncResourceCacheFromObjects().
basic pathfinder call if targetPos exists.
Partially done:

calledTickCalc (141/594 lines ported from moomoo.js L39986-40579):
  DONE:
    liztobj render culling
    water wave tick state
    enemy range + lead (once per tick; moomoo.js duplicate recompute intentionally skipped)
    knockback/danger sim (willDie, willDieData, willDieIndex)
    path + wander world cache
  TODO (10 blocks remaining):
    1) dodge geometry (_things.dodgePlan: plR, angEn, angSp, spokes, bestEsc)
    2) quick will-die sweep (_things.sim.quick)
    3) full lethal check (_things.sim.full: hitPos, lethalObj, KBIndc)
    4) moveNOW from dodgePlan on lethal
    5) pathFind world->screen cache (_things.cachedPath)
    6) wander path cache (_things.cachedWander)
    7) insta-keys HUD metrics (_things.instaHUD: trapR, gap, reachP/S, widP/S, plan)   DONE
    8) enemy cluster detection (_things.cluster: centroid, radius, size)
    9) campable zone logic (_things.campPoint/_campPointT/_campMeta: spike-edge + cluster fallback)
   10) spike cone/pie precompute (_things.spikeCones: angle, halfAngle, radialEnd per spike)
safeGetObjectsInLineOfSight is set up, but the later combat logic that uses it heavily has not been copied in.
textManager.stack merge and runAtNextTick/checkProjectileHolder section after interpolation is not ported yet.
The large post-near combat body after moomoo.js line ~30650 onward is mostly not ported: insta logic, healer flow around updatePlayers, anti-push, auto-place/preplace decisions, camp/spike cone logic, etc.