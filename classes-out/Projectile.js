class Projectile {
                    constructor(players, ais, objectManager, items, config, UTILS, server) {

                        // INIT:
                        this.init = function (indx, x, y, dir, spd, dmg, rng, scl, owner) {
                            this.active = true;
                            this.tickActive = true;
                            this.indx = indx;
                            this.x = x;
                            this.y = y;
                            this.x2 = x;
                            this.y2 = y;
                            this.dir = dir;
                            this.skipMov = true;
                            this.speed = spd;
                            this.dmg = dmg;
                            this.scale = scl;
                            this.range = rng;
                            this.r2 = rng;
                            this.owner = owner;
                        };

                        // UPDATE:
                        this.update = function (delta) {
                            if (this.active) {
                                let tmpSpeed = this.speed * delta;
                                if (!this.skipMov) {
                                    this.x += tmpSpeed * Math.cos(this.dir);
                                    this.y += tmpSpeed * Math.sin(this.dir);
                                    this.range -= tmpSpeed;
                                    if (this.range <= 0) {
                                        this.x += this.range * Math.cos(this.dir);
                                        this.y += this.range * Math.sin(this.dir);
                                        tmpSpeed = 1;
                                        this.range = 0;
                                        this.active = false;
                                    }
                                } else {
                                    this.skipMov = false;
                                }
                            }
                        };
                        this.tickUpdate = function (delta) {
                            if (this.tickActive) {
                                let tmpSpeed = this.speed * delta;
                                if (!this.skipMov) {
                                    this.x2 += tmpSpeed * Math.cos(this.dir);
                                    this.y2 += tmpSpeed * Math.sin(this.dir);
                                    this.r2 -= tmpSpeed;
                                    if (this.r2 <= 0) {
                                        this.x2 += this.r2 * Math.cos(this.dir);
                                        this.y2 += this.r2 * Math.sin(this.dir);
                                        tmpSpeed = 1;
                                        this.r2 = 0;
                                        this.tickActive = false;
                                    }
                                } else {
                                    this.skipMov = false;
                                }
                            }
                        };
                    }
                }
