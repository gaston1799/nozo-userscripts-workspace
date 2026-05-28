class Traps {
                    constructor(UTILS, items) {
                        this.dist = 0;
                        this.aim = 0;
                        this.inTrap = false;
                        this.replaced = false;
                        this.antiTrapped = false;
                        this.info = {};
                        this.replaceSids = [];
                        this.radObjs = [];
                        this.preplaces = [[], []];
                        this.nest = { rad: 0, x: 0, y: 0 };
                        this.notFast = function () {
                            return player.weapons[1] == 10 && ((this.info.health > items.weapons[player.weapons[0]].dmg) || player.weapons[0] == 5);
                        }
                        this.createObj = function (item, direct) {
                            let preObj = {
                                id: item.id,
                                dir: direct,
                                scale: item.scale,
                                getScale: function () {
                                    return this.scale;
                                },
                            };
                            preObj.x = player.x2 + (player.scale + preObj.scale + (item.placeOffset || 0)) * Math.cos(preObj.dir);
                            preObj.y = player.y2 + (player.scale + preObj.scale + (item.placeOffset || 0)) * Math.sin(preObj.dir);
                            return preObj;
                        };
                        this.radCalc = function (obj, direct, item, type) {
                            let preObj = this.createObj(item, direct);
                            let getScale = typeof obj.getScale === "function" ? obj.getScale(0.6, obj.isItem) : obj.scale;
                            let dist = UTILS.getDist(obj, preObj, 0, 0);
                            let scale = getScale + preObj.scale;
                            let angles = [];
                            const tooCloseToPreplace = (candidate, group) => {
                                return this.preplaces[group].length && this.preplaces[group].some(pos => UTILS.getDist(pos, candidate, 0, 0) < pos.scale + candidate.scale);
                            };
                            const canUse = (candidate) => {
                                if (tooCloseToPreplace(candidate, 1)) return false;
                                if (tooCloseToPreplace(candidate, 0)) return false;
                                if (candidate.y >= config.mapScale / 2 - config.riverWidth / 2 && candidate.y <= config.mapScale / 2 + config.riverWidth / 2) return false;
                                return objectManager.checkItemLocation(candidate.x, candidate.y, candidate.scale, 0.6, candidate.id, false, player);
                            };
                            if (dist < scale) {
                                let calc = Math.acos(Math.min(1, dist / scale));
                                let sum = [calc, -calc];
                                for (let i = 0; i < sum.length; i++) {
                                    let angle = direct + sum[i];
                                    preObj = this.createObj(item, angle);
                                    if (canUse(preObj)) {
                                        angles.push(angle);
                                        this.preplaces[1].push(preObj);
                                    }
                                }
                            } else {
                                if (type) return [];
                                preObj = this.createObj(item, direct);
                                if (canUse(preObj)) {
                                    angles.push(direct);
                                    this.preplaces[1].push(preObj);
                                }
                            }
                            return angles;
                        };
                        const shouldSpikeTickPlace = (id, target = near) => {
                            if (id !== 2 || !configs.spikeTick) return false;
                            if (!target || !player || !items || !items.weapons) return true;
                            const primary = player.weapons[0];
                            const range = (items.weapons[primary] && items.weapons[primary].range) || 0;
                            const dist = Number.isFinite(target.dist2) ? target.dist2 : UTILS.getDist(target, player, 0, 2);
                            return dist <= range + (player.scale * 1.8);
                        };
                        const getKbiSpikePlan = (baseDir, spread = Math.PI / 2, step = Math.PI / 24, allowFallback = false) => {
                            if (!configs.spikeTick || player.items[2] == undefined || !near) return null;
                            const targetX = near.x2 || near.x;
                            const targetY = near.y2 || near.y;
                            if (!Number.isFinite(targetX) || !Number.isFinite(targetY) || !Number.isFinite(baseDir)) return null;

                            const offsets = [0];
                            for (let off = step; off <= spread; off += step) {
                                offsets.push(off, -off);
                            }

                            let best = null;
                            for (let i = 0; i < offsets.length; i++) {
                                const dir = baseDir + offsets[i];
                                if (!canplace(2, dir)) continue;

                                let dmg = 0, trap = 0, tp = 0;
                                if (typeof kbSimulator !== "undefined" && kbSimulator.spikeKB) {
                                    try {
                                        const seat = this.getItemPlaceLocation(2, dir);
                                        const sim = kbSimulator.spikeKB(
                                            { x: targetX, y: targetY, scale: 35, tmpObj: near },
                                            { x: seat.x, y: seat.y, scale: 35 },
                                            true
                                        );
                                        const data = (sim && sim.data) || [];
                                        for (let j = 0; j < data.length; j++) {
                                            if (data[j].id === "spiek") dmg += data[j].dmg || 0;
                                            else if (data[j].id === "trap") trap++;
                                            else if (data[j].id === "tp") tp++;
                                        }
                                    } catch (e) {
                                        logCaughtError("catch@19584", e);
                                        dmg = 0;
                                        trap = 0;
                                        tp = 0;
                                    }
                                }

                                const align = 1 - Math.min(Math.PI, Math.abs(UTILS.getAngleDist(dir, baseDir))) / Math.PI;
                                const score = (dmg * 4.5) + (trap * 26) - (tp * 22) + (align * 6);
                                if (!best || score > best.score) best = { dir, score, dmg, trap, tp };
                            }

                            if (!best) return null;
                            if (best.dmg > 0 || best.trap > 0 || allowFallback || shouldSpikeTickPlace(2)) return best;
                            return null;
                        };
                        const doPlace = (id, dir, render, spikeTick) => {
                            const reserve = getSpikeTickReserve();
                            if (id == 4) {
                                const spikePlan = reserve
                                    ? getKbiSpikePlan(Number.isFinite(reserve.dir) ? reserve.dir : dir, Math.PI / 2, Math.PI / 24, true)
                                    : getKbiSpikePlan(dir, Math.PI / 3, Math.PI / 24, false);
                                if (spikePlan) return doPlace(2, spikePlan.dir, render, true);
                                if (reserve) return false;
                            } else if (id == 2 && reserve && Number.isFinite(reserve.dir)) {
                                dir = reserve.dir;
                            }
                            place(id, dir, render, !!spikeTick || shouldSpikeTickPlace(id));
                            return true;
                        };
                        this.testCanPlace = function (id, first = -(Math.PI / 2), repeat = (Math.PI / 2), plus = (Math.PI / 18), radian, replacer, yaboi, spikeTick) {
                            try {
                                let item = items.list[player.items[id]];
                                let tmpS = player.scale + item.scale + (item.placeOffset || 0);
                                let counts = {
                                    attempts: 0,
                                    placed: 0
                                };
                                let tmpObjects = [];
                                gameObjects.forEach((p) => {
                                    tmpObjects.push({
                                        x: p.x,
                                        y: p.y,
                                        active: p.active,
                                        blocker: p.blocker,
                                        scale: p.scale,
                                        isItem: p.isItem,
                                        type: p.type,
                                        colDiv: p.colDiv,
                                        getScale: function (sM, ig) {
                                            sM = sM || 1;
                                            return this.scale * ((this.isItem || this.type == 2 || this.type == 3 || this.type == 4)
                                                ? 1 : (0.6 * sM)) * (ig ? 1 : this.colDiv);
                                        },
                                    });
                                });
                                for (let i = first; i < repeat; i += plus) {
                                    counts.attempts++;
                                    let relAim = radian + i;
                                    let tmpX = player.x2 + tmpS * Math.cos(relAim);
                                    let tmpY = player.y2 + tmpS * Math.sin(relAim);
                                    let cantPlace = tmpObjects.find((tmp) => tmp.active && UTILS.getDistance(tmpX, tmpY, tmp.x, tmp.y) < item.scale + (tmp.blocker ? tmp.blocker : tmp.getScale(0.6, tmp.isItem)));
                                    if (cantPlace) continue;
                                    if (item.id != 19 && tmpY >= config.mapScale / 2 - config.riverWidth / 2 && tmpY <= config.mapScale / 2 + config.riverWidth / 2) continue;
                                    if ((!replacer && yaboi) || useWasd) {
                                        if (useWasd ? false : yaboi.inTrap) {
                                            if (UTILS.getAngleDist(near.aim2 + Math.PI, relAim + Math.PI) <= Math.PI) {
                                                doPlace(2, relAim, 1, spikeTick);
                                            } else {
                                                player.items[4] == 15 && doPlace(4, relAim, 1, spikeTick);
                                            }
                                        } else {
                                            if (UTILS.getAngleDist(near.aim2, relAim) <= config.gatherAngle / 1.5) {
                                                doPlace(2, relAim, 1, spikeTick);
                                            } else {
                                                player.items[4] == 15 && doPlace(4, relAim, 1, spikeTick);
                                            }
                                        }
                                    } else {
                                        doPlace(id, relAim, 1, spikeTick || replacer);
                                    }
                                    tmpObjects.push({
                                        x: tmpX,
                                        y: tmpY,
                                        active: true,
                                        blocker: item.blocker,
                                        scale: item.scale,
                                        isItem: true,
                                        type: null,
                                        colDiv: item.colDiv,
                                        getScale: function () {
                                            return this.scale;
                                        },
                                    });
                                    if (UTILS.getAngleDist(near.aim2, relAim) <= 1) {
                                        counts.placed++;
                                    }
                                }
                                if (counts.placed > 0 && replacer && item.dmg) {
                                    if (near.dist2 <= items.weapons[player.weapons[0]].range + (player.scale * 1.8) && configs.spikeTick) {
                                        instaC.canSpikeTick = true;
                                    }
                                }
                            } catch (err) {
                                logCaughtError("catch@19687", err);
                            }
                        };

                        this.checkSpikeTick = function () {
                            try {
                                if (![3, 4, 5].includes(near.primaryIndex)) return false;
                                if ((getEl("safeAntiSpikeTick").checked || my.autoPush) ? false : near.primaryIndex == undefined ? true : (near.reloads[near.primaryIndex] > game.tickRate)) return false;
                                // more range for safe. also testing near.primaryIndex || 5
                                if (near.dist2 <= items.weapons[near.primaryIndex || 5].range + (near.scale * 1.8)) {
                                    let item = items.list[9];
                                    let tmpS = near.scale + item.scale + (item.placeOffset || 0);
                                    let danger = 0;
                                    let counts = {
                                        attempts: 0,
                                        block: `unblocked`
                                    };
                                    for (let i = -1; i <= 1; i += 1 / 10) {
                                        counts.attempts++;
                                        let relAim = UTILS.getDirect(player, near, 2, 2) + i;
                                        let tmpX = near.x2 + tmpS * Math.cos(relAim);
                                        let tmpY = near.y2 + tmpS * Math.sin(relAim);
                                        let cantPlace = gameObjects.find((tmp) => tmp.active && UTILS.getDistance(tmpX, tmpY, tmp.x, tmp.y) < item.scale + (tmp.blocker ? tmp.blocker : tmp.getScale(0.6, tmp.isItem)));
                                        if (cantPlace) continue;
                                        if (tmpY >= config.mapScale / 2 - config.riverWidth / 2 && tmpY <= config.mapScale / 2 + config.riverWidth / 2) continue;
                                        danger++;
                                        counts.block = `blocked`;
                                        break;
                                    }
                                    if (danger) {
                                        my.anti0Tick = 1;
                                        player.chat.count = 100000;
                                        return true;
                                    }
                                }
                            } catch (err) {
                                logCaughtError("catch@19722", err);
                                return null;
                            }
                            return false;
                        }
                        this.protect = function (aim) {
                            sendChat("");
                            if (!configs.antiTrap) return;
                            if (player.items[4]) {
                                this.testCanPlace(4, -(Math.PI / 2), (Math.PI / 2), (Math.PI / 18), aim + Math.PI);
                                this.antiTrapped = true;
                            }
                        };
                        /*this.autoPlace = function() {
                        if (enemy.length && configs.autoPlace && !instaC.ticking) {
                            if (game.tick % (Math.max(1, parseInt(getEl("autoPlaceTick").value)) || 1) === 0) {
                                if (gameObjects.length) {
                                    let near2 = {
                                        inTrap: false,
                                    };
                                    let nearTrap = gameObjects.filter(e => e.trap && e.active && e.isTeamObject(player) && UTILS.getDist(e, near, 0, 2) <= (near.scale + e.getScale() + 5)).sort(function(a, b) {
                                        return UTILS.getDist(a, near, 0, 2) - UTILS.getDist(b, near, 0, 2);
                                    })[0];
                                    if (nearTrap) {
                                        near2.inTrap = true;
                                    } else {
                                        near2.inTrap = false;
                                    }
                                    if ((near.dist3 <= 450)) {
                                        if (near.dist3 <= 200) {
                                            this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2, 0, {
                                                inTrap: near2.inTrap
                                            });
                                        } else {
                                            player.items[4] == 15 && this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2);
                                        }
                                    }
                                } else {
                                    if ((near.dist3 <= 450)) {
                                        player.items[4] == 15 && this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2);
                                    }
                                }
                            }
                        }
                    };*/
                        function getEnemyVelocity(near) {
                            return Math.sqrt(near.xVel * near.xVel + near.yVel * near.yVel);
                        }

                        function getEnemyDirection(near) {
                            return Math.atan2(near.yVel, near.xVel);
                        }
                        function isPositionValid(position) {
                            const playerX = player.x2;
                            const playerY = player.y2;
                            const distToPosition = Math.hypot(position[0] - playerX, position[1] - playerY);
                            return distToPosition > 35;
                        }
                        this.unsafeGameObjects = {
                            near: [],
                            near350: [],
                            spikes: [],
                        };

                        function n(e) {
                            return e && e.isBuffer && e
                        }

                        function calculatePossibleTrapPositions(x, y, radius) {
                            const trapPositions = [];
                            const numPositions = 8;
                            for (let i = 0; i < numPositions; i++) {
                                const angle = (2 * Math.PI * i) / numPositions;
                                const offsetX = x + radius * Math.cos(angle);
                                const offsetY = y + radius * Math.sin(angle);
                                const position = [offsetX, offsetY];
                                if (!trapPositions.some((pos) => isPositionTooClose(position, pos))) {
                                    trapPositions.push(position);
                                }
                            }
                            return trapPositions;
                        }
                        function isPositionTooClose(position1, position2, minDistance = 50) {
                            const dist = Math.hypot(position1[0] - position2[0], position1[1] - position2[1]);
                            return dist < minDistance;
                        }

                        function dotProduct(vector1, vector2) {
                            return vector1.x * vector2.x + vector1.y * vector2.y;
                        }

                        function magnitude(vector) {
                            return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
                        }

                        this.getItemPlaceLocation = function (obj, dir) {
                            let item = items.list[player.items[obj]];
                            let tmpS = player.scale + item.scale + (item.placeOffset || 0);
                            let tmpX = player.x2 + tmpS * Math.cos(dir);
                            let tmpY = player.y2 + tmpS * Math.sin(dir);
                            return {
                                x: tmpX,
                                y: tmpY
                            };
                        };
                        function vectorDifference(point1, point2) {
                            return {
                                x: point2.x - point1.x,
                                y: point2.y - point1.y
                            };
                        }
                        function calculateAngleUsingDotProduct(point1, point2) {
                            let diffVector = vectorDifference(point1, point2);
                            let playerDirection = {
                                x: Math.cos(player.dir),
                                y: Math.sin(player.dir)
                            };
                            let dotProd = dotProduct(playerDirection, diffVector);
                            let magnitudeProd = magnitude(playerDirection) * magnitude(diffVector);
                            let cosTheta = dotProd / magnitudeProd;
                            let dynamicAngle = Math.acos(cosTheta);
                            dynamicAngle *= 180 / Math.PI;
                            if (dynamicAngle < 0) dynamicAngle += 360;
                            return dynamicAngle;
                        }
                        function caf(e, t) {
                            try {
                                return Math.atan2((t.y2 || t.y) - (e.y2 || e.y), (t.x2 || t.x) - (e.x2 || e.x));
                            } catch (e) {
                                logCaughtError("catch@19850", e);
                                return 0;
                            }
                        }
                        function toR(e) {
                            var n = (e * Math.PI / 180) % (2 * Math.PI);
                            return n > Math.PI ? Math.PI - n : n
                        }

                        function toD(e) {
                            var n = (e / Math.PI * 360) % 360;
                            return n >= 360 ? n - 360 : n;
                        }
                        function calculatePerfectAngle(x1, y1, x2, y2) {
                            return Math.atan2(y2 - y1, x2 - x1);
                        }
                        this.autoPlace = function (type, id, id2, reasonhaha) {
                            if (arguments.length) {
                                if (!enemy.length) return false;
                                if (!configs.autoPlace) return false;
                                if (instaC.ticking) return false;
                                if (game.tick % (Math.max(1, parseInt(getEl("autoPlaceTick").value)) || 1) !== 0) return false;

                                let placed = false;
                                if (type == 0) {
                                    if (id == undefined) return false;
                                    let itemId = player.items[id];
                                    if (itemId == undefined) return false;
                                    let item = items.list[itemId];
                                    let itemId2 = id2 == undefined ? null : player.items[id2];
                                    let item2 = itemId2 == undefined ? null : items.list[itemId2];

                                    this.radObjs = nearObjs.filter(obj => obj.active && UTILS.getDist(obj, player, 0, 2) < 300);
                                    if (this.radObjs.length) {
                                        for (let i = 0; i < this.radObjs.length; i++) {
                                            let obj = this.radObjs[i];
                                            let direct = UTILS.getDirect(obj, player, 0, 2);
                                            let placeAngles = this.radCalc(obj, direct, item);
                                            if (placeAngles.length) {
                                                for (let j = 0; j < placeAngles.length; j++) {
                                                    doPlace(id, placeAngles[j], 1, shouldSpikeTickPlace(id));
                                                    placed = true;
                                                }
                                            } else if (item2) {
                                                let placeAngles2 = this.radCalc(obj, direct, item2);
                                                for (let j = 0; j < placeAngles2.length; j++) {
                                                    doPlace(id2, placeAngles2[j], 1, shouldSpikeTickPlace(id2));
                                                    placed = true;
                                                }
                                            }
                                        }
                                    } else {
                                        for (let i = 0; i < Math.PI * 2; i += Math.PI / 2) {
                                            if (checkPlace(id, near.aim2 + i, shouldSpikeTickPlace(id))) placed = true;
                                        }
                                    }
                                } else if (type == 1) {
                                    if (id == undefined) return false;
                                    let itemId = player.items[id];
                                    if (itemId == undefined) return false;
                                    let item = items.list[itemId];

                                    this.nest.rad = 0;
                                    this.nest.x = near.x2;
                                    this.nest.y = near.y2;
                                    this.radObjs = nearObjs.filter(obj => {
                                        if ((id == 4 ? obj.dmg : obj.trap) && obj.active) {
                                            let dist = UTILS.getDist(obj, near, 0, 2);
                                            if (dist < 500) {
                                                if (this.nest.rad < dist) this.nest.rad = dist;
                                                return true;
                                            }
                                        }
                                        return false;
                                    });
                                    if (this.radObjs.length) {
                                        for (let i = 0; i < this.radObjs.length; i++) {
                                            let obj = this.radObjs[i];
                                            let direct = UTILS.getDirect(obj, player, 0, 2);
                                            let placeAngles = this.radCalc(obj, direct, item, 1);
                                            for (let j = 0; j < placeAngles.length; j++) {
                                                doPlace(id, placeAngles[j], 1, shouldSpikeTickPlace(id));
                                                placed = true;
                                            }
                                        }
                                    }
                                    if (reasonhaha && this.preplaces[1].length < 1) {
                                        if (this.autoPlace(1, id2, id, false)) placed = true;
                                    }
                                }
                                return placed;
                            }
                            let placed
                            if (enemy.length && configs.autoPlace && !instaC.ticking) {
                                if (game.tick % (Math.max(1, parseInt(getEl("autoPlaceTick").value)) || 1) === 0) {
                                    const hasSpike = player.items[2] !== undefined && !!items.list[player.items[2]];
                                    const hasTrap = player.items[4] == 15 && !!items.list[player.items[4]];
                                    if (!hasSpike && !hasTrap) return false;

                                    const dist = near.dist2 || UTILS.getDist(near, player, 0, 2) || 9999;
                                    const self = this;
                                    const baseAim = Number.isFinite(near.aim2) ? near.aim2 : calculatePerfectAngle(player.x2, player.y2, near.x2 || near.x, near.y2 || near.y);

                                    // Smart spike placement first (bounded, high-quality angles only).
                                    if (hasSpike && dist <= 120) {
                                        const usedSpikeSeats = [];
                                        let spikeCalls = 0;
                                        const MAX_SMART_SPIKES = 2//dist <= 120 ? 6 : (dist <= 220 ? 5 : 4);
                                        const vel = getEnemyVelocity(near) || 0;
                                        const eDir = getEnemyDirection(near) || baseAim;

                                        const getSeat = (ang) => {
                                            try {
                                                return self.getItemPlaceLocation(2, ang);
                                            } catch (e) {
                                                logCaughtError("catch@19964", e);
                                                return null;
                                            }
                                        };
                                        const seatValid = (ang) => {
                                            const s = getSeat(ang);
                                            if (!s || !isPositionValid([s.x, s.y])) return false;
                                            if (s.y >= config.mapScale / 2 - config.riverWidth / 2 && s.y <= config.mapScale / 2 + config.riverWidth / 2) return false;
                                            for (let i = 0; i < usedSpikeSeats.length; i++) {
                                                if (isPositionTooClose([s.x, s.y], [usedSpikeSeats[i].x, usedSpikeSeats[i].y], 26)) return false;
                                            }
                                            return true;
                                        };
                                        const kbScore = (ang) => {
                                            if (typeof kbSimulator === "undefined" || !kbSimulator.spikeKB) return { dmg: 0, trap: 0, tp: 0 };
                                            const seat = getSeat(ang);
                                            if (!seat) return { dmg: 0, trap: 0, tp: 0 };
                                            try {
                                                const sim = kbSimulator.spikeKB(
                                                    { x: near.x2 || near.x, y: near.y2 || near.y, scale: 35, tmpObj: near },
                                                    { x: seat.x, y: seat.y, scale: 35 },
                                                    true
                                                );
                                                const data = (sim && sim.data) || [];
                                                let dmg = 0, trap = 0, tp = 0;
                                                for (let i = 0; i < data.length; i++) {
                                                    if (data[i].id === "spiek") dmg += data[i].dmg || 0;
                                                    else if (data[i].id === "trap") trap++;
                                                    else if (data[i].id === "tp") tp++;
                                                }
                                                return { dmg, trap, tp };
                                            } catch (e) {
                                                logCaughtError("catch@19995", e);
                                                return { dmg: 0, trap: 0, tp: 0 };
                                            }
                                        };
                                        const placeSpike = (ang) => {
                                            if (spikeCalls >= MAX_SMART_SPIKES) return false;
                                            if (!seatValid(ang)) return false;
                                            self.testCanPlace(2, 0, 0.000001, 1, ang, 1, null, true);
                                            const s = getSeat(ang);
                                            if (s) usedSpikeSeats.push({ x: s.x, y: s.y });
                                            spikeCalls++;
                                            placed = true;
                                            return true;
                                        };

                                        const offsets = [0, Math.PI / 18, -(Math.PI / 18), Math.PI / 12, -(Math.PI / 12), Math.PI / 8, -(Math.PI / 8), Math.PI / 6, -(Math.PI / 6), Math.PI / 4, -(Math.PI / 4)];
                                        const candidates = offsets.map((off) => {
                                            const ang = baseAim + off;
                                            const k = kbScore(ang);
                                            const align = 1 - Math.min(Math.PI, Math.abs(UTILS.getAngleDist(ang, baseAim))) / Math.PI;
                                            const moveAlign = Math.cos(UTILS.getAngleDist(ang, eDir));
                                            const score = (k.dmg * 4.5) + (k.trap * 26) - (k.tp * 22) + (align * 10) + (moveAlign * (vel > 0.2 ? 6 : 3));
                                            return { ang, score };
                                        }).sort((a, b) => b.score - a.score);

                                        for (let i = 0; i < candidates.length && spikeCalls < MAX_SMART_SPIKES; i++) {
                                            placeSpike(candidates[i].ang);
                                        }
                                    }
                                    const trappedNow = this.inTrap || (typeof traps !== "undefined" && traps && traps.inTrap);
                                    if (trappedNow && near.dist2 <= 500) {
                                        const baseAim = near.aim2;
                                        const trappedFan = [0, Math.PI / 9, -(Math.PI / 9), Math.PI / 5, -(Math.PI / 5)];
                                        let trappedPlaced = false;

                                        for (let i = 0; i < trappedFan.length; i++) {
                                            trappedPlaced = checkPlace(2, baseAim + trappedFan[i], true) || trappedPlaced;
                                        }

                                        if (!trappedPlaced && player.items[4] == 15) {
                                            for (let i = 0; i < trappedFan.length; i++) {
                                                trappedPlaced = checkPlace(4, baseAim + trappedFan[i]) || trappedPlaced;
                                            }
                                        }

                                        if (trappedPlaced) {
                                            placed = true;
                                            return placed;
                                        }
                                    }

                                    if (gameObjects.length) {
                                        let near2 = {
                                            inTrap: true,
                                        };
                                        let nearTrap = gameObjects.filter(e => e.trap && e.active && e.isTeamObject(player) && UTILS.getDist(e, near, 0, 2) <= (near.scale + e.getScale() + 5)).sort(function (a, b) {
                                            return UTILS.getDist(a, near, 0, 2) - UTILS.getDist(b, near, 0, 2);
                                        })[0];
                                        if (nearTrap) {
                                            near2.inTrap = true;
                                        } else {
                                            near2.inTrap = true;
                                        }
                                        if ((near.dist2 <= 375)) {
                                            if (near.dist2 <= 200) {
                                                this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2, 0, { inTrap: near2.inTrap });
                                                placed = true
                                            } else {
                                                player.items[4] == 15 && (this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2), placed = true);
                                            }
                                        }
                                    } else {
                                        if ((near.dist2 <= 1000)) {
                                            player.items[4] == 15 && (this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), near.aim2), placed = true);
                                        }
                                    }
                                }
                            }
                            return placed
                        };
                        this.autoReplace = function (sidList) {
                            if (!enemy.length) return false;
                            if (near.dist2 > 300) return false;
                            if (!configs.autoReplace) return false;
                            if (getEl("weaponGrind")?.checked) return false;

                            let placed = false;
                            for (let i = 0; i < sidList.length; i++) {
                                let sid = sidList[i];
                                let building = findObjectBySid(sid);
                                if (!building) continue;
                                let breakDist = UTILS.getDist(building, player, 0, 2);
                                if (breakDist > 300) continue;
                                let breakDir = UTILS.getDirect(building, player, 0, 2);

                                let nearEnemyTrap = gameObjects.find(t => t.trap && t.active && t.isTeamObject(player) && UTILS.getDist(t, near, 0, 2) <= (near.scale + t.getScale() + 5));
                                if (nearEnemyTrap && near.dist2 <= 150 && UTILS.getDist(building, nearEnemyTrap, 0, 0) <= 169) {
                                    const spikePlan = getKbiSpikePlan(near.aim2, Math.PI / 2, Math.PI / 32, true);
                                    this.testCanPlace(2, 0, 0.000001, 1, spikePlan ? spikePlan.dir : near.aim2, 1, 1, true);
                                    placed = true;
                                    break;
                                }

                                let danger = this.checkSpikeTick();
                                const spikePlan = getKbiSpikePlan(breakDir, Math.PI * 2, Math.PI / 24, !danger);
                                if (!danger && spikePlan && near.dist2 <= items.weapons[near.primaryIndex || 5].range + (near.scale * 1.8)) {
                                    this.testCanPlace(2, 0, 0.000001, 1, spikePlan.dir, 1, null, true);
                                    placed = true;
                                } else {
                                    player.items[4] == 15 && !getSpikeTickReserve() && this.testCanPlace(4, 0, Math.PI * 2, Math.PI / 3, breakDir, 1);
                                    placed = true;
                                }
                                break;
                            }
                            return placed;
                        };
                        this.replacer = function (findObj) {
                            if (!findObj || !configs.autoReplace) return;
                            if (!inGame) return;
                            if (this.antiTrapped) return;
                            game.tickBase(() => {
                                let objAim = UTILS.getDirect(findObj, player, 0, 2);
                                let objDst = UTILS.getDist(findObj, player, 0, 2);
                                if (getEl("weaponGrind").checked && objDst <= items.weapons[player.weaponIndex].range + player.scale) return;
                                if (objDst <= 400 && near.dist2 <= 400) {
                                    let danger = this.checkSpikeTick();
                                    const spikePlan = getKbiSpikePlan(objAim, Math.PI * 2, Math.PI / 24, !danger);
                                    if (!danger && spikePlan && near.dist2 <= items.weapons[near.primaryIndex || 5].range + (near.scale * 1.8)) {
                                        //this.testCanPlace(2, -(Math.PI / 2), (Math.PI / 2), (Math.PI / 18), objAim, 1);
                                        this.testCanPlace(2, 0, 0.000001, 1, spikePlan.dir, 1, null, true);
                                    } else {
                                        player.items[4] == 15 && !getSpikeTickReserve() && this.testCanPlace(4, 0, (Math.PI * 2), (Math.PI / 24), objAim, 1);
                                    }
                                    this.replaced = true;
                                }
                            }, 1);
                        };
                    }
                }
