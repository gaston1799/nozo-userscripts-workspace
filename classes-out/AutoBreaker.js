class AutoBreaker {
                    constructor() {
                        this.active = false;
                        this.aim = 0;
                        this.priority = [[], [], [], []];
                        this.target = null;
                    }
                    deactivate() {
                        this.active = false;
                        this.aim = 0;
                        this.target = null;
                    }
                    objectsHit(aim) {
                        if (!Number.isFinite(aim)) return [];
                        let results = [];
                        nearObjs.forEach(e => {
                            let dir = UTILS.getDirect(e, player, 0, 2);
                            const weapon = items.weapons[this.useHammer(e) ? player.weapons[1] : player.weapons[0]];
                            if (e.active && e.type == null && weapon && Number.isFinite(dir) && UTILS.getDist(player, e, 2, 0) <= weapon.range + e.scale && UTILS.getAngleDist(dir, aim) <= Math.PI / 2.6) {
                                results.push(e);
                            }
                        });
                        return results;
                    }
                    getFilteredPriority() {
                        return this.priority.map(list =>
                            list.filter(obj => {
                                if (!obj || !obj.active) return false;
                                const weapon = items.weapons[this.useHammer(obj) ? player.weapons[1] : player.weapons[0]];
                                const dist = UTILS.getDist(obj, player, 0, 2);
                                const aim = UTILS.getDirect(obj, player, 0, 2);
                                return !!weapon && Number.isFinite(dist) && Number.isFinite(aim) && dist <= weapon.range + obj.scale;
                            })
                        );
                    }
                    getPriorityTarget() {
                        if (!player || !Array.isArray(this.priority)) return null;
                        for (let list of this.priority) {
                            if (!Array.isArray(list)) continue;
                            const target = list
                                .filter(obj => obj && obj.active)
                                .sort((a, b) => UTILS.getDist(a, player, 0, 2) - UTILS.getDist(b, player, 0, 2))[0];
                            if (target) return target;
                        }
                        return this.target && this.target.active ? this.target : null;
                    }
                    calculateAim() {
                        if (!player || !items || !items.weapons) {
                            this.deactivate();
                            return;
                        }
                        const filteredPriority = this.getFilteredPriority();
                        for (let level = 0; level < filteredPriority.length; level++) {
                            const targets = filteredPriority[level];
                            if (level == 3) {
                                if (enemy.length && near.dist2 <= 569) {
                                    this.deactivate();
                                    return;
                                }
                            }
                            if (targets.length > 0) {
                                this.processTargets(targets, level);
                                return;
                            }
                        }
                        this.deactivate();
                    }
                    processTargets(targetObjs, level) {
                        targetObjs = targetObjs.filter(obj => obj && obj.active && Number.isFinite(UTILS.getDirect(obj, player, 0, 2)));
                        if (!targetObjs.length) {
                            this.deactivate();
                            return;
                        }
                        let maxTargetsHit = 0;
                        const checkedAims = new Set();
                        if (targetObjs.length > 1) {
                            let aimAngles = [];
                            for (let i = 0; i < targetObjs.length; i++) {
                                for (let j = i + 1; j < targetObjs.length; j++) {
                                    const adjust = (angle) => angle < 0 ? angle + 2 * Math.PI : angle;
                                    let aim1 = UTILS.getDirect(targetObjs[i], player, 0, 2);
                                    let aim2 = UTILS.getDirect(targetObjs[j], player, 0, 2);
                                    const aAdjusted = adjust(aim1);
                                    const bAdjusted = adjust(aim2);
                                    let avg = (aAdjusted + bAdjusted) / 2;
                                    let diff = Math.abs(aAdjusted - bAdjusted);
                                    if (diff > Math.PI) avg += Math.PI;
                                    avg = avg % (2 * Math.PI);
                                    if (avg > Math.PI) avg -= 2 * Math.PI;
                                    let aimBetween = avg;
                                    if (!Number.isFinite(aimBetween)) continue;
                                    if (checkedAims.has(aimBetween)) continue;
                                    checkedAims.add(aimBetween);
                                    const objectsHit = this.objectsHit(aimBetween);
                                    let reward = 0;
                                    objectsHit.forEach((obj) => {
                                        if (obj.isTeamObject(player)) {
                                            if (traps.inTrap && traps.info && obj.sid == traps.info.sid) reward -= level != 3 ? 50 : -50;
                                            else if (obj.dmg || obj.trap) reward -= level != 3 ? 30 : -50;
                                            else reward -= level != 3 ? 10 : -50;
                                        } else {
                                            if (obj.dmg) reward += 70;
                                            else if (obj.trap) reward += 60;
                                            else reward += 50;
                                        }
                                    });
                                    aimAngles.push({ aim: aimBetween, reward });
                                }
                            }
                            for (let i = 0; i < targetObjs.length; i++) {
                                const aimDirect = UTILS.getDirect(targetObjs[i], player, 0, 2);
                                if (!Number.isFinite(aimDirect)) continue;
                                if (checkedAims.has(aimDirect)) continue;
                                checkedAims.add(aimDirect);
                                const objectsHit = this.objectsHit(aimDirect);
                                let reward = 0;
                                objectsHit.forEach((obj) => {
                                    if (obj.isTeamObject(player)) {
                                        if (traps.inTrap && traps.info && obj.sid == traps.info.sid) reward -= level != 3 ? 50 : -50;
                                        else if (obj.dmg || obj.trap) reward -= level != 3 ? 30 : -50;
                                        else reward -= level != 3 ? 10 : -50;
                                    } else {
                                        if (obj.dmg) reward += 70;
                                        else if (obj.trap) reward += 60;
                                        else reward += 50;
                                    }
                                });
                                aimAngles.push({ aim: aimDirect, reward });
                            }
                            const bestAim = aimAngles.filter(a => Number.isFinite(a.aim)).sort((a, b) => b.reward - a.reward)[0];
                            if (!bestAim) {
                                this.deactivate();
                                return;
                            }
                            this.aim = bestAim.aim;
                            this.target = targetObjs.filter(obj => objectManager.canHit(player, obj, player.weapons[0])).sort((a, b) => a.health - b.health)[0] || { health: 9999 };
                            this.active = true;
                            return;
                        }
                        let aimAngles = [];
                        const target = targetObjs[0];
                        const aimDirect = UTILS.getDirect(targetObjs[0], player, 0, 2);
                        if (!Number.isFinite(aimDirect)) {
                            this.deactivate();
                            return;
                        }
                        let objectsHit = this.objectsHit(aimDirect);
                        let reward = 0;
                        objectsHit.forEach((obj) => {
                            if (obj.isTeamObject(player)) {
                                if (traps.inTrap && traps.info && obj.sid == traps.info.sid) reward -= level != 3 ? 50 : -50;
                                else if (obj.dmg || obj.trap) reward -= level != 3 ? 30 : -50;
                                else reward -= level != 3 ? 10 : -50;
                            } else {
                                reward += 60;
                            }
                        });
                        aimAngles.push({ aim: aimDirect, reward });
                        const saferAngles = [Math.PI / 2.6 / 3, Math.PI / 2.6 / 2, Math.PI / 2.6 - 0.1];
                        for (let saferAngle of saferAngles) {
                            for (let saferAim of [aimDirect - saferAngle, aimDirect + saferAngle]) {
                                let oh = this.objectsHit(saferAim);
                                let r = 0;
                                oh.forEach((obj) => {
                                    if (obj.isTeamObject(player)) {
                                        if (traps.inTrap && traps.info && obj.sid == traps.info.sid) r -= level != 3 ? 50 : -50;
                                        else if (obj.dmg || obj.trap) r -= level != 3 ? 30 : -50;
                                        else r -= level != 3 ? 10 : -50;
                                    } else {
                                        r += 60;
                                    }
                                });
                                aimAngles.push({ aim: saferAim, reward: r });
                            }
                        }
                        const bestAim = aimAngles.filter(a => Number.isFinite(a.aim)).sort((a, b) => b.reward - a.reward)[0];
                        if (!bestAim) {
                            this.deactivate();
                            return;
                        }
                        this.aim = bestAim.aim;
                        this.target = target;
                        this.active = true;
                    }
                    useHammer(object) {
                        if (!player || !items || !items.weapons) return false;
                        if (player.weapons[1] != 10) return false; // no great hammer secondary

                        const primaryId = player.weapons[0];
                        const primaryDmg = (items.weapons[primaryId] && Number(items.weapons[primaryId].dmg)) || 0;

                        if (object && object.trap) return true;

                        const spikeInfo =
                            (object && typeof object === "object" && object.dmg)
                                ? object
                                : (_things && _things.nearSpikeInfo && typeof _things.nearSpikeInfo === "object"
                                    ? _things.nearSpikeInfo
                                    : null);

                        const spikeHealth =
                            spikeInfo && Number.isFinite(Number(spikeInfo.health))
                                ? Number(spikeInfo.health)
                                : null;

                        // Keep hammer out for polearm setups or unknown object health.
                        if (primaryId == 5) return true;
                        if (spikeHealth === null) return true;

                        // Normal resolver: hammer until spike can be finished by primary.
                        return spikeHealth > primaryDmg;
                    }
                }
