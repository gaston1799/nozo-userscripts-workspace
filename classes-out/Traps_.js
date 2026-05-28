class Traps_ {
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
                            };
                            preObj.x = player.x2 + (player.scale + preObj.scale + (item.placeOffset || 0)) * Math.cos(preObj.dir);
                            preObj.y = player.y2 + (player.scale + preObj.scale + (item.placeOffset || 0)) * Math.sin(preObj.dir);
                            return preObj;
                        };
                        this.radCalc = function (obj, direct, item, type) {
                            let preObj = this.createObj(item, direct);
                            let getScale = obj.getScale(0.6, obj.isItem);
                            let dist = UTILS.getDist(obj, preObj, 0, 0);
                            let scale = getScale + preObj.scale;
                            let angles = [];
                            if (dist < scale) {
                                let calc = Math.acos(Math.min(1, dist / scale));
                                let sum = [calc, -calc];
                                for (let i = 0; i < sum.length; i++) {
                                    let angle = direct + sum[i];
                                    preObj = this.createObj(item, angle);
                                    let nears = this.preplaces[1].length ? this.preplaces[1].some(pos => UTILS.getDist(pos, preObj, 0, 0) < pos.scale + preObj.scale) : false;
                                    if (nears) continue;
                                    let renears = this.preplaces[0].length ? this.preplaces[0].some(pos => UTILS.getDist(pos, preObj, 0, 0) < pos.scale + preObj.scale) : false;
                                    if (renears) continue;
                                    let canPlace = objectManager.checkItemLocation(preObj.x, preObj.y, preObj.scale, 0.6, preObj.id, false);
                                    if (canPlace) {
                                        angles.push(angle);
                                        this.preplaces[1].push(preObj);
                                    }
                                }
                            } else {
                                if (type) return [];
                                preObj = this.createObj(item, direct);
                                let nears = this.preplaces[1].length ? this.preplaces[1].some(pos => UTILS.getDist(pos, preObj, 0, 0) < pos.scale + preObj.scale) : false;
                                if (nears) return [];
                                let renears = this.preplaces[0].length ? this.preplaces[0].some(pos => UTILS.getDist(pos, preObj, 0, 0) < pos.scale + preObj.scale) : false;
                                if (renears) return [];
                                let canPlace = objectManager.checkItemLocation(preObj.x, preObj.y, preObj.scale, 0.6, preObj.id, false);
                                if (canPlace) {
                                    angles.push(direct);
                                    this.preplaces[1].push(preObj);
                                }
                            }
                            return angles;
                        };
                        this.testCanPlace = function (id, first = -(Math.PI / 2), repeat = (Math.PI / 2), plus = (Math.PI / 18), radian, replacer, yaboi) {
                            try {
                                let item = items.list[player.items[id]];
                                let tmpS = player.scale + item.scale + (item.placeOffset || 0);
                                let counts = {
                                    attempts: 0,
                                    placed: 0
                                };
                                const offsets = [];
                                const step = Math.abs(plus) || (Math.PI / 18);
                                const spanStart = Math.min(first, repeat);
                                const spanEnd = Math.max(first, repeat);
                                const spanSize = spanEnd - spanStart;
                                const isSymmetricFan = spanStart < 0 && spanEnd > 0;
                                const isFullCircleFan = Math.abs(spanStart) < 1e-6 && Math.abs(spanEnd - (Math.PI * 2)) < (step * 1.5);

                                if (isFullCircleFan) {
                                    offsets.push(0);
                                    for (let n = 1; n * step <= Math.PI + 1e-6; n++) {
                                        offsets.push(n * step, -(n * step));
                                    }
                                } else if (isSymmetricFan) {
                                    offsets.push(0);
                                    for (let n = 1; n * step <= Math.max(Math.abs(spanStart), Math.abs(spanEnd)) + 1e-6; n++) {
                                        const off = n * step;
                                        if (off <= spanEnd + 1e-6) offsets.push(off);
                                        if (-off >= spanStart - 1e-6) offsets.push(-off);
                                    }
                                } else {
                                    for (let i = spanStart; i < spanEnd; i += step) {
                                        offsets.push(i);
                                    }
                                }

                                for (let oi = 0; oi < offsets.length; oi++) {
                                    const i = offsets[oi];
                                    counts.attempts++;
                                    let relAim = radian + i;
                                    let tmpX = player.x2 + tmpS * Math.cos(relAim);
                                    let tmpY = player.y2 + tmpS * Math.sin(relAim);
                                    if (!objectManager.checkItemLocation(tmpX, tmpY, item.scale, 0.6, item.id, false, player)) continue;
                                    if (item.id != 19 && tmpY >= config.mapScale / 2 - config.riverWidth / 2 && tmpY <= config.mapScale / 2 + config.riverWidth / 2) continue;
                                    if ((!replacer && yaboi) || useWasd) {
                                        if (useWasd ? false : yaboi.inTrap) {
                                            if (UTILS.getAngleDist(near.aim2 + Math.PI, relAim + Math.PI) <= Math.PI) {
                                                place(2, relAim, 1);
                                            } else {
                                                player.items[4] == 15 && place(4, relAim, 1);
                                            }
                                        } else {
                                            if (UTILS.getAngleDist(near.aim2, relAim) <= config.gatherAngle / 1.5) {
                                                place(2, relAim, 1);
                                            } else {
                                                player.items[4] == 15 && place(4, relAim, 1);
                                            }
                                        }
                                    } else {
                                        place(id, relAim, 1);
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
                                logCaughtError("catch@20456", err);
                            }
                        };

                        this.checkSpikeTick = function () {
                            let noOfSpikes = 0;
                            let dontForceSoldier = false;
                            if (!getEl("safeAntiSpikeTick")?.checked || !enemy.length) return false;
                            if (near.dist2 <= 175) {
                                if (traps.inTrap && traps.info && traps.info.health <= items.weapons[player.weapons[0]].dmg * 3.3 * config.weaponVariants[player.primaryVariant].val * (items.weapons[player.weapons[0]].sDmg || 1)) {
                                    noOfSpikes++;
                                    dontForceSoldier = true;
                                    my.bullTick = false;
                                } else {
                                    my.bullTick = true;
                                }
                                if (!traps.inTrap) {
                                    if (near.reloads[near.primaryIndex] <= game.tickRate) {
                                        let spikeSet = new Set();
                                        for (let tmp of gameObjects) {
                                            if ((tmp.dmg && tmp.active && !tmp.isTeamObject(player)) || (tmp.type == 1 && tmp.y >= 12000)) {
                                                let nea = Math.atan2(player.y2 - near.y2, player.x2 - near.x2);
                                                let primaryKB = (items.weapons[near.weapons[0]].knock || 0) * items.weapons[near.weapons[0]].range + player.scale * 2;
                                                let secondaryKB = ![undefined, 9, 12, 13, 15].includes(near.weapons[1]) ? (items.weapons[near.weapons[1]].knock || 0) * items.weapons[near.weapons[1]].range + player.scale * 2 : 60;
                                                let turretKB = 69;
                                                let totalKB = primaryKB + secondaryKB + turretKB;
                                                let steps = 13;
                                                let stepKB = totalKB / steps;
                                                let skipDistance = 40;
                                                for (let i = 1; i <= steps; i++) {
                                                    let traveledDist = stepKB * i;
                                                    if (traveledDist < skipDistance) continue;
                                                    let stepX = player.x2 + (stepKB * i) * Math.cos(nea);
                                                    let stepY = player.y2 + (stepKB * i) * Math.sin(nea);
                                                    let distToSpike = UTILS.getDist({ x: stepX, y: stepY }, tmp, 0, 0);
                                                    if (distToSpike <= (tmp.scale + player.scale * 1.5)) {
                                                        if (!spikeSet.has(tmp.sid)) spikeSet.add(tmp.sid);
                                                    }
                                                }
                                            }
                                        }
                                        noOfSpikes += spikeSet.size;
                                        if (![3, 4, 5].includes(near.primaryIndex)) dontForceSoldier = true;
                                    }
                                }
                            }
                            return [noOfSpikes, dontForceSoldier];
                        };
                        this.protect = function (aim) {
                            sendChat("");
                            if (!configs.antiTrap) return;
                            this.testCanPlace(4, -(Math.PI / 2), (Math.PI / 2), (Math.PI / 5), aim + Math.PI);
                            this.testCanPlace(2, -(Math.PI / 3), (Math.PI / 3), (Math.PI / 3), aim + Math.PI);
                            this.antiTrapped = true;
                        };
                        /*this.autoPlace = function() {
                        if (enemy.length && configs.autoPlace && !instaC.ticking) {
                            if (game.tick % (Math.max(1, parseInt(_elAutoPlaceTick.value)) || 1) === 0) {
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
                            let tmpX = player.x + tmpS * Math.cos(dir);
                            let tmpY = player.y + tmpS * Math.sin(dir);
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
                                logCaughtError("catch@20626", e);
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
                            if (!enemy.length) return false;
                            if (!configs.autoPlace) return false;
                            if (instaC.ticking) return false;
                            if (game.tick % (Math.max(1, parseInt(_elAutoPlaceTick.value)) || 1) !== 0) return false;

                            let placed = false;

                            if (type == 0) {
                                if (id == undefined) return false;
                                let itemId = player.items[id];
                                if (itemId == undefined) return false;
                                let item = items.list[itemId];
                                let itemId2 = id2 == undefined ? null : player.items[id2];
                                let item2 = itemId2 == undefined ? null : items.list[itemId2];

                                this.radObjs = nearObjs.filter(obj => obj.active && UTILS.getDist(obj, player, 0, 2) < 300);

                                console.log("[autoPlace:type0] radObjs:", this.radObjs.length, {
                                    id,
                                    id2,
                                    itemId,
                                    itemId2,
                                    nearDist: near.dist2,
                                    nearAim: near.aim2,
                                    reasonhaha,
                                    radObjs: this.radObjs
                                });

                                if (this.radObjs.length) {
                                    for (let i = 0; i < this.radObjs.length; i++) {
                                        let obj = this.radObjs[i];
                                        let direct = UTILS.getDirect(obj, player, 0, 2);
                                        let placeAngles = this.radCalc(obj, direct, item);

                                        console.log("[autoPlace:type0] obj result:", {
                                            obj,
                                            direct,
                                            placeAngles,
                                            itemId
                                        });

                                        if (placeAngles.length) {
                                            for (let j = 0; j < placeAngles.length; j++) {
                                                place(id, placeAngles[j]);
                                                placed = true;

                                                console.log("[autoPlace:type0] placed primary:", {
                                                    id,
                                                    angle: placeAngles[j]
                                                });
                                            }
                                        } else if (item2) {
                                            let direct2 = UTILS.getDirect(obj, player, 0, 2);
                                            let placeAngles2 = this.radCalc(obj, direct2, item2);

                                            console.log("[autoPlace:type0] trying secondary:", {
                                                id2,
                                                itemId2,
                                                direct2,
                                                placeAngles2
                                            });

                                            for (let j = 0; j < placeAngles2.length; j++) {
                                                place(id2, placeAngles2[j]);
                                                placed = true;

                                                console.log("[autoPlace:type0] placed secondary:", {
                                                    id2,
                                                    angle: placeAngles2[j]
                                                });
                                            }
                                        }
                                    }
                                } else {
                                    console.log("[autoPlace:type0] no radObjs, using checkPlace fallback");

                                    for (let i = 0; i < Math.PI * 2; i += Math.PI / 2) {
                                        let angle = near.aim2 + i;
                                        let didPlace = checkPlace(id, angle);

                                        console.log("[autoPlace:type0] fallback checkPlace:", {
                                            id,
                                            angle,
                                            didPlace
                                        });

                                        if (didPlace) placed = true;
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

                                console.log("[autoPlace:type1] radObjs:", this.radObjs.length, {
                                    id,
                                    id2,
                                    itemId,
                                    nearDist: near.dist2,
                                    nearAim: near.aim2,
                                    nearPos: {
                                        x: near.x2,
                                        y: near.y2
                                    },
                                    nest: this.nest,
                                    reasonhaha,
                                    preplaces0: this.preplaces[0].length,
                                    preplaces1: this.preplaces[1].length,
                                    radObjs: this.radObjs
                                });

                                if (this.radObjs.length) {
                                    for (let i = 0; i < this.radObjs.length; i++) {
                                        let obj = this.radObjs[i];
                                        let direct = UTILS.getDirect(obj, player, 0, 2);
                                        let placeAngles = this.radCalc(obj, direct, item, 1);

                                        console.log("[autoPlace:type1] obj result:", {
                                            obj,
                                            direct,
                                            placeAngles,
                                            itemId
                                        });

                                        for (let j = 0; j < placeAngles.length; j++) {
                                            place(id, placeAngles[j]);
                                            placed = true;

                                            console.log("[autoPlace:type1] placed:", {
                                                id,
                                                angle: placeAngles[j]
                                            });
                                        }
                                    }
                                } else {
                                    console.log("[autoPlace:type1] no radObjs found", {
                                        id,
                                        id2,
                                        itemId,
                                        nearObjsLength: nearObjs.length,
                                        reasonhaha
                                    });
                                }

                                if (reasonhaha && this.preplaces[1].length < 1) {
                                    console.log("[autoPlace:type1] fallback recursion triggered:", {
                                        fromId: id,
                                        toId: id2
                                    });

                                    if (this.autoPlace(1, id2, id, false)) placed = true;
                                }
                            }

                            console.log("[autoPlace:end]", {
                                type,
                                id,
                                id2,
                                placed
                            });

                            return placed;
                        };
                        this.autoPlace_ = function (type, id, id2, reasonhaha) {
                            if (!enemy.length) return false;
                            if (!configs.autoPlace) return false;
                            if (instaC.ticking) return false;
                            if (game.tick % (Math.max(1, parseInt(_elAutoPlaceTick.value)) || 1) !== 0) return false;

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
                                                place(id, placeAngles[j]);
                                                placed = true;
                                            }
                                        } else if (item2) {
                                            let direct2 = UTILS.getDirect(obj, player, 0, 2);
                                            let placeAngles2 = this.radCalc(obj, direct2, item2);
                                            for (let j = 0; j < placeAngles2.length; j++) {
                                                place(id2, placeAngles2[j]);
                                                placed = true;
                                            }
                                        }
                                    }
                                } else {
                                    for (let i = 0; i < Math.PI * 2; i += Math.PI / 2) {
                                        if (checkPlace(id, near.aim2 + i)) placed = true;
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
                                });
                                if (this.radObjs.length) {
                                    for (let i = 0; i < this.radObjs.length; i++) {
                                        let obj = this.radObjs[i];
                                        let direct = UTILS.getDirect(obj, player, 0, 2);
                                        let placeAngles = this.radCalc(obj, direct, item, 1);
                                        for (let j = 0; j < placeAngles.length; j++) {
                                            place(id, placeAngles[j]);
                                            placed = true;
                                        }
                                    }
                                }
                                if (reasonhaha && this.preplaces[1].length < 1) {
                                    if (this.autoPlace(1, id2, id, false)) placed = true;
                                }
                            }

                            return placed;
                        };
                        this.autoReplace = function (sidList) {
                            if (!enemy.length) return;
                            if (near.dist2 > 300) return;
                            if (!configs.autoReplace) return;
                            if (getEl("weaponGrind")?.checked) return;

                            for (let i = 0; i < sidList.length; i++) {
                                let sid = sidList[i];
                                let building = findObjectBySid(sid);
                                if (!building) continue;
                                let breakDist = UTILS.getDist(building, player, 0, 2);
                                if (breakDist > 300) continue;
                                let breakDir = UTILS.getDirect(building, player, 0, 2);

                                // enemy in nearby trap → dense spike sweep
                                let nearEnemyTrap = gameObjects.find(t => t.trap && t.active && t.isTeamObject(player) && UTILS.getDist(t, near, 0, 2) <= (near.scale + t.getScale() + 5));
                                if (nearEnemyTrap && near.dist2 <= 150 && UTILS.getDist(building, nearEnemyTrap, 0, 0) <= 169) {
                                    this.testCanPlace(2, near.aim2 - Math.PI / 2, near.aim2 + Math.PI / 2 + 0.0001, Math.PI / 32, near.aim2, 1, 1);
                                    break;
                                }

                                // default: trap fan around broken building direction
                                this.testCanPlace(4, 0, Math.PI * 2, Math.PI / 3, breakDir, 1);
                                break;
                            }
                        };
                    }
                }
