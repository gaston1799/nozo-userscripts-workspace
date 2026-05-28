class Player {
                    constructor(id, sid, config, UTILS, projectileManager, objectManager, players, ais, items, hats, accessories, server, scoreCallback, iconCallback) {
                        this.id = id;
                        this.sid = sid;
                        this.tmpScore = 0;
                        this.team = null;
                        this.latestSkin = 0;
                        this.oldSkinIndex = 0;
                        this.skinIndex = 0;
                        this.latestTail = 0;
                        this.oldTailIndex = 0;
                        this.tailIndex = 0;
                        this.hitTime = 0;
                        this.lastHit = 0;
                        this.tails = {};
                        for (let i = 0; i < accessories.length; ++i) {
                            if (accessories[i].price <= 0)
                                this.tails[accessories[i].id] = 1;
                        }
                        this.skins = {};
                        for (let i = 0; i < hats.length; ++i) {
                            if (hats[i].price <= 0)
                                this.skins[hats[i].id] = 1;
                        }
                        this.points = 0;
                        this.dt = 0;
                        this.hidden = false;
                        this.itemCounts = {};
                        this.isPlayer = true;
                        this.pps = 0;
                        this.moveDir = undefined;
                        this.skinRot = 0;
                        this.lastPing = 0;
                        this.iconIndex = 0;
                        this.skinColor = 0;
                        this.dist2 = 0;
                        this.aim2 = 0;
                        this.maxSpeed = 1;
                        this.chat = {
                            message: null,
                            count: 0
                        };
                        this.backupNobull = true;
                        this.circle = false;
                        this.circleRad = 200;
                        this.circleRadSpd = 0.1;
                        this.cAngle = 0;

                        // SPAWN:
                        this.spawn = function (moofoll) {
                            this.attacked = false;
                            this.death = false;
                            this.spinDir = 0;
                            this.sync = false;
                            this.antiBull = 0;
                            this.bullTimer = 0;
                            this.poisonTimer = 0;
                            this.active = true;
                            this.alive = true;
                            this.lockMove = false;
                            this.lockDir = false;
                            this.minimapCounter = 0;
                            this.chatCountdown = 0;
                            this.shameCount = 0;
                            this.shameTimer = 0;
                            this.sentTo = {};
                            this.gathering = 0;
                            this.gatherIndex = 0;
                            this.shooting = {};
                            this.shootIndex = 9;
                            this.autoGather = 0;
                            this.animTime = 0;
                            this.animSpeed = 0;
                            this.mouseState = 0;
                            this.buildIndex = -1;
                            this.weaponIndex = 0;
                            this.weaponCode = 0;
                            this.weaponVariant = 0;
                            this.primaryIndex = undefined;
                            this.secondaryIndex = undefined;
                            this.dmgOverTime = {};
                            this.noMovTimer = 0;
                            this.maxXP = 300;
                            this.XP = 0;
                            this.age = 1;
                            this.kills = 0;
                            this.upgrAge = 2;
                            this.upgradePoints = 0;
                            this.x = 0;
                            this.y = 0;
                            this.oldXY = {
                                x: 0,
                                y: 0
                            };
                            this.zIndex = 0;
                            this.xVel = 0;
                            this.yVel = 0;
                            this.slowMult = 1;
                            this.dir = 0;
                            this.dirPlus = 0;
                            this.targetDir = 0;
                            this.targetAngle = 0;
                            this.maxHealth = 100;
                            this.health = this.maxHealth;
                            this.oldHealth = this.maxHealth;
                            this.damaged = 0;
                            this.scale = config.playerScale;
                            this.speed = config.playerSpeed;
                            this.resetMoveDir();
                            this.resetResources(moofoll);
                            this.items = [0, 3, 6, 10];
                            this.weapons = [0];
                            this.shootCount = 0;
                            this.weaponXP = [];
                            this.reloads = {
                                0: 0,
                                1: 0,
                                2: 0,
                                3: 0,
                                4: 0,
                                5: 0,
                                6: 0,
                                7: 0,
                                8: 0,
                                9: 0,
                                10: 0,
                                11: 0,
                                12: 0,
                                13: 0,
                                14: 0,
                                15: 0,
                                53: 0,
                            };
                            this.bowThreat = {
                                9: 0,
                                12: 0,
                                13: 0,
                                15: 0,
                            };
                            this.damageThreat = 0;
                            this.inTrap = false;
                            this.canEmpAnti = false;
                            this.empAnti = false;
                            this.soldierAnti = false;
                            this.poisonTick = 0;
                            this.bullTick = 0;
                            this.setPoisonTick = false;
                            this.setBullTick = false;
                            this.antiTimer = 2;
                        };

                        // RESET MOVE DIR:
                        this.resetMoveDir = function () {
                            this.moveDir = undefined;
                        };

                        // RESET RESOURCES:
                        this.resetResources = function (moofoll) {
                            for (let i = 0; i < config.resourceTypes.length; ++i) {
                                this[config.resourceTypes[i]] = moofoll ? 100 : 0;
                            }
                        };

                        // ADD ITEM:
                        this.getItemType = function (id) {
                            let findindx = this.items.findIndex((ids) => ids == id);
                            if (findindx != -1) {
                                return findindx;
                            } else {
                                return items.checkItem.index(id, this.items);
                            }
                        };

                        // SET DATA:
                        this.setDataOld = function (data) {
                            this.id = data[0];
                            this.sid = data[1];
                            this.name = data[2];
                            this.x = data[3];
                            this.y = data[4];
                            this.dir = data[5];
                            this.health = data[6];
                            this.maxHealth = data[7];
                            this.scale = data[8];
                            this.skinColor = data[9];
                        };

                        // UPDATE POISON TICK:
                        this.updateTimer = function () {

                            this.bullTimer -= 1;
                            if (this.bullTimer <= 0) {
                                this.setBullTick = false;
                                this.bullTick = game.tick - 1;
                                this.bullTimer = config.serverUpdateRate;
                            }
                            this.poisonTimer -= 1;
                            if (this.poisonTimer <= 0) {
                                this.setPoisonTick = false;
                                this.poisonTick = game.tick - 1;
                                this.poisonTimer = config.serverUpdateRate;
                            }

                        };
                        this.update = function (delta) {
                            if (this.sid == playerSID) {
                                this.circleRad = parseInt(getEl("circleRad").value) || 0;
                                this.circleRadSpd = parseFloat(getEl("radSpeed").value) || 0;
                                this.cAngle += this.circleRadSpd;
                            }
                            if (this.active) {

                                // MOVE:
                                let gear = {
                                    skin: findID(hats, this.skinIndex),
                                    tail: findID(accessories, this.tailIndex)
                                }
                                let spdMult = ((this.buildIndex >= 0) ? 0.5 : 1) * (items.weapons[this.weaponIndex].spdMult || 1) * (gear.skin ? (gear.skin.spdMult || 1) : 1) * (gear.tail ? (gear.tail.spdMult || 1) : 1) * (this.y <= config.snowBiomeTop ? ((gear.skin && gear.skin.coldM) ? 1 : config.snowSpeed) : 1) * this.slowMult;
                                this.maxSpeed = spdMult;

                            }
                        };

                        let tmpRatio = 0;
                        let animIndex = 0;
                        this.animate = function (delta) {
                            if (this.animTime > 0) {
                                this.animTime -= delta;
                                if (this.animTime <= 0) {
                                    this.animTime = 0;
                                    this.dirPlus = 0;
                                    tmpRatio = 0;
                                    animIndex = 0;
                                } else {
                                    if (animIndex == 0) {
                                        tmpRatio += delta / (this.animSpeed * config.hitReturnRatio);
                                        this.dirPlus = UTILS.lerp(0, this.targetAngle, Math.min(1, tmpRatio));
                                        if (tmpRatio >= 1) {
                                            tmpRatio = 1;
                                            animIndex = 1;
                                        }
                                    } else {
                                        tmpRatio -= delta / (this.animSpeed * (1 - config.hitReturnRatio));
                                        this.dirPlus = UTILS.lerp(0, this.targetAngle, Math.max(0, tmpRatio));
                                    }
                                }
                            }
                        };

                        // GATHER ANIMATION:
                        this.startAnim = function (didHit, index) {
                            this.animTime = this.animSpeed = items.weapons[index].speed;
                            this.targetAngle = (didHit ? -config.hitAngle : -Math.PI);
                            tmpRatio = 0;
                            animIndex = 0;
                        };

                        // CAN SEE:
                        this.canSee = function (other) {
                            if (!other) return false;
                            let dx = Math.abs(other.x - this.x) - other.scale;
                            let dy = Math.abs(other.y - this.y) - other.scale;
                            return dx <= (config.maxScreenWidth / 2) * 1.3 && dy <= (config.maxScreenHeight / 2) * 1.3;
                        };

                        // SHAME SYSTEM:
                        this.judgeShame = function () {
                            if (this.oldHealth < this.health) {
                                if (this.hitTime) {
                                    let timeSinceHit = game.tick - this.hitTime;
                                    this.lastHit = game.tick;
                                    this.hitTime = 0;
                                    if (timeSinceHit < 2) {
                                        this.shameCount++;
                                    } else {
                                        this.shameCount = Math.max(0, this.shameCount - 2);
                                    }
                                }
                            } else if (this.oldHealth > this.health) {
                                this.hitTime = game.tick;
                            }
                        };
                        this.addShameTimer = function () {
                            this.shameCount = 0;
                            this.shameTimer = 30;
                            let interval = setInterval(() => {
                                this.shameTimer--;
                                if (this.shameTimer <= 0) {
                                    clearInterval(interval);
                                }
                            }, 1000);
                        };

                        // CHECK TEAM:
                        this.isTeam = function (tmpObj) {
                            return (this == tmpObj || (this.team && this.team == tmpObj.team));
                        };
                        this.checkPlace = checkPlace
                        // FOR THE PLAYER:
                        this.findAllianceBySid = function (sid) {
                            return this.team ? alliancePlayers.find((THIS) => THIS === sid) : null;
                        };
                        this.checkCanInsta = function (nobull) {
                            let totally = 0;
                            if (this.alive && inGame) {
                                let primary = {
                                    weapon: this.weapons[0],
                                    variant: this.primaryVariant,
                                    dmg: this.weapons[0] == undefined ? 0 : items.weapons[this.weapons[0]].dmg,
                                };
                                let secondary = {
                                    weapon: this.weapons[1],
                                    variant: this.secondaryVariant,
                                    dmg: this.weapons[1] == undefined ? 0 : items.weapons[this.weapons[1]].Pdmg,
                                };
                                let bull = this.skins[7] && !nobull ? 1.5 : 1;
                                let pV = primary.variant != undefined ? config.weaponVariants[primary.variant].val : 1;
                                if (primary.weapon != undefined && this.reloads[primary.weapon] == 0) {
                                    totally += primary.dmg * pV * bull;
                                }
                                if (secondary.weapon != undefined && this.reloads[secondary.weapon] == 0) {
                                    totally += secondary.dmg;
                                }
                                if (this.skins[53] && this.reloads[53] <= (player.weapons[1] == 10 ? 0 : game.tickRate) && near.skinIndex != 22) {
                                    totally += 25;
                                }
                                totally *= near.skinIndex == 6 ? 0.75 : 1;
                                return totally;
                            }
                            return 0;
                        };

                        // UPDATE WEAPON RELOAD:

                        this.manageReload = function () {
                            // PREPLACER
                            if (this.reloads[this.weaponIndex] <= 1000 / 9) {
                                // place(2, getAttackDir());
                                let index = this.weaponIndex;
                                let nearObja = liztobj.filter((e) => (e.active || e.alive) && e.health < e.maxHealth && e.group !== undefined && UTILS.getDist(e, player, 0, 2) <= (items.weapons[player.weaponIndex].range + e.scale));
                                for (let i = 0; i < nearObja.length; i++) {
                                    let aaa = nearObja[i];

                                    let val = items.weapons[index].dmg * (config.weaponVariants[tmpObj[(index < 9 ? "prima" : "seconda") + "ryVariant"]].val) * (items.weapons[index].sDmg || 1) * 3.3;
                                    let valaa = items.weapons[index].dmg * (config.weaponVariants[tmpObj[(index < 9 ? "prima" : "seconda") + "ryVariant"]].val) * (items.weapons[index].sDmg || 1);
                                    if (aaa.health - (valaa) <= 0 && near.length) {
                                        place(near.dist2 < ((near.scale * 1.8) + 50) ? 4 : 2, caf(aaa, player) + Math.PI)
                                        console.log("preplaced");
                                    }
                                }
                            }
                            if (this.shooting[53]) {
                                this.shooting[53] = 0;
                                this.reloads[53] = (2500 - game.tickRate);
                            } else {
                                if (this.reloads[53] > 0) {
                                    this.reloads[53] = Math.max(0, this.reloads[53] - game.tickRate);
                                }
                            }
                            if (this.gathering || this.shooting[1]) {
                                if (this.gathering) {
                                    this.gathering = 0;
                                    this.reloads[this.gatherIndex] = (items.weapons[this.gatherIndex].speed * (this.skinIndex == 20 ? 0.78 : 1));
                                    this.attacked = true;
                                }
                                if (this.shooting[1]) {
                                    this.shooting[1] = 0;
                                    this.reloads[this.shootIndex] = (items.weapons[this.shootIndex].speed * (this.skinIndex == 20 ? 0.78 : 1));
                                    this.attacked = true;
                                }
                            } else {
                                this.attacked = false;
                                if (this.buildIndex < 0) {
                                    if (this.reloads[this.weaponIndex] > 0) {
                                        this.reloads[this.weaponIndex] = Math.max(0, this.reloads[this.weaponIndex] - game.tickRate);
                                        if (this == player) {
                                            const usingTP = _things.player.items.includes(22);
                                            const stopped = usingTP
                                                ? (autoGo && _things.player.x2 === _things.player.x && _things.player.y2 === _things.player.y)
                                                : true;
                                            function getCircleAngles(placements) {
                                                // Returns an array of evenly spaced angles (radians) for a circle
                                                let out = [];
                                                for (let i = 0; i < placements; i++) {
                                                    out.push((Math.PI * 2) * (i / placements));
                                                }
                                                return out;
                                            }

                                            // only grind when checkboxâ€™s lit AND (botmode off OR weâ€™ve teleported & stopped)
                                            if (getEl("weaponGrind").checked && (!autoGo || stopped) && this.reloads[this.weaponIndex] <= pingTime) {
                                                console.log(this.reloads[this.weaponIndex])
                                                const itemType = player.getItemType(22);
                                                // angles: top, right, bottom, left
                                                var placements = 2, angles = usingTP ? this.weaponIndex == 10 ? [0] : [-1.33, 0] : getCircleAngles(8)
                                                if (usingTP && !autoGo) {
                                                    packet('D', rubyDir)
                                                }
                                                angles.forEach(angle => checkPlace(itemType, angle));
                                            }
                                        }
                                        if (this.reloads[this.primaryIndex] == 0 && this.reloads[this.weaponIndex] == 0) {
                                            this.antiBull++;
                                            game.tickBase(() => {
                                                this.antiBull = 0;
                                            }, 1);
                                        }
                                    }
                                }
                            }
                            //preplacer
                            if ((this.reloads[this.weaponIndex] <= 1000 / 9) || (this.reloads[this.weaponIndex] <= pingTime)) { //auto preplace
                                // place(2, getAttackDir());
                                let index = this.weaponIndex;
                                let nearObja = liztobj.filter((e) => (e.active || e.alive) && e.health < e.maxHealth && e.group !== undefined && UTILS.getDist(e, player, 0, 2) <= (items.weapons[player.weaponIndex].range + e.scale));
                                for (let i = 0; i < nearObja.length; i++) {
                                    let aaa = nearObja[i];

                                    let val = items.weapons[index].dmg * (config.weaponVariants[tmpObj[(index < 9 ? "prima" : "seconda") + "ryVariant"]].val) * (items.weapons[index].sDmg || 1) * 3.3;
                                    let valaa = items.weapons[index].dmg * (config.weaponVariants[tmpObj[(index < 9 ? "prima" : "seconda") + "ryVariant"]].val) * (items.weapons[index].sDmg || 1);
                                    if (aaa.health - (valaa) <= 0 && near.length) {
                                        place(near.dist2 < ((near.scale * 1.8) + 50) ? 4 : 2, caf(aaa, player) + Math.PI);
                                    }
                                }
                            }
                        };
                        this.validateBuilding = (e) => {
                            if (UTILS.getDistance(player, e) > 100 + e.scale * 2) {
                                return false;
                            }
                            if (!e.currentHealth) {
                                return;
                            }
                            let t = 0;
                            for (let i = 0; i < players.length; i++) {
                                let s = players[i];
                                if (s.visible && UTILS.getDistance(s, e) <= 100 + e.scale * 2) {
                                    let n = s.secondaryWeapon == 10 ? 10 : s.primaryWeapon;
                                    let a = config.weaponVariants[n == 10 ? s.secondaryVariant : s.primaryVariant].val;
                                    let l = items.weapons[n];
                                    let o = l.dmg * (l.sDmg || 1) * (a || 1);
                                    if (playerSID == s.sid) {
                                        if (s.skins[40]) {
                                            o *= 3.3;
                                        }
                                    } else {
                                        o *= 3.3;
                                    }
                                    if (!!(UTILS.getDistance(s, e) - e.scale < l.range) && healer.reloadPercent(s, n) == 1 && (!e.trap || !e.hideFromEnemy)) {
                                        t += o;
                                    }
                                }
                            }
                            return e.currentHealth <= t;
                        }
                        this.findOpenAngles = function (e) {
                            let t = Math.PI / parseInt(16);
                            let i = [0, Math.PI];
                            let s = player.items[2];
                            let n = items.list[s];
                            let a = items.list[15];
                            let l = [];
                            let o = Math.max(n.scale, a.scale);
                            let r = game.closeObjects.filter(e => e.active && UTILS.getDistance(e, player) <= 35 + o + e.scale);
                            for (let c = 0; c <= Math.PI; c += t) {
                                for (let d = 0; d < i.length; d++) {
                                    let p = c + i[d];
                                    this.validateOpenAngle(p, l, e, r);
                                }
                            }
                            if (false) {//scriptMenu.toggles.dualAngleFinder) {
                                for (let h = 0; h < r.length; h++) {
                                    let g = r[h];
                                    let $ = r[(h + 1) % r.length];
                                    if (g && $) {
                                        let m = UTILS.getDirection(g, player);
                                        let u = UTILS.getDirection($, player);
                                        if (m < 0) {
                                            m += Math.PI * 2;
                                        }
                                        if (u < 0) {
                                            u += Math.PI * 2;
                                        }
                                        let f = (m + u) / 2;
                                        if (Math.abs(m - u) > Math.PI && (f += Math.PI) > Math.PI * 2) {
                                            f -= Math.PI * 2;
                                        }
                                        this.validateOpenAngle(f, l, e, r);
                                    }
                                }
                            }
                            return l.sort((e, t) => e.enemyDist - t.enemyDist).sort((e, t) => e.brokenDist - t.brokenDist).sort((e, t) => t.prioritization - e.prioritization);
                        }
                        this.preplacer = function () {
                            let e = liztobj.filter(e => e.active && this.validateBuilding(e));
                            if (!e.length) {
                                return;
                            }

                            e = this.validateClashWithEnemy(e);
                            let t = this.findOpenAngles(e);
                            let i = liztobj.filter(e => e.active && e.trap && e.isTeamObject(player) && UTILS.getDistance(e, player) <= 300);

                            for (let s = 0; s < t.length; s++) {
                                let n = t[s];
                                let a = n.enemy;
                                let l = a.trap;
                                let o = UTILS.getDistance(a, player);

                                if (l && n.spike) {
                                    if (UTILS.getDistance(n.pos.spike, l) <= 130) {
                                        this.checkPlace(player.items[2], n.angle, true, a);
                                        if (this.preplacements > 2) break;
                                    } else if (n.trap && this.checkPlace(player.items[4], n.angle, undefined, a)) {
                                        if (this.preplacements > 2) break;
                                    }
                                } else if (o <= 200) {
                                    if (n.spike) {
                                        let r = n.pos.spike;
                                        if (UTILS.getDistance(r, a) <= 100) {
                                            let c = kbSimulator.spikeKB({
                                                x: a.x2,
                                                y: a.y2,
                                                scale: 35,
                                                tmpObj: a
                                            }, r, true);

                                            let d = () => this.checkPlace(player.items[2], n.angle, true, a);
                                            if (c.data.some(e => e.id == "trap")) {
                                                d();
                                                if (this.preplacements > 2) break;
                                            } else if (c.data.some(e => e.id == "spiek")) {
                                                let totalDamage = c.data.filter(e => e.id == "spiek").reduce((sum, t) => sum + t.dmg, 0) + r.dmg;
                                                if (totalDamage >= 100) {
                                                    d();
                                                    if (this.preplacements > 2) break;
                                                } else if (n.trap && this.checkPlace(player.items[4], n.angle, undefined, a)) {
                                                    if (this.preplacements > 2) break;
                                                }
                                            } else if (n.trap && this.checkPlace(player.items[4], n.angle, undefined, a)) {
                                                if (this.preplacements > 2) break;
                                            }
                                        } else if (UTILS.getAngleDist(game.enemies.angle, n.angle) <= 0.75 && i.find(e => UTILS.getDistance(r, e) <= 135)) {
                                            this.checkPlace(player.items[2], n.angle, true, a);
                                            if (this.preplacements > 2) break;
                                        } else if (n.trap && this.checkPlace(player.items[4], n.angle, undefined, a)) {
                                            if (this.preplacements > 2) break;
                                        }
                                    } else if (n.trap && this.checkPlace(player.items[4], n.angle, undefined, a)) {
                                        if (this.preplacements > 2) break;
                                    }
                                } else if (n.trap && this.checkPlace(player.items[4], n.angle, undefined, a)) {
                                    if (this.preplacements > 2) break;
                                }
                            }
                            this.preplacements = 0;
                        }
                        this.preplacer = function () {
                            if (traps.inTrap) return;
                            if (!configs.autoPrePlace) return;

                            const weaponRange = items.weapons[player.weaponIndex].range + 70;
                            const rangeSquared = weaponRange ** 2;
                            const { x2: playerX, y2: playerY } = player;
                            const katanaOrPolearm = [4, 5].includes(player.weapons[0]);
                            const hasHammerSecondary = player.weapons[1] == 10;
                            let trappedEnemyTrap = null;
                            if (near) {
                                let _tet_dist = Infinity;
                                for (let _i = 0; _i < gameObjects.length; _i++) {
                                    const _t = gameObjects[_i];
                                    if (!_t.trap || !_t.active || !_t.isTeamObject(player)) continue;
                                    const _d = UTILS.getDist(_t, near, 0, 2);
                                    if (_d <= near.scale + _t.getScale() + 5 && _d < _tet_dist) {
                                        _tet_dist = _d; trappedEnemyTrap = _t;
                                    }
                                }
                            }
                            const forceSpikeOnTrappedEnemy = !!trappedEnemyTrap && katanaOrPolearm && hasHammerSecondary;
                            const trappedEnemyTrapAim = forceSpikeOnTrappedEnemy
                                ? UTILS.getDirect(trappedEnemyTrap, player, 0, 2)
                                : null;
                            const canForceSpikeOnTrap = (() => {
                                if (!trappedEnemyTrap || trappedEnemyTrapAim == null) return false;
                                const spikeItem = items.list[player.items[2]];
                                if (!spikeItem || typeof trappedEnemyTrap.getScale !== "function") return false;
                                const trapX = trappedEnemyTrap.x2 ?? trappedEnemyTrap.x;
                                const trapY = trappedEnemyTrap.y2 ?? trappedEnemyTrap.y;
                                if (typeof trapX !== "number" || typeof trapY !== "number") return false;
                                const spikeOffset = player.scale + spikeItem.scale + (spikeItem.placeOffset || 0);
                                const spikeX = player.x2 + Math.cos(trappedEnemyTrapAim) * spikeOffset;
                                const spikeY = player.y2 + Math.sin(trappedEnemyTrapAim) * spikeOffset;
                                const touchingDist = spikeItem.scale + trappedEnemyTrap.getScale() + 1;
                                return Math.hypot(spikeX - trapX, spikeY - trapY) <= touchingDist;
                            })();
                            const lowHealthGameObjects = gameObjects.filter(gameObject => {
                                const { x2, y2, buildHealth } = gameObject;
                                const distSquared = (x2 - playerX) ** 2 + (y2 - playerY) ** 2;
                                return near && buildHealth <= 272.58 && distSquared <= rangeSquared;
                            });

                            if (lowHealthGameObjects.length > 0) {
                                const { x2, y2 } = lowHealthGameObjects[0];
                                const objAim = UTILS.getDirect({ x2, y2 }, player, 0, 2);
                                const trapPlacementRadius = 70;

                                let enemyVelocity = Math.sqrt(near.xVel * near.xVel + near.yVel * near.yVel);
                                let enemyDirection = Math.atan2(near.yVel, near.xVel);
                                const spikeItem = items.list[player.items[2]];
                                const spikeOffset = spikeItem ? (player.scale + spikeItem.scale + (spikeItem.placeOffset || 0)) : 0;

                                let bestAngle = objAim;
                                let bestDistance = Infinity;
                                let bestScore = -Infinity;

                                for (let i = 0; i < 360; i += 30) {
                                    let simulatedAngle = UTILS.deg2rad(i);
                                    let distance =
                                        UTILS.getDist(near, player, 0, 2) +
                                        enemyVelocity * Math.sin(enemyDirection - simulatedAngle) +
                                        trapPlacementRadius;
                                    if (!isFinite(distance)) distance = UTILS.getDist(near, player, 0, 2) + trapPlacementRadius;

                                    let kbScore = 0;
                                    if (spikeItem && typeof kbSimulator !== "undefined" && kbSimulator.spikeKB) {
                                        const seat = {
                                            x: player.x2 + Math.cos(simulatedAngle) * spikeOffset,
                                            y: player.y2 + Math.sin(simulatedAngle) * spikeOffset,
                                            scale: 35
                                        };
                                        try {
                                            const sim = kbSimulator.spikeKB({
                                                x: near.x2,
                                                y: near.y2,
                                                scale: 35,
                                                tmpObj: near
                                            }, seat, true);
                                            const simData = (sim && sim.data) || [];
                                            const spikeDmg = simData
                                                .filter(e => e.id === "spiek")
                                                .reduce((sum, e) => sum + (e.dmg || 0), 0);
                                            const trapHits = simData.filter(e => e.id === "trap").length;
                                            const tpHits = simData.filter(e => e.id === "tp").length;
                                            const stopBonus = sim && sim.vel && sim.vel.x === 0 && sim.vel.y === 0 ? 1 : 0;
                                            kbScore = (spikeDmg * 4.4) + (trapHits * 30) - (tpHits * 24) + (stopBonus * 10);
                                        } catch (err) {
                                            logCaughtError("catch@17926", err);
                                            kbScore = 0;
                                        }
                                    }

                                    const angleAlign = Math.cos(UTILS.getAngleDist(simulatedAngle, objAim)) * 10;
                                    const totalScore = kbScore + angleAlign - (distance * 0.02);

                                    if (totalScore > bestScore) {
                                        bestScore = totalScore;
                                        bestDistance = distance;
                                        bestAngle = simulatedAngle;
                                    }
                                }

                                const trapPlacementTime = 5;
                                const timeToBreak = (lowHealthGameObjects[0].buildHealth - player.damage) / (player.damagePerShot - lowHealthGameObjects[0].absorb);
                                const safeEnemyVelocity = Math.max(0.05, enemyVelocity);
                                const enemyTimeToMoveOut = bestDistance / safeEnemyVelocity;
                                const hasPreplaceWindow = timeToBreak + trapPlacementTime <= enemyTimeToMoveOut;
                                if (hasPreplaceWindow) {
                                    if (canForceSpikeOnTrap) {
                                        if (checkPlace(2, trappedEnemyTrapAim, true)) {
                                            preplacing = true;
                                        }
                                    } else {
                                        const forceSpike = !!spikeItem && (instaC.hammer || bestScore >= 55);
                                        if (forceSpike) {
                                            if (checkPlace(2, bestAngle, true)) preplacing = true;
                                            for (let o = Math.PI / 12; o <= Math.PI / 6; o += Math.PI / 12) {
                                                if (checkPlace(2, bestAngle + o, true)) preplacing = true;
                                                if (checkPlace(2, bestAngle - o, true)) preplacing = true;
                                            }
                                        } else {
                                            if (checkPlace(4, bestAngle)) preplacing = true;
                                            for (let o = Math.PI / 12; o <= Math.PI / 4; o += Math.PI / 12) {
                                                if (checkPlace(4, bestAngle + o)) preplacing = true;
                                                if (checkPlace(4, bestAngle - o)) preplacing = true;
                                            }
                                        }
                                    }
                                }
                            }
                        };
                        function preplacer() {
                            let nearestObj = null;
                            if (secPacket >= 90 || traps.antiTrapped) return;
                            let range = items.weapons[player.weaponIndex].range + 150;
                            gameObjects.forEach(tmpObj => {
                                if (enemy.length) {
                                    let objDst = UTILS.getDist(tmpObj, player, 0, 2);
                                    let objAim = UTILS.getDirect(tmpObj, player, 0, 2);
                                    if (tmpObj.health < 272.58 && objDst <= 120) {
                                        nearestObj = tmpObj;
                                    }
                                }
                            });
                            let nearTrap = liztobj.filter(tmp => tmp.trap && tmp.active && tmp.isTeamObject(player) && cdf(tmp, player) <= tmp.getScale() + 5);
                            let spike = gameObjects.find(tmp => tmp.dmg && tmp.active && tmp.isTeamObject(player) && cdf(tmp, player) < 87 && !nearTrap.length);
                            if (nearestObj) {
                                let angle = UTILS.getDirect(nearestObj, player, 0, 2);
                                let FindTrap = null;
                                { let _s_dist = Infinity; for (let _si = 0; _si < gameObjects.length; _si++) { const _s = gameObjects[_si]; if (!_s.trap || !_s.active || !_s.isTeamObject(player)) continue; const _sd = UTILS.getDist(_s, near, 0, 2); if (_sd <= near.scale + _s.getScale() + 5 && _sd < _s_dist) { _s_dist = _sd; FindTrap = _s; } } }
                                game.tickBase(() => {
                                    let condition = near.dist2 <= range && tmpObj.health <= 272.58 && fgdo(tmpObj, player) <= range || (near && near.reloads[near.weaponIndex] <= config.tickRate * (window.pingTime >= 200 ? 2 : 1)) || player.reloads[player.weaponIndex] * 1000 <= config.tickRate * (window.pingTime >= 200 ? 2 : 1);
                                    _things.placeSpike = condition ? (instaC.canSpikeTick || instaC.hammer) ? 2 : (!retrappable) ? 2 : 4 : "none"
                                    if (condition) {
                                        if ((instaC.canSpikeTick || instaC.hammer) ? true : (!retrappable)) {
                                            place(2, angle, 0, true);
                                            preplacing = true;
                                        } else {
                                            place(4, angle);
                                            preplacing = true;
                                        }
                                    }
                                }, 1);
                            }
                        }
                        this.preplacer_ = preplacer;

                        // FOR ANTI INSTA:
                        this.addDamageThreat = function (tmpObj) {
                            let primary = {
                                weapon: this.primaryIndex,
                                variant: this.primaryVariant
                            };
                            primary.dmg = primary.weapon == undefined ? 45 : items.weapons[primary.weapon].dmg;
                            let secondary = {
                                weapon: this.secondaryIndex,
                                variant: this.secondaryVariant
                            };
                            secondary.dmg = secondary.weapon == undefined ? 50 : items.weapons[secondary.weapon].Pdmg;
                            let bull = 1.5;
                            let pV = primary.variant != undefined ? config.weaponVariants[primary.variant].val : 1.18;
                            let sV = secondary.variant != undefined ? [9, 12, 13, 15].includes(secondary.weapon) ? 1 : config.weaponVariants[secondary.variant].val : 1.18;
                            if (primary.weapon == undefined ? true : this.reloads[primary.weapon] == 0) {
                                this.damageThreat += primary.dmg * pV * bull;
                            }
                            if (secondary.weapon == undefined ? true : this.reloads[secondary.weapon] == 0) {
                                this.damageThreat += secondary.dmg * sV;
                            }
                            if (this.reloads[53] <= game.tickRate) {
                                this.damageThreat += 25;
                            }
                            this.damageThreat *= tmpObj.skinIndex == 6 ? 0.75 : 1;
                            if (!this.isTeam(tmpObj)) {
                                if (this.dist2 <= 300) {
                                    tmpObj.damageThreat += this.damageThreat;
                                }
                            }
                        };

                    }
                    setData(data) {
                        // capture timestamp
                        const now = Date.now();
                        this.updateDeltaMS = now - this.lastUpdateMS;
                        this.lastUpdateMS = now;
                        // store old position
                        this.oldXY = { x: this.x, y: this.y };
                        // compute elapsed ms since last update
                        this._deltaMs = now - this._lastPosTs;
                        // update timestamp
                        this._lastPosTs = now;

                        // now update x,y from incoming data
                        this.id = data[0];
                        this.sid = data[1];
                        this.name = data[2];
                        this.x = data[3];
                        this.y = data[4];
                        this.dir = data[5];
                        this.health = data[6];
                        this.maxHealth = data[7];
                        this.scale = data[8];
                        this.skinColor = data[9];
                    }
                    get estimatedV() {
                        if (this.updateDeltaMS <= 0) return { vx: 0, vy: 0 };
                        const dt = this.updateDeltaMS / 1000;
                        return {
                            vx: (this.x - this.oldPos.x) / dt,
                            vy: (this.y - this.oldPos.y) / dt
                        };
                    }
                    /**
 * Predictive aim for a moving target.
 *
 * @param {{ x2:number, y2:number, oldPos:{x2:number,y2:number}, t2:number, t1:number }} target
 *        target.x2,y2      â€“ current position
 *        target.oldPos.x2  â€“ previous x2
 *        target.oldPos.y2  â€“ previous y2
 *        target.t2         â€“ tick at which x2,y2 was written
 *        target.t1         â€“ tick at which oldPos was written
 * @param {number} projSpeed  â€“ projectile speed in world-units per game-tick
 * @returns {number}          â€“ direction (radians) you should fire at
 */
                    aimPredict(target, projSpeed) {
                        // 1ï¸âƒ£ compute how much time (in ticks) has passed between the two updates:
                        const dtTicks = (target.t2 - target.t1) || 1;

                        // 2ï¸âƒ£ estimate velocity in world-units per tick:
                        const vx = (target.x2 - target.oldPos.x2) / dtTicks;
                        const vy = (target.y2 - target.oldPos.y2) / dtTicks;

                        // 3ï¸âƒ£ distance from you to current target:
                        const dist = UTILS.getDist(target, _things.player, 0, 2);

                        // 4ï¸âƒ£ how long (in ticks) your projectile will be in the air:
                        const flightTime = dist / projSpeed;

                        // 5ï¸âƒ£ predict where the target will be:
                        const predictX = target.x2 + vx * flightTime;
                        const predictY = target.y2 + vy * flightTime;

                        // 6ï¸âƒ£ compute the direction to that future point:
                        return UTILS.getDirection({ x: predictX, y: predictY }, _things.player);
                    }
                    getVelocity() {
                        const dx = this.x - this.oldXY.x;
                        const dy = this.y - this.oldXY.y;
                        return {
                            vx: dx / this._deltaMs,
                            vy: dy / this._deltaMs,
                            dt: this._deltaMs
                        };
                    }
                    predictPosition(t) {
                        const { vx, vy } = this.getVelocity();
                        return {
                            x: this.x + vx * t,
                            y: this.y + vy * t
                        };
                    }
                }
