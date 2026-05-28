class Instakill {
                    constructor() {
                        this.wait = false;
                        this.can = false;
                        this.isTrue = false;
                        this.nobull = false;
                        this.ticking = false;
                        this.canSpikeTick = false;
                        this.startTick = false;
                        this.readyTick = false;
                        this.canCounter = false;
                        this.revTick = false;
                        this.syncHit = true;
                        this.age1insta = false;
                        this.hammerCounterType = function () {
                            this.isTrue = true;
                            my.autoAim = true;
                            if (near.dist2 <= 70 && configs.secondaryOnCounter) {
                                buyEquip(19, 1);
                                selectWeapon(player.weapons[1]);
                                if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                                    buyEquip(53, 0)
                                    buyEquip(18, 1);
                                } else {
                                    buyEquip(7, 0)
                                    buyEquip(18, 1);
                                }
                                sendAutoGather();
                                game.tickBase(() => {
                                    buyEquip(18, 1);
                                    buyEquip(7, 0)
                                    selectWeapon(player.weapons[0])
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1);
                                }, 1);
                            } else {
                                buyEquip(18, 1);
                                selectWeapon(player.weapons[0])
                                buyEquip(7, 0)
                                sendAutoGather()
                                game.tickBase(() => {
                                    if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                                        buyEquip(53, 0)
                                    }
                                    game.tickBase(() => {
                                        sendAutoGather()
                                        this.isTrue = false
                                        my.autoAim = false
                                    }, 1)
                                }, 1)
                            }
                        };
                        function getBaseDamages() {
                            const pW = _things.items.weapons[_things.player.primaryIndex];
                            const sW = _things.items.weapons[_things.player.secondaryIndex];
                            const pVar = config.weaponVariants[_things.player.primaryVariant].val;
                            const sVar = config.weaponVariants[_things.player.secondaryVariant].val;

                            const pBase = pW.dmg * pVar * (pW.sDmg || 1);
                            const sBase = sW.dmg * sVar * (sW.sDmg || 1); // important: sW.sDmg
                            return { pBase, sBase };
                        }

                        /**
* Primary is ALWAYS no-tank (one swing max).
* Secondary can swing multiple times.
* sMult = 1 (no tank) or 3.3 (tank)
*/
                        function planTickPrimaryNoTank(hp, sMult = 1) {
                            const { pBase, sBase } = getBaseDamages();
                            const pDmg = pBase;                   // primary no tank
                            const sDmg = sBase * sMult;           // secondary w/ chosen mult
                            const EPS = 1e-6;                     // avoid float jank

                            // Primary alone: must be STRICTLY greater
                            if (hp < pDmg) {
                                return { can: true, secondarySwings: 0, primarySwings: 1, totalSwings: 1, afterS: hp, overkill: pDmg - hp, sequence: "P" };
                            }
                            if (sDmg <= 0) {
                                return { can: false, secondarySwings: Infinity, primarySwings: 0, totalSwings: Infinity, afterS: hp, overkill: 0, sequence: "â€”" };
                            }

                            // need N such that hp - N*sDmg < pDmg  â‡’  N > (hp - pDmg)/sDmg
                            const N = Math.max(0, Math.ceil((hp - pDmg + EPS) / sDmg));  // +EPS ensures equality does NOT pass
                            const afterS = hp - N * sDmg;

                            if (afterS < pDmg) {
                                return {
                                    can: true,
                                    secondarySwings: N,
                                    primarySwings: 1,
                                    totalSwings: N + 1,
                                    afterS,
                                    overkill: pDmg - Math.max(0, afterS),
                                    sequence: N > 0 ? `Sx${N}+P` : "P"
                                };
                            }

                            return { can: false, secondarySwings: Infinity, primarySwings: 0, totalSwings: Infinity, afterS, overkill: 0, sequence: "â€”" };
                        }


                        // Convenience wrappers:
                        const TANK = 3.3;
                        function planNoTankSecondary(hp) { return planTickPrimaryNoTank(hp, 1); }
                        function planTankSecondary(hp) { return planTickPrimaryNoTank(hp, TANK); }
                        // expects: planNoTankSecondary(hp), planTankSecondary(hp)
                        // notes:
                        //   - primary swings at most once (no tank)
                        //   - secondary may swing once (reload rule). If >1 required => abort.
                        //   - bypass: run a test swing sequence even if no target/too far

                        this.hammerInsta = function ({ bypass = false, hp_ = 50 } = {}) {
                            const closestEnemy = _things.enemy.enemy;
                            if (!bypass && !closestEnemy) return "no insta: no enemy";

                            const sharedInfo = _things.info && _things.info.hammer ? _things.info.hammer : null;
                            let trap = (sharedInfo && sharedInfo.trap) || _things.nearTrap || _things.trapFound;
                            if (!trap && !bypass && closestEnemy) {
                                trap = gameObjects.filter(e => e.trap && e.active && e.isTeamObject(player) && UTILS.getDist(e, closestEnemy, 0, 2) <= (closestEnemy.scale + e.getScale() + 5)).sort((a, b) => UTILS.getDist(a, closestEnemy, 0, 2) - UTILS.getDist(b, closestEnemy, 0, 2))[0];
                                if (!trap) return "no : no trap";
                                _things.nearTrap = trap;
                            }

                            if (!bypass && trap) {
                                const isCloseByScan = sharedInfo && sharedInfo.trap === trap
                                    ? !!sharedInfo.inCloseRange
                                    : null;
                                if (isCloseByScan === false) return "no : too far";
                                if (isCloseByScan === null) {
                                    const trapScale = (typeof trap.getScale === "function" ? trap.getScale() : trap.scale) || 0;
                                    const closeD = trapScale + ((player.scale ?? 35) / 2);
                                    if (UTILS.getDist(player, trap, 2, 0) >= closeD) return "no : too far";
                                }
                            }

                            const secReady = sharedInfo ? !!sharedInfo.secondaryReady : player.reloads[player.weapons[1]] <= pingTime;
                            const priReady = sharedInfo ? !!sharedInfo.primaryReady : player.reloads[player.weapons[0]] <= pingTime;
                            if (!secReady || !priReady) return "abort: reload";

                            const hp = bypass ? hp_ : Number(trap?.health ?? hp_);
                            const { sBase } = getBaseDamages();
                            const canOneShotTrapNoTank = Number.isFinite(hp) && hp <= sBase;
                            const dirToTrapEnemyIsIn = sharedInfo && Number.isFinite(sharedInfo.dirToTrapEnemyIsIn)
                                ? sharedInfo.dirToTrapEnemyIsIn
                                : (Number.isFinite(closestEnemy?.aim2)
                                    ? closestEnemy.aim2
                                    : (closestEnemy ? UTILS.getDirect(closestEnemy, player, 0, 2) : player.dir || 0));

                            this.hammer = true;
                            this.isTicking = true;
                            this.wait = true;
                            this.isTrue = true;
                            my.autoAim = true;

                            const finish = () => {
                                sendAutoGather();
                                this.hammer = false;
                                this.isTrue = false;
                                my.autoAim = false;
                                this.isTicking = false;
                                this.wait = false;
                            };

                            if (canOneShotTrapNoTank) {
                                // Tick 1: 53 with secondary
                                buyEquip(53, 0);
                                selectWeapon(player.weapons[1]);
                                sendAutoGather();
                                // Tick 2: bull with primary and spike place
                                game.tickBase(() => {
                                    buyEquip(7, 0);
                                    selectWeapon(player.weapons[0]);
                                    checkPlace(1, dirToTrapEnemyIsIn);
                                    game.tickBase(() => {
                                        finish();
                                    }, 1);
                                }, 1);
                                return "insta: 53->7";
                            }

                            // Not one-shot without tank: 40 -> 7 -> 53
                            buyEquip(40, 0);
                            selectWeapon(player.weapons[1]);
                            sendAutoGather();
                            game.tickBase(() => {
                                buyEquip(7, 0);
                                selectWeapon(player.weapons[0]);
                                checkPlace(1, dirToTrapEnemyIsIn);
                                game.tickBase(() => {
                                    buyEquip(53, 0);
                                    finish();
                                }, 1);
                            }, 1);
                            return "insta: 40->7->53";
                        };

                        this.hammerInsta2 = function (rev = true, bypass) {
                            rev = true
                            let closestEnemy = _things.enemy.enemy
                            const sharedInfo = _things.info && _things.info.hammer ? _things.info.hammer : null;
                            if (!closestEnemy) return "no insta3"
                            //maxdmg useless
                            let maxdmg = (_things.items.weapons[_things.player.primaryIndex].dmg *
                                config.weaponVariants[_things.player.primaryVariant].val * 1.5) + ((_things.items.weapons[_things.player.secondaryIndex].dmg *
                                    config.weaponVariants[_things.player.secondaryVariant].val * 1.5)) + 25
                            let canSpike = false
                            if (!_things.nearTrap && sharedInfo && sharedInfo.trap) {
                                _things.nearTrap = sharedInfo.trap;
                            }
                            if (!_things.nearTrap) {
                                let nearTrap = gameObjects.filter(e => e.trap && e.active && e.isTeamObject(player) && UTILS.getDist(e, closestEnemy, 0, 2) <= (closestEnemy.scale + e.getScale() + 5)).sort(function (a, b) {
                                    return UTILS.getDist(a, closestEnemy, 0, 2) - UTILS.getDist(b, closestEnemy, 0, 2);
                                })[0];
                                if (!nearTrap) return "noInsta2"
                                _things.nearTrap = nearTrap
                            }
                            canSpike = canplace(2, player.dir, _things.nearTrap)
                            let closeD = 120
                            let isClose = (sharedInfo && sharedInfo.trap === _things.nearTrap)
                                ? !!sharedInfo.inCloseRange
                                : (UTILS.getDist(player, _things.nearTrap, 2, 0) < closeD)
                            let canTest = _things.player.skins[40] ? planTankSecondary(_things.nearTrap.health) : planNoTankSecondary(_things.nearTrap.health)
                            let order = rev ? [1, 0] : [0, 1]
                            if (!isClose) {
                                //sendChat('tooFar? dist:'+UTILS.getDist(player,_things.nearTrap,2,0).toString() +' Fix it now!')
                            }
                            _things.nearTrap = null;
                            if (!isClose) return "no Insta1"
                            let hasTank = _things.player.skins[40]
                            if (canTest.secondarySwings == 0) {

                                //no need just bull with primary
                                sendChat('test willPlace?:' + canSpike)
                                buyEquip(7, 0)
                                selectWeapon(player.weapons[0])
                                sendAutoGather(); //toggles autofire of weapons currently on
                                game.tickBase(() => {
                                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                                    sendAutoGather(); //toggles autofire of weapons new off
                                    this.hammer = false;
                                    this.isTrue = false;
                                    my.autoAim = false;
                                    this.isTicking = false;
                                }, 1);
                            } else if (canTest.secondarySwings == 1) {
                                sendChat('test willPlace?:' + canSpike)
                                buyEquip(hasTank ? 40 : 6, 0);
                                selectWeapon(player.weapons[1])
                                sendAutoGather(); //toggles autofire of weapons currently on
                                game.tickBase(() => {
                                    //swing primary logic
                                    buyEquip(7, 0)
                                    selectWeapon(player.weapons[0])
                                    //sendAutoGather(); //toggles autofire of weapons new off
                                    game.tickBase(() => {
                                        buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                                        sendAutoGather(); //toggles autofire of weapons new off
                                        this.hammer = false;
                                        this.isTrue = false;
                                        my.autoAim = false;
                                        this.isTicking = false;
                                    }, 1);
                                }, 1)
                            }
                        }
                        //forge
                        this.moveUp = function (ticks = 3) {
                            let dir_ = _things.enemy.enemy ? _things.getDirection(_things.player, _things.enemy.enemy) : _things.player.dir
                            _things.packet('9', dir_, 1)
                            _things.game.tickBase(() => _things.packet('9', null, 0), ticks)
                        }
                        this.changeType1 = function (type) {
                            this.wait = false;
                            this.isTrue = true;
                            my.autoAim = true;
                            let instaLog = [type];
                            game.tickBase(() => {
                                importantDirs.normalMove = _things.getDirection(_things.player, _things.enemy.enemy)
                                game.tickBase(() => {
                                    stop()
                                }, 3)
                            }, 1)
                            if (type == "rev") {
                                this.moveUp(3)
                                _things.buyEquip(53, 0)
                                _things.selectWeapon(_things.player.weapons[1])
                                _things.sendAutoGather()
                                setTimeout(() => {
                                    _things.buyEquip(7, 0)
                                    _things.selectWeapon(_things.player.weapons[0])
                                }, pingTime)
                                setTimeout(() => {
                                    _things.sendAutoGather()
                                    _things.my.autoAim = !true
                                    this.isTrue = !true
                                }, 100 + pingTime * 1.1)
                                return true
                            }
                            else if (type == "nobull") {
                                this.moveUp(3)
                                selectWeapon(player.weapons[0]);
                                buyEquip(7, 0);
                                sendAutoGather();
                                setTimeout(() => {
                                    selectWeapon(player.weapons[1]);
                                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                                    setTimeout(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 255);
                                }, 105);
                                return true
                            }
                            else if (type == "normal") {
                                this.moveUp(3)
                                _things.buyEquip(7, 0)
                                _things.selectWeapon(_things.player.weapons[0])
                                _things.sendAutoGather()
                                setTimeout(() => {
                                    _things.buyEquip(53, 0)
                                    _things.selectWeapon(_things.player.weapons[1])
                                }, pingTime)
                                setTimeout(() => {
                                    _things.sendAutoGather()
                                    _things.my.autoAim = !true
                                    _things.instaC.isTrue = !true
                                }, 80 + pingTime * 1.1)
                                return true
                                selectWeapon(player.weapons[0]);
                                buyEquip(7, 0);
                                sendAutoGather();
                                setTimeout(() => {
                                    selectWeapon(player.weapons[1]);
                                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                                    setTimeout(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 170);
                                }, 80);
                                return true
                            }
                            else {
                                return false
                                this.isTrue = false;
                                my.autoAim = false;
                            }
                        };
                        this.changeType = function (type) {
                            let c = _random([0, 1])
                            if (c) return console.log('Used bonus', chat(type + 'new'), this.changeType1(type))
                            chat(type)
                            this.wait = false;
                            this.isTrue = true;
                            my.autoAim = true;
                            buyEquip(0, 1);
                            let instaLog = [type];
                            let backupNobull = near.backupNobull;
                            near.backupNobull = false;
                            game.tickBase(() => {
                                instaLog.push(player.skinIndex);
                                game.tickBase(() => {
                                    if (near.skinIndex == 22 && getEl("backupNobull").checked) {
                                        near.backupNobull = true;
                                    }
                                    instaLog.push(player.skinIndex);
                                }, 1);
                            }, 1);
                            if (type == "rev") {
                                this.moveUp(3)
                                selectWeapon(player.weapons[1]);
                                buyEquip(53, 0);
                                sendAutoGather();
                                game.tickBase(() => {
                                    selectWeapon(player.weapons[0]);
                                    buyEquip(7, 0);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1);
                                }, 1);
                            }
                            else if (type == "nobull") {
                                this.moveUp(3)
                                selectWeapon(player.weapons[0]);
                                buyEquip(7, 0);
                                sendAutoGather();
                                game.tickBase(() => {
                                    selectWeapon(player.weapons[1]);
                                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1);
                                }, 1);
                            }
                            else if (type == "Normal" || type == "normal") {
                                this.moveUp(3)
                                selectWeapon(player.weapons[0]);
                                buyEquip(7, 0);
                                sendAutoGather();
                                game.tickBase(() => {
                                    selectWeapon(player.weapons[1]);
                                    buyEquip(player.reloads[53] == 0 ? 53 : 6, 0);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1);
                                }, 1);
                            }
                            else if (type == "oneTickType") {
                                this.oneTickType()
                            }
                            else if (type == "threeOneTickType") {
                                this.threeOneTickType()
                            }
                            else {
                                chat(`type:${type}-nf`)
                                setTimeout(() => {
                                    this.isTrue = false;
                                    my.autoAim = false;
                                }, 50);
                            }
                        };
                        this.spikeTickType = function () {
                            clearSpikeTickReserve();
                            function _0xd5c3(_0x9f4b0, _0x509c61) { const _0x45e2dc = _0x45e2(); return _0xd5c3 = function (_0xd5c3c8, _0x53c283) { _0xd5c3c8 = _0xd5c3c8 - 0x1ed; let _0x450188 = _0x45e2dc[_0xd5c3c8]; return _0x450188; }, _0xd5c3(_0x9f4b0, _0x509c61); } const _0x528eb4 = _0xd5c3; (function (_0x3d78b5, _0x358bfc) { const _0x27ad26 = _0xd5c3, _0x515b73 = _0x3d78b5(); while (!![]) { try { const _0x42303f = -parseInt(_0x27ad26(0x1f3)) / 0x1 + -parseInt(_0x27ad26(0x1f0)) / 0x2 * (parseInt(_0x27ad26(0x1ed)) / 0x3) + parseInt(_0x27ad26(0x1f8)) / 0x4 * (-parseInt(_0x27ad26(0x1f4)) / 0x5) + -parseInt(_0x27ad26(0x1ef)) / 0x6 + parseInt(_0x27ad26(0x1fb)) / 0x7 * (parseInt(_0x27ad26(0x1f1)) / 0x8) + -parseInt(_0x27ad26(0x1fa)) / 0x9 + parseInt(_0x27ad26(0x1ee)) / 0xa; if (_0x42303f === _0x358bfc) break; else _0x515b73['push'](_0x515b73['shift']()); } catch (_0x53c403) { _0x515b73['push'](_0x515b73['shift']()); } } }(_0x45e2, 0xf2ba5)); let perfectAngle = UTILS[_0x528eb4(0x1f6)](tmpObj, player, 0x0, 0x2), placeCountOMG = 0x4; this[_0x528eb4(0x1f9)] = !![], my[_0x528eb4(0x1f5)] = !![], io['send']('6', ''), selectWeapon(player[_0x528eb4(0x1f7)][0x0]), buyEquip(0x7, 0x0), buyEquip(0x15, 0x1), sendAutoGather(), game[_0x528eb4(0x1f2)](() => { const _0x4f8708 = _0x528eb4; selectWeapon(player[_0x4f8708(0x1f7)][0x0]), buyEquip(0x35, 0x0), buyEquip(0x15, 0x1), game[_0x4f8708(0x1f2)](() => { const _0x50ee54 = _0x4f8708; sendAutoGather(), this[_0x50ee54(0x1f9)] = ![], my[_0x50ee54(0x1f5)] = ![]; }, 0x1); }, 0x1); function _0x45e2() { const _0x59100f = ['3859896Uvkzwj', '24TAsWeY', 'tickBase', '1952558fxxdgz', '10BJDBZO', 'autoAim', 'getDirect', 'weapons', '945764eUGeSx', 'isTrue', '8776332wptcow', '3970526VrFpZo', '3IMjAlU', '53543190wAItZh', '4387344wMKhty']; _0x45e2 = function () { return _0x59100f; }; return _0x45e2(); }
                            return;
                            /*this.isTrue = true;
                            my.autoAim = true;
                            selectWeapon(player.weapons[0]);
                            buyEquip(7, 0);
                            buyEquip(21, 1);
                            sendAutoGather();
                            game.tickBase(() => {
                                if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                                    selectWeapon(player.weapons[0]);
                                    buyEquip(53, 0);
                                    buyEquip(21, 1);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1);
                                } else {
                                    sendAutoGather();
                                    this.isTrue = false;
                                    my.autoAim = false;
                                }
                            }, 1);*/
                        }

                        this.counterType = function () { //now do we really need boost tick is the question ;3
                            this.isTrue = true;
                            my.autoAim = true;
                            selectWeapon(player.weapons[0]);
                            buyEquip(7, 0);
                            buyEquip(18, 1);
                            sendAutoGather();
                            game.tickBase(() => {
                                if (player.reloads[53] == 0) {
                                    selectWeapon(player.weapons[0]);
                                    buyEquip(53, 0);
                                    buyEquip(21, 1);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1);
                                } else {
                                    sendAutoGather();
                                    this.isTrue = false;
                                    my.autoAim = false; // my godly ass antibull ;3
                                }
                            }, 1);
                        };
                        this.spikeTickType2 = function () {
                            this.isTrue = true;
                            my.autoAim = true;
                            selectWeapon(player.weapons[0]);
                            buyEquip(7, 0);
                            buyEquip(21, 1);
                            sendAutoGather();
                            game.tickBase(() => {
                                if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                                    selectWeapon(player.weapons[0]);
                                    buyEquip(53, 0);
                                    buyEquip(21, 1);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1);
                                } else {
                                    sendAutoGather();
                                    this.isTrue = false;
                                    my.autoAim = false;
                                }
                            }, 1);
                        };
                        this.syncTry = function () {
                            io.send("6", "Pew");
                            if (player.weapons[1] == 15) {
                                this.isTrue = true;
                                my.autoAim = true;
                                game.tickBase(() => {
                                    instaC.isTrue = true;
                                    selectWeapon(player.weapons[1]);
                                    buyEquip(53, 0);
                                    buyEquip(0, 1);
                                    sendAutoGather();
                                    game.tickBase(() => {
                                        my.autoAim = false;
                                        instaC.isTrue = false;
                                        this.isTrue = false;
                                        sendAutoGather();
                                    }, 1);
                                }, 1);
                            }
                        };
                        this.counterType2 = function () {
                            this.isTrue = true;
                            my.autoAim = true;
                            selectWeapon(player.weapons[0]);
                            buyEquip(7, 0);
                            buyEquip(21, 1);
                            sendAutoGather();
                            game.tickBase(() => {
                                if (player.reloads[53] == 0 && getEl("turretCombat").checked) {
                                    selectWeapon(player.weapons[0]);
                                    buyEquip(53, 0);
                                    buyEquip(21, 1);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1);
                                } else {
                                    sendAutoGather();
                                    this.isTrue = false;
                                    my.autoAim = false;
                                }
                            }, 1);
                        };
                        this.antiCounterType = function () {
                            my.autoAim = true;
                            this.isTrue = true;
                            inantiantibull = true;
                            selectWeapon(player.weapons[0]);
                            buyEquip(6, 0);
                            buyEquip(21, 1);
                            io.send("D", near.aim2);
                            sendAutoGather();
                            game.tickBase(() => {
                                buyEquip(player.reloads[53] == 0 ? player.skins[53] ? 53 : 6 : 6, 0);
                                buyEquip(21, 1);
                                game.tickBase(() => {
                                    sendAutoGather();
                                    this.isTrue = false;
                                    my.autoAim = false;
                                    inantiantibull = false;
                                }, 1);
                            }, 1)
                        };
                        this.rangeType = function (type) {
                            this.isTrue = true;
                            my.autoAim = true;
                            if (type == "ageInsta") {
                                my.ageInsta = false;
                                if (player.items[5] == 18) {
                                    place(5, near.aim2);
                                }
                                packet("9", undefined, 1);
                                buyEquip(22, 0);
                                buyEquip(21, 1);
                                game.tickBase(() => {
                                    selectWeapon(player.weapons[1]);
                                    buyEquip(53, 0);
                                    buyEquip(21, 1);
                                    sendAutoGather();
                                    game.tickBase(() => {
                                        sendUpgrade(12);
                                        selectWeapon(player.weapons[1]);
                                        buyEquip(53, 0);
                                        buyEquip(21, 1);
                                        game.tickBase(() => {
                                            sendUpgrade(15);
                                            selectWeapon(player.weapons[1]);
                                            buyEquip(53, 0);
                                            buyEquip(21, 1);
                                            game.tickBase(() => {
                                                sendAutoGather();
                                                this.isTrue = false;
                                                my.autoAim = false;
                                            }, 1);
                                        }, 1);
                                    }, 1);
                                }, 1);
                            }
                            else {
                                selectWeapon(player.weapons[1]);
                                if (player.reloads[53] == 0 && near.dist2 <= 700 && near.skinIndex != 22) {
                                    buyEquip(53, 0);
                                } else {
                                    buyEquip(useMark ? 1 : 20, 0);
                                }
                                buyEquip(11, 1);
                                sendAutoGather();
                                game.tickBase(() => {
                                    sendAutoGather();
                                    this.isTrue = false;
                                    my.autoAim = false;
                                    setTimeout(() => {
                                        debug()
                                    }, 50)
                                }, 1);
                            }
                        };
                        this.oneTickType = function () {
                            io.send("6", "P_OT Start")
                            this.isTrue = true;
                            my.autoAim = true;
                            selectWeapon(player.weapons[1]);
                            buyEquip(53, 0);
                            buyEquip(11, 1);
                            packet("9", near.aim2, 1);
                            if (player.weapons[1] == 15) {
                                my.revAim = true;
                                sendAutoGather();
                            }
                            game.tickBase(() => {
                                const trap1 = gameObjects
                                    .filter((e) => e.trap && e.active)
                                    .sort((a, b) => UTILS.getDist(a, near, 0, 2) - UTILS.getDist(b, near, 0, 2))
                                    .find((trap) => {
                                        const trapDist = Math.hypot(trap.y - near.y2, trap.x - near.x2);
                                        return (
                                            trap !== player &&
                                            (player.sid === trap.owner.sid || findAllianceBySid(trap.owner.sid)) &&
                                            trapDist <= 30
                                        );
                                    });
                                if ([6, 22].includes(near.skinIndex) && trap1) io.send('6', 'p_OT [2/3]');
                                my.revAim = false;
                                selectWeapon(player.weapons[0]);
                                buyEquip(7, 0);
                                buyEquip(19, 1);
                                packet("9", near.aim2, 1);
                                if (player.weapons[1] != 15) {
                                    sendAutoGather();
                                }
                                game.tickBase(() => {
                                    sendAutoGather();
                                    this.isTrue = false;
                                    my.autoAim = false;
                                    packet("9", undefined, 1);
                                }, 1);
                            }, 1);
                        };
                        this.threeOneTickType = function () {
                            this.isTrue = true;
                            my.autoAim = true;
                            selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                            biomeGear();
                            buyEquip(11, 1);
                            packet("9", near.aim2, 1);
                            game.tickBase(() => {
                                selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                buyEquip(53, 0);
                                buyEquip(11, 1);
                                packet("9", near.aim2, 1);
                                game.tickBase(() => {
                                    selectWeapon(player.weapons[0]);
                                    buyEquip(7, 0);
                                    buyEquip(19, 1);
                                    sendAutoGather();
                                    packet("9", near.aim2, 1);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                        packet("9", undefined, 1);
                                    }, 1);
                                }, 1);
                            }, 1);
                        };
                        this.kmTickType = function () {
                            this.isTrue = true;
                            my.autoAim = true;
                            my.revAim = true;
                            selectWeapon(player.weapons[1]);
                            buyEquip(53, 0);
                            buyEquip(11, 1);
                            sendAutoGather();
                            packet("9", near.aim2, 1);
                            game.tickBase(() => {
                                my.revAim = false;
                                selectWeapon(player.weapons[0]);
                                buyEquip(7, 0);
                                buyEquip(19, 1);
                                packet("9", near.aim2, 1);
                                game.tickBase(() => {
                                    sendAutoGather();
                                    this.isTrue = false;
                                    my.autoAim = false;
                                    packet("9", undefined, 1);
                                }, 1);
                            }, 1);
                        };
                        this.boostTickType = function () {
                            /*this.isTrue = true;
my.autoAim = true;
selectWeapon(player.weapons[0]);
buyEquip(53, 0);
buyEquip(11, 1);
packet("33", near.aim2);
game.tickBase(() => {
place(4, near.aim2);
selectWeapon(player.weapons[1]);
biomeGear();
buyEquip(11, 1);
sendAutoGather();
packet("33", near.aim2);
game.tickBase(() => {
    selectWeapon(player.weapons[0]);
    buyEquip(7, 0);
    buyEquip(19, 1);
    packet("33", near.aim2);
    game.tickBase(() => {
        sendAutoGather();
        this.isTrue = false;
        my.autoAim = false;
        packet("33", undefined);
    }, 1);
}, 1);
}, 1);*/
                            this.isTrue = true;
                            my.autoAim = true;
                            biomeGear();
                            buyEquip(11, 1);
                            packet("9", near.aim2, 1);
                            game.tickBase(() => {
                                if (player.weapons[1] == 15) {
                                    my.revAim = true;
                                }
                                selectWeapon(player.weapons[[9, 12, 13, 15].includes(player.weapons[1]) ? 1 : 0]);
                                buyEquip(53, 0);
                                buyEquip(11, 1);
                                if ([9, 12, 13, 15].includes(player.weapons[1])) {
                                    sendAutoGather();
                                }
                                packet("9", near.aim2, 1);
                                place(4, near.aim2);
                                game.tickBase(() => {
                                    my.revAim = false;
                                    selectWeapon(player.weapons[0]);
                                    buyEquip(7, 0);
                                    buyEquip(19, 1);
                                    if (![9, 12, 13, 15].includes(player.weapons[1])) {
                                        sendAutoGather();
                                    }
                                    packet("9", near.aim2, 1);
                                    game.tickBase(() => {
                                        sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                        packet("9", undefined, 1);
                                    }, 1);
                                }, 1);
                            }, 1);
                        };
                        this.gotoGoal = function (goto, OT) {
                            let slowDists = (weeeee) => weeeee * config.playerScale;
                            let goal = {
                                a: goto - OT,
                                b: goto + OT,
                                c: goto - slowDists(1),
                                d: goto + slowDists(1),
                                e: goto - slowDists(2),
                                f: goto + slowDists(2),
                                g: goto - slowDists(4),
                                h: goto + slowDists(4)
                            };
                            let bQ = function (wwww, awwww) {
                                if (player.y2 >= config.mapScale / 2 - config.riverWidth / 2 && player.y2 <= config.mapScale / 2 + config.riverWidth / 2 && awwww == 0) {
                                    buyEquip(31, 0);
                                } else {
                                    buyEquip(wwww, awwww);
                                }
                            }
                            if (enemy.length) {
                                let dst = near.dist2;
                                this.ticking = true;
                                if (dst >= goal.a && dst <= goal.b) {
                                    bQ(22, 0);
                                    bQ(11, 1);
                                    if (player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0] || player.buildIndex > -1) {
                                        selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                    }
                                    return {
                                        dir: undefined,
                                        action: 1
                                    };
                                } else {
                                    if (dst < goal.a) {
                                        if (dst >= goal.g) {
                                            if (dst >= goal.e) {
                                                if (dst >= goal.c) {
                                                    bQ(40, 0);
                                                    bQ(10, 1);
                                                    if (configs.slowOT) {
                                                        player.buildIndex != player.items[1] && selectToBuild(player.items[1]);
                                                    } else {
                                                        if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                                            selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                                        }
                                                    }
                                                } else {
                                                    bQ(22, 0);
                                                    bQ(19, 1);
                                                    if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                                        selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                                    }
                                                }
                                            } else {
                                                bQ(6, 0);
                                                bQ(12, 1);
                                                if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                                    selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                                }
                                            }
                                        } else {
                                            biomeGear();
                                            bQ(11, 1);
                                            if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                                selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                            }
                                        }
                                        return {
                                            dir: near.aim2 + Math.PI,
                                            action: 0
                                        };
                                    } else if (dst > goal.b) {
                                        if (dst <= goal.h) {
                                            if (dst <= goal.f) {
                                                if (dst <= goal.d) {
                                                    bQ(40, 0);
                                                    bQ(9, 1);
                                                    if (configs.slowOT) {
                                                        player.buildIndex != player.items[1] && selectToBuild(player.items[1]);
                                                    } else {
                                                        if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                                            selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                                        }
                                                    }
                                                } else {
                                                    bQ(22, 0);
                                                    bQ(19, 1);
                                                    if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                                        selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                                    }
                                                }
                                            } else {
                                                bQ(6, 0);
                                                bQ(12, 1);
                                                if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                                    selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                                }
                                            }
                                        } else {
                                            biomeGear();
                                            bQ(11, 1);
                                            if ((player.weaponIndex != player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]) || player.buildIndex > -1) {
                                                selectWeapon(player.weapons[[10, 14].includes(player.weapons[1]) ? 1 : 0]);
                                            }
                                        }
                                        return {
                                            dir: near.aim2,
                                            action: 0
                                        };
                                    }
                                    return {
                                        dir: undefined,
                                        action: 0
                                    };
                                }
                            } else {
                                this.ticking = false;
                                return {
                                    dir: undefined,
                                    action: 0
                                };
                            }
                        }
                        this.spammer = function () {
                            if (antiBullType.value != "noab") return;
                            this.isTrue = true;
                            my.autoAim = true;
                            selectWeapon(player.weapons[0]);
                            buyEquip(7, 0);
                            buyEquip(19, 1)
                            sendAutoGather();
                            game.tickBase(() => {
                                sendAutoGather();
                                this.isTrue = false;
                                my.autoAim = false;
                            }, 1);
                        };
                        this.bowMovement = function () {
                            let moveMent = this.gotoGoal(685, 3);
                            if (moveMent.action) {
                                if (player.reloads[53] == 0 && !this.isTrue) {
                                    this.rangeType("ageInsta");
                                } else {
                                    packet("9", moveMent.dir, 1);
                                }
                            } else {
                                packet("9", moveMent.dir, 1);
                            }
                        }
                        this.testMovement = function () {
                            let move1 = this.gotoGoal(1440, 3);
                            if (move1.action) {
                                io.send("6", "test complete")
                            } else {
                                packet("9", Number.MAX_VALUE)
                            }
                        }
                        this.tickMovement = function () {
                            const trap1 = gameObjects
                                .filter((e) => e.trap && e.active)
                                .sort((a, b) => UTILS.getDist(a, near, 0, 2) - UTILS.getDist(b, near, 0, 2))
                                .find((trap) => {
                                    const trapDist = Math.hypot(trap.y - near.y2, trap.x - near.x2);
                                    return (
                                        trap !== player &&
                                        (player.sid === trap.owner.sid || findAllianceBySid(trap.owner.sid)) &&
                                        trapDist <= 50
                                    );
                                });
                            let moveMent = this.gotoGoal(([10, 14].includes(player.weapons[1]) && player.y2 > config.snowBiomeTop) ? 240 : player.weapons[1] == 15 ? 250 : player.y2 <= config.snowBiomeTop ? [10, 14].includes(player.weapons[1]) ? 270 : 265 : 275, 3);
                            if (moveMent.action) {
                                if ((![6, 22].includes(near.skinIndex) || [6, 22].includes(near.skinIndex) && trap1) && player.reloads[53] == 0 && !this.isTrue) {
                                    ([10, 14].includes(player.weapons[1]) && player.y2 > config.snowBiomeTop) || (player.weapons[1] == 15) ? this.oneTickType() : this.threeOneTickType();
                                    if ([6, 22].includes(near.skinIndex) && trap1) io.send('6', 'p_OT [1/3]');
                                } else {
                                    packet("9", moveMent.dir, 1);
                                }
                            } else {
                                packet("9", moveMent.dir, 1);
                            }
                        }
                        this.kmTickMovement = function () {
                            let moveMent = this.gotoGoal(240, 3);
                            if (moveMent.action) {
                                if (near.skinIndex != 22 && player.reloads[53] == 0 && !this.isTrue && ((game.tick - near.poisonTick) % config.serverUpdateRate == 8)) {
                                    this.kmTickType();
                                } else {
                                    packet("9", moveMent.dir, 1);
                                }
                            } else {
                                packet("9", moveMent.dir, 1);
                            }
                        }
                        this.boostTickMovement = function () {
                            let dist = player.weapons[1] == 9 ? 365 : player.weapons[1] == 12 ? 380 : player.weapons[1] == 13 ? 390 : player.weapons[1] == 15 ? 365 : 370;
                            let actionDist = player.weapons[1] == 9 ? 2 : player.weapons[1] == 12 ? 1.5 : player.weapons[1] == 13 ? 1.5 : player.weapons[1] == 15 ? 2 : 3;
                            let moveMent = this.gotoGoal(dist, actionDist);
                            if (moveMent.action) {
                                if (player.reloads[53] == 0 && !this.isTrue) {
                                    this.boostTickType();
                                } else {
                                    packet("9", moveMent.dir, 1);
                                }
                            } else {
                                packet("9", moveMent.dir, 1);
                            }
                        }

                        this.perfCheck = function (pl, nr) {
                            if (nr.weaponIndex == 11 && UTILS.getAngleDist(nr.aim2 + Math.PI, nr.d2) <= config.shieldAngle) return false;
                            if (![9, 12, 13, 15].includes(player.weapons[1])) return true;
                            let pjs = {
                                x: nr.x2 + (70 * Math.cos(nr.aim2 + Math.PI)),
                                y: nr.y2 + (70 * Math.sin(nr.aim2 + Math.PI))
                            };
                            if (UTILS.lineInRect(pl.x2 - pl.scale, pl.y2 - pl.scale, pl.x2 + pl.scale, pl.y2 + pl.scale, pjs.x, pjs.y, pjs.x, pjs.y)) {
                                return true;
                            }
                            let finds = ais.filter(tmp => tmp.visible).find((tmp) => {
                                if (UTILS.lineInRect(tmp.x2 - tmp.scale, tmp.y2 - tmp.scale, tmp.x2 + tmp.scale, tmp.y2 + tmp.scale, pjs.x, pjs.y, pjs.x, pjs.y)) {
                                    return true;
                                }
                            });
                            if (finds) return false;
                            finds = gameObjects.filter(tmp => tmp.active).find((tmp) => {
                                let tmpScale = tmp.getScale();
                                if (!tmp.ignoreCollision && UTILS.lineInRect(tmp.x - tmpScale, tmp.y - tmpScale, tmp.x + tmpScale, tmp.y + tmpScale, pjs.x, pjs.y, pjs.x, pjs.y)) {
                                    return true;
                                }
                            });
                            if (finds) return false;
                            return true;
                        }
                        this.assistInsta = function (gobj, _40 = player.skins[40]) {
                            if (_things.player.weapons[1] != 10) return 'bozo'
                            let mBdmg = _things.items.weapons[10].dmg * config.weaponVariants[_things.player.secondaryVariant].val * (_things.items.weapons[10].sDmg) * (_40 ? 3.3 : 1)
                            if (isnerf || gobj.health > mBdmg) return 'bozo\'js'
                            chat('Get assisted')
                            this.wait = false;
                            this.isTrue = true;
                            my.autoAim = true;
                            buyEquip(40, 0);
                            selectWeapon(_things.player.weapons[1]);
                            sendAutoGather();
                            game.tickBase(() => {
                                //this.wait = false;
                                _things.buyEquip(7, 0);
                                _things.selectWeapon(_things.player.weapons[0]);
                                checkPlace(2, near.aim2)
                                game.tickBase(() => {
                                    game.tickBase(() => {
                                        _things.sendAutoGather();
                                        this.isTrue = false;
                                        my.autoAim = false;
                                    }, 1)
                                }, 1)
                            }, 1)
                        }
                        function predictAim(enemy, projectileSpeed) {
                            const { x, y, moveDir, speed = 0, xVel = 0, yVel = 0 } = enemy;
                            const px = _things.player.x;
                            const py = _things.player.y;

                            // Direction fallback
                            let vx, vy;
                            if (typeof moveDir === "number") {
                                vx = Math.cos(moveDir) * speed;
                                vy = Math.sin(moveDir) * speed;
                            } else {
                                vx = xVel;
                                vy = yVel;
                            }

                            // Relative position
                            const relX = x - px;
                            const relY = y - py;

                            // Quadratic coefficients
                            const a = vx * vx + vy * vy - projectileSpeed * projectileSpeed;
                            const b = 2 * (relX * vx + relY * vy);
                            const c = relX * relX + relY * relY;

                            const disc = b * b - 4 * a * c;
                            let t;

                            if (disc >= 0 && Math.abs(a) > 1e-6) {
                                const sqrtDisc = Math.sqrt(disc);
                                const t1 = (-b - sqrtDisc) / (2 * a);
                                const t2 = (-b + sqrtDisc) / (2 * a);
                                t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
                            } else {
                                // No valid intercept time, fall back to direct aim
                                t = Math.hypot(relX, relY) / projectileSpeed;
                            }

                            const aimX = x + vx * t;
                            const aimY = y + vy * t;

                            return { x: aimX, y: aimY };
                        }

                        /*setTimeout(()=>{
            //_things.my.autoAim=!true
            _things.instaC.isTrue=!true
        },primarySwingTimeout+(secondaryTimeout/2))
        _things.my.autoAim=true
        _things.instaC.isTrue=true
        _things.buyEquip(53,0)
        _things.selectWeapon(_things.player.weapons[1])
        _things.sendAutoGather()
        setTimeout(()=>{
            _things.buyEquip(7,0)
            _things.selectWeapon(_things.player.weapons[0])
        },pingTime)
        setTimeout(()=>{
            _things.buyEquip(21,0)
        },100)
        setTimeout(()=>{
            _things.sendAutoGather()
            _things.my.autoAim=!true
            _things.instaC.isTrue=!true
        },100+pingTime*1.1)*/
                        this.rangeFrame = function (swingBull, m, added) {
                            if (isnerf) return 'bozo'
                            this.wait = false;
                            this.isTrue = true;
                            this.bow = true
                            my.autoAim = true
                            const o = (function (player = _things.player, target = _things.enemy.enemy) {
                                const sx = player.x, sy = player.y;
                                const dx = target.x - sx, dy = target.y - sy;
                                const dist = Math.hypot(dx, dy);

                                // find sec weapon & proj, if none treat as missing
                                const secWep = weapons.find(w => w.id === player.secondaryIndex);
                                const hasRange = secWep && secWep.projectile != null && _things.items.projectiles[secWep.projectile];
                                const projR = hasRange
                                    ? _things.items.projectiles[secWep.projectile]
                                    : null;
                                const projT = _things.items.projectiles[1]; // turret proj

                                // time to hit (ticks)
                                const ticksR = hasRange ? dist / projR.speed : pingTime;
                                let ticksT;
                                if (swingBull) {
                                    // collision happens when centers are (player.scale + turretRadius) apart
                                    const collisionDist = player.scale + 20;
                                    const travelDist = Math.max(dist - collisionDist, 0);
                                    ticksT = travelDist / projT.speed;
                                } else {
                                    ticksT = dist / projT.speed;
                                }
                                const faster = swingBull ? "range" : ticksR < ticksT ? 'range' : 'turret';
                                const timeout = Math.abs(ticksR - ticksT)// * (m||1)+(added||0); // adjust multiplier if needed

                                return { ticksR, ticksT, faster, timeout, hasRange, pSpeed: hasRange ? projR.speed : 0 };
                            })();
                            const canSwing = swingBull || o.faster === 'range';
                            //shoot turret first
                            let xA = 3
                            function gxA() {
                                let _ = ['x', 'y'].map(e => e + xA.toString())
                                let [x, y] = _.map(xy => _things.enemy.enemy[xy])
                                return { x, y }
                            }
                            console.log(o, canSwing)
                            if (o.faster === 'range' || swingBull) {
                                console.log(1, 'Turret')
                                _things.buyEquip(53, 0);
                            } else {
                                console.log(1, 'Ranged')
                                //_things.aimAt(_things.lead);
                                _things.selectWeapon(_things.player.weapons[1]);
                                _things.sendAutoGather();
                            }
                            setTimeout(() => {
                                if (swingBull && canSwing) {
                                    if (swingBull) {
                                        console.log(2, 'Swing')
                                        // 3ï¸âƒ£ Now equip hat-7 (primary) and swing
                                        _things.buyEquip(7, 0);
                                        _things.selectWeapon(_things.player.weapons[0])
                                        _things.sendAutoGather(); dw
                                    }
                                }
                                else if (o.faster === 'range') {
                                    console.log(2, 'ranged')
                                    //_things.aimAt(_things.lead);
                                    _things.selectWeapon(_things.player.weapons[1]);
                                    _things.sendAutoGather();
                                } else {
                                    console.log(2, 'turret')
                                    _things.buyEquip(53, 0);
                                }
                            }, o.timeout)

                            setTimeout(() => {
                                console.log(3, 'off')
                                _things.sendAutoGather();
                                my.autoAim = false;
                                this.isTrue = false;
                            }, o.timeout + 300)
                            return;
                        }
                        this.rangeFrameWorking = function (swingBull) {
                            if (isnerf) return 'bozo'
                            this.wait = false;
                            this.isTrue = true;
                            my.autoAim = true;
                            let o = (function (player = _things.player, targetPos = _things.enemy.enemy) {
                                const sx = player.x, sy = player.y;
                                const dx = targetPos.x - sx, dy = targetPos.y - sy;
                                const dist = Math.hypot(dx, dy);
                                const wep = weapons.find(w => w.id === player.secondaryIndex);
                                const projR = _things.items.projectiles[wep.projectile];
                                const projT = _things.items.projectiles[1];

                                const ticksR = dist / projR.speed;
                                const ticksT = dist / projT.speed;
                                const faster = ticksR < ticksT ? 'range' : 'turret';
                                let timout = Math.abs(ticksR - ticksT)
                                return { ticksR, ticksT, faster, timout }
                            })()
                            let canSwing = false
                            //shoot turret first
                            if (o.faster === 'range') {
                                canSwing = true
                                _things.buyEquip(53, 0);
                            } else {
                                _things.selectWeapon(_things.player.weapons[1]);
                                _things.sendAutoGather();
                            }
                            setTimeout(() => {
                                if (swingBull && canSwing) {
                                    if (swingBull) {
                                        // 3ï¸âƒ£ Now equip hat-7 (primary) and swing
                                        _things.buyEquip(7, 0);
                                        _things.selectWeapon(_things.player.weapons[0])
                                    }
                                }
                                else if (o.faster === 'range') {
                                    _things.selectWeapon(_things.player.weapons[1]);
                                    _things.sendAutoGather();
                                } else {
                                    _things.buyEquip(53, 0);
                                }
                            }, o.timout)

                            setTimeout(() => {
                                _things.sendAutoGather();
                                _things.autoAim = 0;
                                this.isTrue = false;
                            }, o.timout + 300)
                            return;
                        }
                        this.rangeFrame2 = function (swingBull) {
                            if (isnerf) return 'bozo';
                            this.wait = false;
                            this.isTrue = true;
                            my.autoAim = true;

                            // calc timings, handle missing ranged secondary
                            const o = (function (player = _things.player, target = _things.enemy.enemy) {
                                const sx = player.x, sy = player.y;
                                const dx = target.x - sx, dy = target.y - sy;
                                const dist = Math.hypot(dx, dy);

                                // find sec weapon & proj, if none treat as missing
                                const secWep = weapons.find(w => w.id === player.secondaryIndex);
                                const hasRange = secWep && secWep.projectile != null && _things.items.projectiles[secWep.projectile];
                                const projR = hasRange
                                    ? _things.items.projectiles[secWep.projectile]
                                    : null;
                                const projT = _things.items.projectiles[1]; // turret proj

                                // time to hit (ticks)
                                const ticksR = hasRange ? dist / projR.speed : Infinity;
                                const ticksT = dist / projT.speed;
                                const faster = ticksR < ticksT ? 'range' : 'turret';
                                const timeout = Math.abs(ticksR - ticksT) * 100; // adjust multiplier if needed

                                return { ticksR, ticksT, faster, timeout, hasRange };
                            })();
                            // allow hat swing if we wanna swing bull or if range is faster
                            const canSwing = swingBull || o.faster === 'range';

                            // fire the slower one first to sync hits
                            if (o.faster === 'range' && o.hasRange) {
                                _things.buyEquip(53, 0); // turret first
                            } else {
                                _things.selectWeapon(_things.player.weapons[1]); // range (or turret if no range)
                                _things.sendAutoGather();
                            }

                            // after sync delay
                            setTimeout(() => {
                                if (swingBull && canSwing) {
                                    // swing hat-7
                                    _things.buyEquip(7, 0);
                                    _things.selectWeapon(_things.player.weapons[0]);
                                    _things.sendAutoGather();
                                } else if (o.faster === 'range') {
                                    // if we chose range-first path
                                    _things.selectWeapon(_things.player.weapons[1]);
                                    _things.sendAutoGather();
                                } else {
                                    // fallback turret equip/shoot
                                    _things.buyEquip(53, 0);
                                    //_things.sendAutoGather();
                                }
                            }, o.timeout);

                            // cleanup autoAim
                            setTimeout(() => {
                                _things.autoAim = 0;
                                this.isTrue = false;
                            }, o.timeout + 300);

                            return;
                        };

                    }
                }
