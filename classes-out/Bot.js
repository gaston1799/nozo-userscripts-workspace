class Bot {
                    constructor(id, sid, hats, accessories) {
                        this.id = id;
                        this.sid = sid;
                        this.team = null;
                        this.skinIndex = 0;
                        this.tailIndex = 0;
                        this.hitTime = 0;
                        this.iconIndex = 0;
                        this.enemy = [];
                        this.near = [];
                        this.dist2 = 0;
                        this.aim2 = 0;
                        this.tick = 0;
                        this.itemCounts = {};
                        this.latestSkin = 0;
                        this.latestTail = 0;
                        this.points = 0;
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
                        this.spawn = function (moofoll) {
                            this.upgraded = 0;
                            this.enemy = [];
                            this.near = [];
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
                            this.autoGather = 0;
                            this.animTime = 0;
                            this.animSpeed = 0;
                            this.mouseState = 0;
                            this.buildIndex = -1;
                            this.weaponIndex = 0;
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
                            this.zIndex = 0;
                            this.xVel = 0;
                            this.yVel = 0;
                            this.slowMult = 1;
                            this.dir = 0;
                            this.nDir = 0;
                            this.dirPlus = 0;
                            this.targetDir = 0;
                            this.targetAngle = 0;
                            this.maxHealth = 100;
                            this.health = this.maxHealth;
                            this.oldHealth = this.maxHealth;
                            this.scale = config.playerScale;
                            this.speed = config.playerSpeed;
                            this.resetMoveDir();
                            this.resetResources(moofoll);
                            this.items = [0, 3, 6, 10];
                            this.weapons = [0];
                            this.shootCount = 0;
                            this.weaponXP = [];
                            this.reloads = {};
                            this.whyDie = "";
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

                        // SET DATA:
                        this.setData = function (data) {
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


                        // SHAME SYSTEM:
                        this.judgeShame = function () {
                            if (this.oldHealth < this.health) {
                                if (this.hitTime) {
                                    let timeSinceHit = this.tick - this.hitTime;
                                    this.hitTime = 0;
                                    if (timeSinceHit < 2) {
                                        this.shameCount++;
                                    } else {
                                        this.shameCount = Math.max(0, this.shameCount - 2);
                                    }
                                }
                            } else if (this.oldHealth > this.health) {
                                this.hitTime = this.tick;
                            }
                        };

                        this.closeSockets = function (websc) {
                            websc.close();
                        };

                        this.whyDieChat = function (websc, whydie) {
                            websc.sendWS("H", "fixed by " + whydie + "XD");
                        };
                    }
                }
