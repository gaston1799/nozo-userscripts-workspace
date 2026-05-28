class Objectmanager {
                    constructor(GameObject, gameObjects, UTILS, config, players, server) {
                        let mathFloor = Math.floor,
                            mathABS = Math.abs,
                            mathCOS = Math.cos,
                            mathSIN = Math.sin,
                            mathPOW = Math.pow,
                            mathSQRT = Math.sqrt;

                        this.ignoreAdd = false;
                        this.hitObj = [];

                        // DISABLE OBJ:
                        this.disableObj = function (obj) {
                            obj.active = false;
                            if (config.anotherVisual) {
                            } else {
                                obj.alive = false;
                            }
                        };
                        this.canBeBroken = function (object) {
                            if (!inGame || !object || !enemy.length) return;
                            let playerWeapon = player.weapons[autoBreak.useHammer(object) ? 1 : 0];
                            let playerVariant = player[(playerWeapon < 9 ? "prima" : "seconda") + "ryVariant"];
                            let playerVariantDmg = playerVariant != undefined ? config.weaponVariants[playerVariant].val : 1;

                            let enemyWeapon = (near.secondaryIndex != undefined && near.primaryIndex != undefined) ? (near.secondaryIndex == 10 && ((object.health > items.weapons[near.weapons[0]].dmg) || near.primaryIndex == 5)) ? near.secondaryIndex : near.primaryIndex : 10
                            let enemyVariant = (near.secondaryIndex != undefined && near.primaryIndex != undefined) ? near[(enemyWeapon < 9 ? "prima" : "seconda") + "ryVariant"] : 3;
                            let enemyVariantDmg = config.weaponVariants[enemyVariant].val;

                            let playerDamage = items.weapons[playerWeapon].dmg;
                            let enemyDamage = items.weapons[enemyWeapon].dmg;

                            let tank = 3.3

                            let damageThreat = 0

                            if (near.reloads[enemyWeapon] == 0 && this.canHit(near, object, enemyWeapon, 24)) {
                                damageThreat += enemyDamage * tank * enemyVariantDmg * (items.weapons[playerWeapon].sDmg || 1);
                            }

                            if (player.reloads[playerWeapon] == 0 && (clicks.right || (autoBreak.active && (autoBreak.priority[0].includes(object) || autoBreak.priority[1].includes(object) || autoBreak.priority[2].includes(object))))) {
                                damageThreat += playerDamage * tank * playerVariantDmg * (items.weapons[playerWeapon].sDmg || 1);
                            }

                            if (object.health <= damageThreat) {
                                return true
                            }
                            return false
                        };

                        this.hitsToBreak = function (object, who) {
                            if (!inGame || !object || !enemy.length || !who) return;

                            // Determine player weapon and its variant damage
                            let weapon = autoBreak.useHammer(object, who) ? who.weapons[1] : who.weapons[0];
                            let variant = who[(weapon < 9 ? "prima" : "seconda") + "ryVariant"];
                            let variantDmg = variant != undefined ? config.weaponVariants[variant].val : 1.18;
                            let damage = items.weapons[weapon].dmg;

                            let tank = 3.3;

                            // Calculate hits required for player
                            let effectiveDamage = damage * tank * variantDmg * (items.weapons[weapon].sDmg || 1);
                            return Math.ceil(object.health / effectiveDamage);
                        };

                        this.canHit = function (player, object, weapon, moreSafe = 0) {
                            return UTILS.getDist(player, object, 2, 0) <= items.weapons[weapon].range + object.scale + moreSafe;
                        };
                        // ADD NEW:
                        let tmpObj;
                        this.add = function (sid, x, y, dir, s, type, data, setSID, owner) {
                            tmpObj = findObjectBySid(sid);
                            if (!tmpObj) {
                                tmpObj = gameObjects.find((tmp) => !tmp.active);
                                if (!tmpObj) {
                                    tmpObj = new GameObject(sid);
                                    gameObjects.push(tmpObj);
                                }
                            }
                            if (setSID) {
                                tmpObj.sid = sid;
                            }
                            tmpObj.init(x, y, dir, s, type, data, owner);
                        };

                        // DISABLE BY SID:
                        this.disableBySid = function (sid) {
                            let find = findObjectBySid(sid);
                            if (find) {
                                this.disableObj(find);
                            }
                        };

                        // REMOVE ALL FROM PLAYER:
                        this.removeAllItems = function (sid, server) {
                            gameObjects.filter((tmp) => tmp.active && tmp.owner && tmp.owner.sid == sid).forEach((tmp) => this.disableObj(tmp));
                        };

                        // CHECK IF PLACABLE:
                        this.checkItemLocation = function (x, y, s, sM, indx, ignoreWater, placer) {
                            let cantPlace = gameObjects.find((tmp) => tmp.active && UTILS.getDistance(x, y, tmp.x, tmp.y) < s + (tmp.blocker ? tmp.blocker : tmp.getScale(sM, tmp.isItem)));
                            if (cantPlace) return false;
                            if (!ignoreWater && indx != 18 && y >= config.mapScale / 2 - config.riverWidth / 2 && y <= config.mapScale / 2 + config.riverWidth / 2) return false;
                            return true;
                        };
                        this.customCheckItemLocation = (x, y, s, sM, indx, ignoreWater, placer, ignoreId, gameObjects, UTILS, config) => {
                            let cantPlace = gameObjects.find(
                                tmp =>
                                    tmp.active &&
                                    tmp.x !== ignoreId.x &&
                                    tmp.y !== ignoreId.y &&
                                    tmp.id !== ignoreId.id &&
                                    UTILS.getDistance(x, y, tmp.x, tmp.y) < s + (tmp.blocker ? tmp.blocker : tmp.getScale(sM, tmp.isItem))
                            );

                            if (cantPlace) return false;
                            if (!ignoreWater && indx != 18 && y >= config.mapScale / 2 - config.riverWidth / 2 && y <= config.mapScale / 2 + config.riverWidth / 2) return false;

                            return true;
                        };
                    }
                }
