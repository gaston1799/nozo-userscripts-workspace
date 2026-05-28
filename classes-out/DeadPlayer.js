class DeadPlayer {
                    constructor(x, y, dir, buildIndex, weaponIndex, weaponVariant, skinColor, scale, name) {
                        this.x = x;
                        this.y = y;
                        this.lastDir = dir;
                        this.dir = dir + Math.PI;
                        this.buildIndex = buildIndex;
                        this.weaponIndex = weaponIndex;
                        this.weaponVariant = weaponVariant;
                        this.skinColor = skinColor;
                        this.scale = scale;
                        this.visScale = 0;
                        this.name = name;
                        this.alpha = 1;
                        this.active = true;
                        this.animate = function (delta) {
                            let d2 = UTILS.getAngleDist(this.lastDir, this.dir);
                            if (d2 > 0.01) {
                                this.dir += d2 / 20;
                            } else {
                                this.dir = this.lastDir;
                            }
                            if (this.visScale < this.scale) {
                                this.visScale += delta / (this.scale / 2);
                                if (this.visScale >= this.scale) {
                                    this.visScale = this.scale;
                                }
                            }
                            this.alpha -= delta / 30000;
                            if (this.alpha <= 0) {
                                this.alpha = 0;
                                this.active = false;
                            }
                        }
                    }
                }
