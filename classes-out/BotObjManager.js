class BotObjManager {
                    constructor(botObj, fOS) {
                        // DISABLE OBJ:
                        this.disableObj = function (obj) {
                            obj.active = false;
                            if (config.anotherVisual) {
                            } else {
                                obj.alive = false;
                            }
                        };

                        // ADD NEW:
                        let tmpObj;
                        this.add = function (sid, x, y, dir, s, type, data, setSID, owner) {
                            tmpObj = fOS(sid);
                            if (!tmpObj) {
                                tmpObj = botObj.find((tmp) => !tmp.active);
                                if (!tmpObj) {
                                    tmpObj = new BotObject(sid);
                                    botObj.push(tmpObj);
                                }
                            }
                            if (setSID) {
                                tmpObj.sid = sid;
                            }
                            tmpObj.init(x, y, dir, s, type, data, owner);
                        };

                        // DISABLE BY SID:
                        this.disableBySid = function (sid) {
                            let find = fOS(sid);
                            if (find) {
                                this.disableObj(find);
                            }
                        };

                        // REMOVE ALL FROM PLAYER:
                        this.removeAllItems = function (sid, server) {
                            gameObjects.filter((tmp) => tmp.active && tmp.owner && tmp.owner.sid == sid).forEach((tmp) => this.disableObj(tmp));
                        };

                        // CHECK IF PLACABLE:
                        // 1) Extend checkItemLocation to skip a given object
                        this.checkItemLocation = function (x, y, s, sM, indx, ignoreWater, placer, ignoreObj) {
                            // find any blocker that isnâ€™t our ignored object
                            const cantPlace = gameObjects.filter(e => ignoreObj ? e.sid != ignoreObj.sid : true).find(tmp =>
                                tmp.active &&
                                //tmp !== ignoreObj &&
                                UTILS.getDistance(x, y, tmp.x, tmp.y) < s + (tmp.blocker || tmp.getScale(sM, tmp.isItem))
                            );
                            if (cantPlace) return false;
                            if (!ignoreWater && indx !== 18 &&
                                y >= config.mapScale / 2 - config.riverWidth / 2 &&
                                y <= config.mapScale / 2 + config.riverWidth / 2) {
                                return false;
                            }
                            return true;
                        };
                        this.checkItemLocationWorking = function (x, y, s, sM, indx, ignoreWater, placer) {
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
