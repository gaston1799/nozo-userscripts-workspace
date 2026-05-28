class AI {
                    constructor(sid, objectManager, players, items, UTILS, config, scoreCallback, server) {
                        this.sid = sid;
                        this.isAI = true;
                        this.nameIndex = UTILS.randInt(0, config.cowNames.length - 1);

                        // INIT:
                        this.init = function (x, y, dir, index, data) {
                            this.x = x;
                            this.y = y;
                            this.startX = data.fixedSpawn ? x : null;
                            this.startY = data.fixedSpawn ? y : null;
                            this.xVel = 0;
                            this.yVel = 0;
                            this.zIndex = 0;
                            this.dir = dir;
                            this.dirPlus = 0;
                            this.index = index;
                            this.src = data.src;
                            if (data.name) this.name = data.name;
                            this.weightM = data.weightM;
                            this.speed = data.speed;
                            this.killScore = data.killScore;
                            this.turnSpeed = data.turnSpeed;
                            this.scale = data.scale;
                            this.maxHealth = data.health;
                            this.leapForce = data.leapForce;
                            this.health = this.maxHealth;
                            this.chargePlayer = data.chargePlayer;
                            this.viewRange = data.viewRange;
                            this.drop = data.drop;
                            this.dmg = data.dmg;
                            this.hostile = data.hostile;
                            this.dontRun = data.dontRun;
                            this.hitRange = data.hitRange;
                            this.hitDelay = data.hitDelay;
                            this.hitScare = data.hitScare;
                            this.spriteMlt = data.spriteMlt;
                            this.nameScale = data.nameScale;
                            this.colDmg = data.colDmg;
                            this.noTrap = data.noTrap;
                            this.spawnDelay = data.spawnDelay;
                            this.hitWait = 0;
                            this.waitCount = 1000;
                            this.moveCount = 0;
                            this.targetDir = 0;
                            this.active = true;
                            this.alive = true;
                            this.runFrom = null;
                            this.chargeTarget = null;
                            this.dmgOverTime = {};
                        };
                        this.updateLookAhead = function (player) {
                            // 2-tick
                            this.dist2 = UTILS.getDist(this, player, 2, 2);
                            this.aim2 = UTILS.getDirect(this, player, 2, 2);

                            // 3-tick
                            this.dist3 = UTILS.getDist(this, player, 3, 3);
                            this.aim3 = UTILS.getDirect(this, player, 3, 3);

                            // 4-tick
                            this.dist4 = UTILS.getDist(this, player, 4, 4);
                            this.aim4 = UTILS.getDirect(this, player, 4, 4);
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

                        // ANIMATION:
                        this.startAnim = function () {
                            this.animTime = this.animSpeed = 600;
                            this.targetAngle = Math.PI * 0.8;
                            tmpRatio = 0;
                            animIndex = 0;
                        };

                    };

                }
