class ProjectileManager {
                    constructor(Projectile, projectiles, players, ais, objectManager, items, config, UTILS, server) {
                        this.addProjectile = function (x, y, dir, range, speed, indx, owner, ignoreObj, layer, inWindow) {
                            let tmpData = items.projectiles[indx];
                            let tmpProj;
                            for (let i = 0; i < projectiles.length; ++i) {
                                if (!projectiles[i].active) {
                                    tmpProj = projectiles[i];
                                    break;
                                }
                            }
                            if (!tmpProj) {
                                tmpProj = new Projectile(players, ais, objectManager, items, config, UTILS, server);
                                tmpProj.sid = projectiles.length;
                                projectiles.push(tmpProj);
                            }
                            tmpProj.init(indx, x, y, dir, speed, tmpData.dmg, range, tmpData.scale, owner);
                            tmpProj.ignoreObj = ignoreObj;
                            tmpProj.layer = layer || tmpData.layer;
                            tmpProj.inWindow = inWindow;
                            tmpProj.src = tmpData.src;

                            let d = checkProj(tmpProj, player);
                            if (d && _things.player.weapons[1] == 11) {
                                setTimeout(() => {
                                    _things.aimAt({ x, y });
                                    selectWeapon(player.weapons[1]); // equip shield

                                    const now = Date.now();
                                    if ((now - timeSinceLastBlock) > 3000) {
                                        selectWeapon(player.weapons[1]);
                                    }

                                    timeSinceLastBlock = now;

                                    // ðŸ›¡ï¸ Schedule return to main weapon
                                    if (switchBackTimeout) clearTimeout(switchBackTimeout);
                                    switchBackTimeout = setTimeout(() => {
                                        // Make sure no new projectile came in
                                        if (Date.now() - timeSinceLastBlock >= 300) {
                                            chat('Get parried')
                                            selectWeapon(player.weapons[0]); // return to sword or smth
                                            switchBackTimeout = null;
                                        }
                                    }, 300 + d.time); // waits till block then 300ms buffer

                                }, d.time);
                            }

                            return tmpProj;
                        };
                    }
                }
